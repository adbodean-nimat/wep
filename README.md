# WEP · Entregas para choferes

PWA mobile-first de WhatsApp Entregas Programadas. Permite consultar las vueltas del día, ordenar paradas, iniciar reparto, solicitar el aviso al cliente, registrar entregas/no entregas y finalizar la vuelta. Toda operación consume la API Express WEP. No accede a bases de datos, GESTYA ni WhatsApp directamente.

## Estado e integración con el backend

Los contratos se verificaron **leyendo, sin modificar**, `C:\Users\abodean\restapi-nodejs\server\src\modules\wep`:

- `wep.routes.js`: rutas, envoltorios `ok`, mensajes y códigos de error.
- `wep-pwa.repository.js`: `groupPwaViajes`, `mapPwaEntregaDetalle`, inicio, orden y cierre.
- Repositorios de aviso, confirmación y no entrega: respuestas de las operaciones.
- `wep.validator.js` y `wep-non-delivery.constants.js`: motivos y máximo de 500 caracteres.

La PWA autentica un vehículo lógico mediante PIN y recibe un token WEP. El cliente HTTP agrega ese token como Bearer a las rutas protegidas. No se modificó el backend.

El puerto HTTP leído en `api.js` es **8099** y el HTTPS es **8090**. El ejemplo usa HTTP local para desarrollo; usar HTTPS válido para instalar en Android.

### Sincronización de los viajes

`GET /pwa/viajes` lee las tablas operativas de la PWA; no importa automáticamente las entregas programadas del ERP. En el backend inspeccionado tampoco hay un scheduler que invoque la sincronización. Antes de probar una fecha nueva, el backend debe ejecutar:

```http
POST /api/wep/sync/entregas-programadas
Authorization: Bearer <token>
Content-Type: application/json

{
  "fechaDesde": "YYYY-MM-DD",
  "fechaHasta": "YYYY-MM-DD"
}
```

La PWA no llama este endpoint porque sincronizar datos maestros es una responsabilidad administrativa del backend. Si la fuente tiene entregas pero `/pwa/viajes` responde `totalViajes: 0`, la pantalla mostrará el estado vacío hasta que se ejecute la sincronización. Para detectar altas del ERP sin intervención manual, el backend debe ejecutar esta sincronización periódicamente o al confirmar nuevas entregas.

Mientras el chofer mira una vuelta programada, la PWA vuelve a consultar `/pwa/viajes` cada 60 segundos con la pantalla visible y al recuperar el foco. Si aparecen órdenes nuevas en la respuesta, actualiza las paradas y exige que el chofer las revise antes de habilitar “Iniciar vuelta”. También consulta la API al tocar ese botón y de nuevo antes de enviar el inicio. Estas comprobaciones detectan cambios ya importados; una garantía completa frente a cambios simultáneos requiere que el backend valide la versión o los IDs de las entregas en la misma transacción que inicia la vuelta.

El 14/09/2026 se comprobó el flujo real: la fuente devolvía 47 filas y la sincronización creó 3 vehículos, 6 viajes y 47 entregas, sin filas omitidas. Luego la PWA mostró las 6 vueltas en `http://localhost:5173`; también cargó una vuelta de 11 paradas y su detalle, sin ejecutar inicio, aviso, entrega, cambio de orden ni finalización.

## Stack

- Vue 3, Composition API, `<script setup lang="ts">`, TypeScript estricto.
- Vite y Vue Router con historial HTML5 y vistas cargadas por ruta.
- Tailwind CSS 4, componentes shadcn/vue (Button, Dialog y Sonner), Reka UI.
- Lucide mediante `@lucide/vue`, paquete actual utilizado por shadcn/vue.
- `vite-plugin-pwa`, Workbox y manifest instalable.
- `fetch` nativo. Sin Axios, Pinia ni librerías de fechas.
- Vitest para pruebas. Los mocks de QA no forman parte de la aplicación distribuida.

## Instalación y ejecución

Node.js 22.12 o superior; probado con Node 24.14.

```powershell
cd C:\Users\abodean\pwa-choferes-wep
npm install
Copy-Item .env.example .env
npm run dev
```

Abrir la URL que muestra Vite, normalmente `http://localhost:5173/chofer/login`.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` ejecuta TypeScript antes de producir `dist/`. `preview` sirve la compilación en el puerto 4173 por defecto. No es un servidor de producción.

En esta máquina `npm.ps1` puede resolver un npm inexistente en AppData. Si sucede, utilizar `& 'C:\Program Files\nodejs\npm.cmd'` en lugar de `npm`. No se modificó la instalación global.

## Variable de entorno

```dotenv
VITE_API_BASE_URL=http://localhost:8099/api/wep
```

`VITE_API_BASE_URL` incluye `/api/wep` y no `/pwa`. Puede ser una URL absoluta o `/api/wep` si un reverse proxy sirve frontend y API bajo el mismo origen. No hay URL backend dentro de los componentes.

El token WEP se obtiene en el login y se conserva en `localStorage`; nunca se incorpora al build, se muestra ni se imprime. El PIN sólo se usa para el request de login y no se almacena.

En un teléfono, `localhost` es el teléfono: usar el host accesible del backend. El backend debe permitir el origen de la PWA mediante CORS. Una PWA HTTPS también necesita una API HTTPS válida para evitar contenido mixto.

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/chofer` | Redirige a login o viajes según la sesión |
| `/chofer/login` | Selección de camión e ingreso de PIN |
| `/chofer/viajes` | Vueltas del día local |
| `/chofer/viajes/:id?fecha=YYYY-MM-DD` | Entregas de una vuelta |
| `/chofer/entregas/:id` | Detalle accesible mediante enlace directo |

`/` redirige a `/chofer`. Las rutas de viajes y entregas requieren una sesión validada con `/auth/me`; las rutas desconocidas muestran una página de regreso. Las cards llevan la fecha en la URL para conservarla al recargar. Como no existe GET de viaje por ID, el detalle consulta los viajes de esa fecha y selecciona el ID. Un enlace sin fecha utiliza el día local actual.

**Hosting:** configurar fallback de las rutas del frontend a `index.html` (por ejemplo, Nginx `try_files $uri $uri/ /index.html;`). Si se comparte origen, `/api/` debe resolverse al backend antes de ese fallback. Vite dev y preview ya soportan la recarga de rutas. El service worker excluye `/api` del fallback.

## Flujo del chofer

1. Ver las vueltas del día y entrar en “Ver entregas”.
2. Si está programada, reordenar con **Subir/Bajar** y guardar el orden completo. También se puede descartar. Salir con un orden pendiente pide confirmación.
3. Confirmar “Iniciar vuelta”. Se ocultan los controles de orden.
4. En reparto, confirmar el aviso al cliente y registrar “Entregado” o “No entregado”. Cada operación bloquea dobles toques y refresca el viaje, incluso tras un conflicto o timeout.
5. Para “No entregado”, elegir el motivo; con “Otro” la observación es obligatoria. Máximo 500 caracteres.
6. “Ver info” abre un diálogo inferior con detalle, llamada y enlace a Google Maps. Los campos vacíos se omiten.
7. Finalizar cuando todas las entregas estén entregadas, no entregadas o canceladas. El backend sigue decidiendo si acepta la operación.

Si un refresh falla, se retiran las acciones basadas en datos anteriores y se muestra “Reintentar”. La comprobación periódica de nuevas órdenes es sólo un GET mientras la vuelta está programada; no hay reintentos automáticos de POST ni cola offline. Los errores públicos de WEP se muestran como texto; no se expone HTML del servidor.

## Endpoints consumidos

Todos relativos a `VITE_API_BASE_URL`:

| Método | Endpoint | Envío |
| --- | --- | --- |
| GET | `/auth/vehiculos` | Público |
| POST | `/auth/login` | `{ "vehiculoId": 1, "pin": "..." }`, público |
| GET | `/auth/me` | Bearer de sesión |
| GET | `/pwa/viajes?fecha=YYYY-MM-DD` | Fecha local |
| GET | `/pwa/entregas/:id` | — |
| PUT | `/pwa/viajes/:viajeId/orden` | `{ "entregas": [{ "id": 103, "orden": 1 }, ...] }` completo |
| POST | `/pwa/viajes/:viajeId/iniciar` | Sin body |
| POST | `/pwa/entregas/:id/avisar` | Sin body |
| POST | `/pwa/entregas/:id/entregar` | Sin body |
| POST | `/pwa/entregas/:id/no-entregado` | `{ "motivo": "CLIENTE_AUSENTE", "observacion": "..." }` |
| POST | `/pwa/viajes/:viajeId/finalizar` | Sin body |

Las respuestas mantienen los nombres reales: `viajes`, `entrega`, `vehiculo`, `cliente`, `entrega` (domicilio/horario), `logistica`, `contacto`, etc. `TripSummary` refleja el resumen de cierre; las cards calculan sus contadores a partir de las entregas recibidas.

## PWA en Android

1. Compilar con la URL final de API y servir `dist/` mediante **HTTPS con certificado válido**.
2. Abrir el sitio en Chrome Android.
3. Usar el menú **Instalar aplicación** o **Agregar a pantalla principal** (según navegador).
4. Abrir WEP desde el ícono; se ejecuta en modo standalone.

Manifest: “WEP - Entregas”, short name “WEP”, colores institucionales, iconos PNG de 192 y 512 píxeles y uno maskable. Los iconos se pueden regenerar en Windows con `./tools/generate-icons.ps1`.

Se precachean exclusivamente shell y archivos estáticos. No se cachean respuestas API; fetch utiliza `no-store`. El shell puede abrir sin red, pero cargar datos y operar requiere conexión. Una actualización disponible se ofrece para que el chofer decida cuándo recargar.

El HTTP por IP de una PC en la red local permite revisar la interfaz, pero normalmente no permite instalar la PWA. La excepción de contexto seguro para `localhost` sólo aplica al dispositivo donde corre el navegador. No se realizó instalación en un teléfono físico durante la verificación.

## Estructura

```text
src/
  api/                 # Cliente fetch, autenticación y endpoints operativos
  auth/                # Persistencia centralizada de token y vehículo
  types/auth.ts        # Contratos de autenticación
  types/wep.ts         # Contratos reales del backend
  components/
    app/               # Header, estados de UI, confirmación
    trips/             # TripCard
    deliveries/        # Card, acciones, estado, orden, no entrega, detalle y drawer
    ui/                # Componentes shadcn/vue
  composables/         # Estado auth y carga cancelable del detalle
  views/driver/        # LoginView y pantallas operativas
  router/              # Rutas e historial
  utils/               # Fechas locales, formatos, orden y resumen
  lib/                 # Utilidad cn de shadcn/vue
public/                # Favicon e iconos PWA
tests/                 # Pruebas y datos sintéticos
tools/                 # Generador de iconos y servidor aislado de QA
```

## Pruebas aisladas

`npm test` comprueba fechas locales, estados terminales, orden inmutable, Bearer de sesión, endpoints públicos, limpieza ante 401, `no-store`, errores 409 y respuestas inválidas. No accede al backend.

Verificación inicial: build y TypeScript correctos; flujo completo con fixtures en navegador a 390×844 y detalle inferior a 360×800; recarga de vuelta y acceso directo al detalle; estados vacío/error y recuperación. Las pruebas HTTP también cubren token de entorno, prefijo Bearer, token vacío, prioridad de una sesión explícita y error 401. El manifest y el service worker se generan en producción. Para probar contra datos reales, configurar un token vigente.

Para reproducir QA visual sin datos reales:

```powershell
$env:VITE_API_BASE_URL='/api/wep'
npm run build -- --outDir dist-qa
Remove-Item Env:VITE_API_BASE_URL
npm run qa:serve
```

Abrir `http://localhost:4173/chofer/viajes`. Este servidor usa datos sintéticos en memoria y se escucha sólo en loopback; no envía WhatsApp ni realiza escrituras reales. Detenerlo con Ctrl+C antes de usar `npm run preview`, porque ambos usan 4173. Las pruebas pueden reiniciarlo mediante `/__qa/reset`, con escenarios `?scenario=empty`, `error` o `conflict`. No publicar `dist-qa` ni el servidor de QA.

## Limitaciones actuales

- La autenticación actual es vehículo + PIN con token persistente; no incluye refresh token, recuperación o cambio de PIN.
- Los GET actuales no incluyen motivo/observación de no entrega ni posición de confirmación. Se muestra el motivo retornado por POST mientras se permanece en la pantalla, sin persistirlo. Al recargar no se inventa ni recupera de almacenamiento local.
- El endpoint de orden actualmente no valida el estado PROGRAMADO en el backend. La PWA limita los controles y vuelve a consultar el estado antes de guardar, pero no puede garantizar atomicidad frente a otro operador que inicie simultáneamente. Requiere validación backend en una etapa posterior.
- Reordenamiento mediante botones; no se agregó drag & drop, conforme a la preferencia de comenzar por controles previsibles en móvil.
- Peso y volumen se muestran sin asumir unidades que el contrato no declara.
- Sin mapas internos, tracking público, GESTYA directo, geocercas, avisos por proximidad, fotos, firma, WebSocket, optimización de rutas ni operaciones offline.

Referencias de configuración: [Vite](https://vite.dev/guide/), [shadcn/vue para Vite](https://shadcn-vue.com/docs/installation/vite), [Vite PWA](https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors).
