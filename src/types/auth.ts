export interface WepVehicle {
  id: number
  codigoErp: string | null
  nombre: string
  patente: string
}

export interface VehiclesResponse {
  ok: true
  vehiculos: WepVehicle[]
}

export interface LoginResponse {
  ok: true
  token: string
  vehiculo: WepVehicle
}

export interface MeResponse {
  ok: true
  vehiculo: WepVehicle
}
