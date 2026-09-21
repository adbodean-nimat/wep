// Contratos verificados en server/src/modules/wep/wep-pwa.repository.js y wep.routes.js.
export type DeliveryStatus = 'PROGRAMADA' | 'ASIGNADA' | 'EN_REPARTO' | 'CLIENTE_AVISADO' | 'ENTREGADA' | 'NO_ENTREGADA' | 'CANCELADA'
export type StopStatus = DeliveryStatus | 'CERRADA_PARCIAL'
export type TripStatus = 'PROGRAMADO' | 'EN_REPARTO' | 'FINALIZADO'
export interface State { codigo: DeliveryStatus | null; nombre: string | null }
export interface Vehicle { id: number | null; codigoErp: string | null; nombre: string | null; patente: string | null }
export interface DocumentReference { division: string | null; tipo: string | null; numero: number | null }
export interface Delivery {
  id: number | null
  ordenSecuencia: number | null
  estado: State
  estadoErp: string | null
  ordenPreparacion: DocumentReference
  notaPedido: DocumentReference
  cliente: { codigo: string | null; nombre: string | null }
  entrega: {
    domicilio: string | null; localidad: string | null; zonaCodigo: string | null; zonaNombre: string | null
    fecha: string | null; horaDesde: string | null; horaHasta: string | null
  }
  logistica: { pesoCalculado: number | null; volumenCalculado: number | null; bultosCalculados: number | null }
  observacionEntrega: string | null
  observaciones: string | null
}
export interface WepStopDelivery {
  id: number | null
  ordenSecuencia: number | null
  ordenPreparacion: DocumentReference
  notaPedido: DocumentReference
  estado: State
  bultos: number | null
  peso: number | null
  volumen: number | null
}
export interface WepStop {
  grupoId: string
  ordenSecuencia: number | null
  cliente: { codigo: string | null; nombre: string }
  domicilio: string | null
  localidad: string | null
  estado: { codigo: StopStatus; nombre: string }
  cantidadOrdenes: number
  totales: { bultos: number; peso: number; volumen: number }
  horaDesde: string | null
  horaHasta: string | null
  entregas: WepStopDelivery[]
}
export interface Trip {
  id: number | null
  numeroVuelta: number
  estado: TripStatus
  iniciadoAt: string | null
  finalizadoAt: string | null
  vehiculo: Vehicle
  paradas: WepStop[]
}
export interface DeliveryDetail extends Delivery {
  contacto: { telefono: string | null; telefonoAlternativo: string | null; email: string | null }
  vehiculo: Vehicle
  viaje: { id: number | null; numeroVuelta: number | null; estado: TripStatus | null }
}
export interface TripSummary { totalEntregas: number; entregadas: number; noEntregadas: number; canceladas: number }
export type ApiResponse<T extends object> = { ok: true } & T
export type TripsResponse = ApiResponse<{ fecha: string; totalViajes: number; totalParadas: number; totalEntregas: number; viajes: Trip[] }>
export type DeliveryDetailResponse = ApiResponse<{ entrega: DeliveryDetail }>
export type StartResponse = ApiResponse<{ message: string; viaje: { id: number; estado: TripStatus; iniciadoAt: string }; entregasActualizadas: number }>
export type FinishResponse = ApiResponse<{ message: string; viaje: { id: number; estado: TripStatus; iniciadoAt: string | null; finalizadoAt: string }; resumen: TripSummary }>
export type OrderResponse = ApiResponse<{ message: string; viajeId: number; totalEntregas: number; entregas: { id: number; ordenSecuencia: number }[] }>
export type NoticeResponse = ApiResponse<{ message: string; entrega: { id: number; estado: State }; notificacion: { tipo: string; canal: 'WHATSAPP'; estado: 'ENVIADO'; enviadoAt: string } }>
export type DeliveredResponse = ApiResponse<{ message: string; entrega: { id: number; estado: State; entregadoAt: string; posicion: Position } }>
export interface Position { latitud: number | null; longitud: number | null }
export type NoDeliveryReason = 'CLIENTE_AUSENTE' | 'DOMICILIO_CERRADO' | 'DIRECCION_INCORRECTA' | 'CLIENTE_RECHAZA' | 'SIN_ACCESO' | 'PROBLEMA_DE_CARGA' | 'OTRO'
export interface NoDeliveryPayload { motivo: NoDeliveryReason; observacion: string }
export type NoDeliveryResponse = ApiResponse<{ message: string; entrega: { id: number; estado: State; noEntregadoAt: string; motivo: NoDeliveryReason; observacion: string | null; posicion: Position } }>
export interface StopActionSummary {
  grupoId: string
  estado: { codigo: StopStatus; nombre: string }
  cantidadOrdenes: number
  entregasActualizadas: number
  entregas: { id: number; estado: State }[]
}
export interface StopPosition extends Position { obtenidaDesdeGestya: boolean }
export type StopNoticeResponse = ApiResponse<{
  message: string
  parada: StopActionSummary
  notificacion: { tipo: string; canal: 'WHATSAPP'; estado: 'ENVIADO'; enviadoAt: string }
}>
export type StopDeliveredResponse = ApiResponse<{ message: string; parada: StopActionSummary & { posicion: StopPosition } }>
export type StopNoDeliveryResponse = ApiResponse<{ message: string; parada: StopActionSummary & { posicion: StopPosition } }>

export type QrSuggestedAction = 'AVISAR_CLIENTE' | 'YA_AVISADO' | 'YA_ENTREGADA' | 'NO_ENTREGADA' | 'VIAJE_NO_INICIADO'
export interface ResolvedQr {
  division: string
  tipo: string
  pedido: string
}
export interface QrResolvedDelivery {
  id: number
  ordenPreparacion: { division: string | null; tipo: string | null; numero: number | null }
}
export interface QrResolvedStop {
  grupoId: string
  cliente: { codigo: string | null; nombre: string }
  domicilio: string | null
  localidad: string | null
  estado: { codigo: StopStatus; nombre: string }
  cantidadOrdenes: number
  totales: { bultos: number; peso: number; volumen: number }
  horaDesde: string | null
  horaHasta: string | null
  entregas: QrResolvedDelivery[]
}
export type QrResolveResponse = ApiResponse<{
  qr: ResolvedQr
  viaje: { id: number; numeroVuelta: number }
  parada: QrResolvedStop
  accionSugerida: QrSuggestedAction
}>
