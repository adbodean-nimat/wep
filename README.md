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

`GET /pwa/viajes` lee las tablas operativas de la PWA; no importa directamente las entregas programadas del ERP. El backend incluye un scheduler configurable para importarlas desde Plataforma. Para activarlo, configurar `WEP_SYNC_ENABLED=true` y reiniciar la API; por defecto se ejecuta cada cinco minutos para hoy y los próximos siete días según la fecha argentina. La configuración de ejemplo lo mantiene desactivado. Ver `server/src/modules/wep/AUTO-SYNC.md` en el backend para configuración, concurrencia y alcance. También se puede ejecutar manualmente:

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

### Consulta pública por Nota de Pedido

`/s` permite ingresar una NP y los últimos 4 dígitos del teléfono registrado.
`/seguimiento` se conserva como alias público de la misma pantalla.
Consume `POST /api/wep/public/tracking/lookup` sin token ni sesión de chofer y navega en la
misma pestaña a `/s/:publicId`. Ambas rutas tienen `meta.public`; el guard existente las
admite antes de restaurar la sesión. No se persiste el formulario ni se envía a analytics.

El backend busca exclusivamente `entregas.nota_pedido_numero`, incluyendo las NP secundarias.
Relaciona la entrega con un token por `viaje_id`, `cliente_codigo`, domicilio y localidad
normalizados mediante `normalizeStopText`, el mismo helper del tracking existente.
Sólo acepta tokens `activo = TRUE` y `expira_at > NOW()`. No crea tokens ni devuelve el DTO
del tracking. La ventana temporal es la vigencia del token ya emitido (por defecto hasta
el final del segundo día posterior a la fecha de entrega).

**Disponibilidad:** el backend actual ya genera o reutiliza un token por parada dentro
de `WepSyncService`, después de los UPSERT y antes del COMMIT, con el mismo cliente
PostgreSQL. Aplica al endpoint manual y al scheduler. No requiere enviar WhatsApp ni
iniciar la vuelta: el viaje puede permanecer `PROGRAMADO`. El archivo
`tools/patches/wep-sync-tracking.patch` es una referencia histórica; no debe aplicarse
al backend que ya contiene esta implementación.

La agrupación usa viaje, cliente, domicilio y localidad normalizados. Pedidos de una
misma parada comparten `publicId`, pero cada NP se consulta con el teléfono de su propia
entrega. Se requiere cliente, domicilio y fecha para generar el token; un teléfono
ausente o inválido no impide generarlo, pero sí impide encontrar esa entrega desde `/s`.
El contador `tracking.disponibles` cuenta paradas con token, no pedidos consultables ni
mensajes enviados.

Un token activo y vigente conserva su enlace y vencimiento al repetir la sincronización.
Los vencidos se reemplazan sólo si la fecha de entrega todavía permite emitir un token
vigente; los inactivos no se reactivan. Las paradas históricas fuera de vigencia se
omiten. Para tokens nuevos, `WEP_TRACKING_EXPIRATION_DAYS` vale 2 por defecto: fin del
segundo día posterior a la fecha más temprana de las entregas de la parada, en Argentina.
Si falla la generación, la importación completa se revierte. Los avisos posteriores
reutilizan el token. El lookup sólo lee: no genera, renueva ni reactiva tokens y tampoco
envía WhatsApp.

**Despliegue y validación:** la presencia de esta implementación en el repositorio no
confirma que esté desplegada ni que el esquema de testing esté actualizado. Para pedidos
ya importados, desplegar/reiniciar el backend correspondiente y volver a sincronizar
la fecha del viaje, o esperar un cron habilitado que la incluya. Ver
`server/src/modules/wep/SYNC-TRACKING.md` y el procedimiento reproducible
`server/src/modules/wep/SYNC-TRACKING-TESTING.md` en el backend. Las pruebas con mocks
no sustituyen la integración con PostgreSQL, ERP y `/s` de testing. No ejecutar la
sincronización contra producción ni modificar entregas reales sin revisar el alcance
y obtener aprobación previa.

La comparación reutiliza `normalizeAvailablePhone`: primero `telefono`, luego
`telefono_alternativo` si el principal no es válido para WhatsApp. El helper existente
normaliza los formatos argentinos y descarta valores ambiguos; se comparan sólo los
últimos cuatro dígitos del número normalizado. No se admite el alternativo cuando existe
un principal válido. Cada NP se verifica con el teléfono sincronizado de su propia entrega.

**Postman:** POST a `http://localhost:8099/api/wep/public/tracking/lookup`, sin Authorization,
con `Content-Type: application/json` y body:

```json
{ "pedido": "883524", "telefonoUltimos4": "3569" }
```

Con una entrega real cuyo tracking esté vigente, espera `200` y `{ "ok": true, "publicId": "..." }`.
Repite con una NP secundaria de esa parada: debe devolver el mismo publicId si coincide su teléfono.
Un teléfono incorrecto, NP inexistente, token vencido/inactivo o ausencia de tracking devuelve
siempre `404` con `No encontramos una entrega con los datos ingresados.` Un body inválido
devuelve `400`; un error interno devuelve `500` sin detalles. El sexto intento desde la misma
IP dentro de la ventana devuelve `429` con `Retry-After`, incluso si los anteriores fueron exitosos.

**Navegador:** ejecutar un backend de testing y `npm run dev`; abrir `http://localhost:5173/s`
en una ventana privada. Verificar errores de campos, búsqueda válida, navegación a `/s/:publicId`,
mensajes genéricos para 404/429 y botón Reintentar para errores de conexión. Recargar ambas rutas
sin login. En producción se conserva el fallback de Nginx a `index.html`.

**Variables nuevas del backend** (incluidas en `server/.env.example`):

```dotenv
WEP_TRACKING_LOOKUP_RATE_LIMIT_MAX=5
WEP_TRACKING_LOOKUP_RATE_LIMIT_WINDOW_MINUTES=10
```

El limitador sigue la arquitectura en memoria existente de WEP: cuota por IP y por proceso,
con limpieza de entradas vencidas. Un reinicio reinicia la cuota; varias instancias no la comparten.
No hay cuota adicional por NP en esta etapa; se puede endurecer luego con almacenamiento compartido
y un límite por NP. La auditoría incluye timestamp, NP y resultado; omite teléfono, últimos cuatro,
publicId e IP.

**Proxy:** `api.js` no configura `trust proxy`. El limitador usa `req.ip` y no confía directamente
en `X-Forwarded-For`. Con un proxy delante, la cuota se aplica a la IP del proxy mientras no exista
una configuración de confianza: varios usuarios podrían compartir los cinco intentos. Antes de
desplegar detrás de Nginx, verificar la topología y configurar en Express únicamente las IP/subredes
de proxies confiables, bloqueando acceso directo al backend. No se cambió globalmente `trust proxy`
sin conocer esa infraestructura.

**Privacidad:** el frontend envía pedido y dígitos únicamente en el JSON del POST, sin
Authorization, cookies ni referrer. No agrega esos campos a URLs, almacenamiento ni registros;
limpia los campos al salir y sólo navega al `publicId` validado. Los errores de la pantalla
son textos locales y no muestran contenido arbitrario del backend. No hay reintentos
automáticos, incluso ante 429; el servidor conserva la autoridad sobre la cuota por IP.
La auditoría existente del backend sí registra la NP: si se requiere omitir también ese
identificador, hace falta un cambio independiente en `auditTrackingLookup`. Revisar también
la configuración de logs del proxy/APM para no capturar cuerpos de solicitudes. El `publicId`
es un enlace de acceso al seguimiento y debe tratarse como tal al compartirlo.

Esta implementación modifica sólo frontend, pruebas y documentación. No ejecuta avisos,
sincronizaciones, generación de tokens ni escrituras sobre datos de producción.

Pruebas del backend: `node --test src/modules/wep/wep-tracking-lookup.test.js` desde `server`.
Pruebas del frontend: `npm test`; compilación: `npm run build`.
Las pruebas del formulario usan Vue Test Utils y happy-dom con respuestas simuladas:
validación, ceros iniciales, bloqueo de doble envío, carga, 400/404/429/500, fallo de red,
reintento manual, limpieza de campos y cancelación al salir. Las pruebas de API verifican
POST sin credenciales, `no-store`, respuestas inválidas y validación del identificador antes
de navegar. Las rutas públicas se comprueban sin restaurar sesión de chofer.
Si el aislamiento de Windows impide a esbuild cargar la configuración (`Access is denied`),
usar `npm test -- --configLoader runner` y `npm run build -- --configLoader runner`.

| Ruta | Pantalla |
| --- | --- |
| `/s` (alias `/seguimiento`) | Consulta pública por pedido y últimos cuatro dígitos |
| `/s/:publicId` | Seguimiento público existente |
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
| POST | `/public/tracking/lookup` | `{ "pedido": "883524", "telefonoUltimos4": "3569" }`, público |
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
- Sin mapas internos, GESTYA directo, geocercas, avisos por proximidad, fotos, firma, WebSocket, optimización de rutas ni operaciones offline. El tracking público y su consulta por pedido sí están disponibles.

Referencias de configuración: [Vite](https://vite.dev/guide/), [shadcn/vue para Vite](https://shadcn-vue.com/docs/installation/vite), [Vite PWA](https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors).

## Configuración administrativa y accesos de camiones

En `/administracion`, el rol TIC dispone de **Configuración** y **Camiones y accesos**.
Permiten administrar la sincronización automática y el bloqueo global de importaciones,
los días/horarios y simulación de avisos, Meta exclusivo de WEP y los PIN/accesos de
los camiones. Nombre y patente siguen actualizándose desde ERP por su código estable.
El rol CONSULTA conserva únicamente la vista operativa.

Requiere desplegar también el backend, aplicar `server/database/wep-settings.sql`
y configurar `WEP_SETTINGS_ENABLED=true`, `WEP_SETTINGS_ENCRYPTION_KEY` y las
credenciales exclusivas de WEP. El procedimiento está en
`server/src/modules/wep/SETTINGS.md` del repositorio de la API. La migración no se
ejecuta desde el navegador. El token de Meta nunca se devuelve al frontend; se
envía únicamente al establecerlo o reemplazarlo y se almacena cifrado en servidor.

El tablero distingue revisión guardada de revisión aplicada por el ejecutor.
Los cambios de horarios se recargan cada 15 segundos; los formularios detectan
conflictos de revisión y conservan el borrador ante errores. Cambiar PIN o bloquear
el acceso revoca las sesiones del camión. Todas estas escrituras tienen auditoría.
