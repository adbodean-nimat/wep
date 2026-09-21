export type PublicTrackingStatus =
  | 'PROGRAMADA'
  | 'ASIGNADA'
  | 'EN_REPARTO'
  | 'CLIENTE_AVISADO'
  | 'ENTREGADA'
  | 'NO_ENTREGADA'
  | 'CANCELADA'
  | 'CERRADA_PARCIAL'

export interface PublicTracking {
  estado: {
    codigo: PublicTrackingStatus
    nombre: string
  }
  fechaEntrega: string | null
  horario: {
    desde: string | null
    hasta: string | null
  }
  destino: {
    localidad: string | null
  }
  ultimaActualizacion: string | null
  viaje: {
    enCurso: boolean
  }
  vehiculo:
    | { posicionDisponible: false }
    | {
        posicionDisponible: true
        latitud: number
        longitud: number
        fechaPosicion: string | null
      }
}

export type PublicTrackingResponse = {
  ok: true
  tracking: PublicTracking
}
