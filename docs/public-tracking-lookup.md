# Consulta pública de entregas

La página `/s` usa el layout público NIMAT, sin iniciar sesión de chofer. Envía
`POST /public/tracking/lookup` sobre `VITE_API_BASE_URL` (que debe terminar en
`/api/wep`), con JSON `{ pedido, telefonoUltimos4 }`. No usa parámetros de consulta.
El pedido es un string de 1 a 20 dígitos; el teléfono contiene exactamente cuatro,
incluidos ceros iniciales. Se recortan espacios exteriores del pedido sin convertirlo
a Number ni modificar sus ceros iniciales: el backend compara con el valor persistido.

Una respuesta `{ ok: true, publicId }` lleva por nombre de ruta a `/s/:publicId`
mediante `replace`. El formulario se limpia al resolver y al desmontarse; no se guarda
en storage. La respuesta debe contener un identificador de 22 a 64 caracteres
alfanuméricos, guion o guion bajo, como exige el backend.

## Cuándo se puede consultar una entrega

Revisión del backend `adbodean-nimat/backend-consultasoperativas`, rama main:

- Debe existir una entrega sincronizada y su viaje, con `nota_pedido_numero` igual
  al pedido consultado. No se busca por orden de preparación ni por QR.
- Debe existir un registro en `tracking_tokens` para el mismo viaje y cliente,
  con `activo = TRUE`, `expira_at > NOW()` y un `public_id` válido.
- Domicilio y localidad normalizados deben coincidir con la parada del token.
- Los cuatro dígitos se comparan con el teléfono elegido por
  `normalizeAvailablePhone`: primero el principal válido para WhatsApp y solamente
  si no es válido, el alternativo. No se aceptan indistintamente ambos teléfonos.
- Un pedido secundario de la misma parada puede resolver el mismo seguimiento.
  Si hubiera varias coincidencias válidas, el servicio toma la primera según el
  orden de tokens más recientes del repositorio; la página no muestra candidatos.

La búsqueda es de solo lectura: **no genera, renueva ni reactiva tokens**. Los
flujos existentes de notificaciones llaman a `getOrCreateTrackingForStop`, por
ejemplo PROGRAMADA y EN_REPARTO. Tener un pedido cargado o sincronizado no basta.
Tampoco se exige haber recibido efectivamente WhatsApp: lo determinante es que
el token ya exista y siga activo y vigente. Un fallo de envío puede ocurrir después
de crearlo. La vigencia predeterminada llega al final del segundo día posterior a
la fecha de entrega (Argentina), configurable con `WEP_TRACKING_EXPIRATION_DAYS`
entre 1 y 30 días. Con fecha inválida, se calcula desde el momento de creación.

Un 404 puede representar datos incorrectos, ausencia de token, vencimiento,
revocación o una parada que ya no coincide. El mensaje público es uniforme.
Esta implementación no amplía la disponibilidad a pedidos sin token. Hacerlo
requiere una decisión funcional y un cambio separado del backend.

## Errores y límites

Validación local antes de enviar, bloqueo durante la consulta y cancelación al
salir de la página. Los errores 400, 404 y 429 tienen mensajes propios; errores
de red, servidor y respuesta inválida permiten reintentar manualmente. No hay
reintentos automáticos que consuman el límite.

El backend permite por defecto cinco solicitudes por IP cada diez minutos,
incluidas solicitudes exitosas e inválidas, y devuelve 429 con `Retry-After`.
Los valores se configuran con `WEP_TRACKING_LOOKUP_RATE_LIMIT_MAX` y
`WEP_TRACKING_LOOKUP_RATE_LIMIT_WINDOW_MINUTES`. La página no asume una espera
exacta ni bloquea por diez minutos fijos. El límite actual vive en memoria por
proceso; detrás de proxies depende del `trust proxy` de Express y varias réplicas
no comparten contadores.

## Privacidad y operación

El frontend no registra pedido, teléfono, publicId, cuerpos ni errores completos.
La consulta usa `cache: no-store`, sin credenciales de chofer ni referrer.
Solo el publicId opaco aparece en la URL del seguimiento existente; debe tratarse
como un enlace de acceso y evitarse su captura en analítica o registros de proxy.
No registrar cuerpos de esta ruta en proxies/APM. Usar HTTPS.

El backend original registraba el pedido numérico en `auditTrackingLookup`.
El cambio complementario preparado en el backend elimina ese dato y conserva
solamente timestamp y resultado, también para intentos limitados. Publicar esa
corrección junto con el frontend para evitar registrar los pedidos consultados.

El hosting debe servir `index.html` como fallback de `/s` y `/s/:publicId`, como
para las demás rutas Vue. Se conserva el seguimiento actual y la autenticación
de choferes. No se agregan migraciones, generación masiva de tokens ni procesos
de notificaciones. Las pruebas usan respuestas simuladas y datos ficticios,
sin llamar al backend ni a bases de producción.

## Verificación

`npm ci`, `npm test`, `npm run build`. Las pruebas de API verifican contrato,
privacidad, validación, errores y respuestas malformadas. Las pruebas de la página
verifican acceso público, validación del formulario, carga, doble envío,
redirección, errores recuperables y cancelación.
