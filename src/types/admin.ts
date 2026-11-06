export interface AdminUser { id: number; username: string; displayName: string; role: 'CONSULTA' | 'TIC'; active: boolean; lastLoginAt: string | null }
export interface AdminDelivery {
  id: number; pedido: string | null; cliente_codigo: string; cliente_nombre: string; localidad: string | null;
  estado: string; vehiculo: string; patente: string; vuelta: number; viaje_estado: string;
  hora_desde: string | null; hora_hasta: string | null; aviso_tipo: string | null; aviso_estado: string | null; aviso_fecha: string | null;
  viaje_id?: number | string; domicilio?: string | null;
  pedido_division?: string | null; pedido_tipo?: string | null;
  op_division?: string | null; op_tipo?: string | null; op_numero?: string | null;
}
export interface AdminDeliveryGroup { id: string; orders: AdminDelivery[] }
export interface DailyDeliveryPoint { fecha: string; paradas: number; completadas: number; pedidos: number; pedidos_entregados: number }
export interface DashboardData {
  fecha: string; fetchedAt: string; page: number; pageSize: number;
  summary: { total: number; entregadas: number; no_entregadas: number; en_reparto: number; viajes: number; sin_telefono: number; errores_avisos: number; avisos_enviados: number };
  deliveries: AdminDelivery[]; vehicles: { id: number; nombre: string; patente: string }[];
  grouping?: 'parada'; groups?: AdminDeliveryGroup[]; totalGroups?: number; trend?: DailyDeliveryPoint[];
}
export interface TechnicalData {
  database: string; lastImportedRecordAt: string | null; monitorEnabled: boolean; historyAvailable: boolean; configValid: boolean;
  programmed: { enabled: boolean; dryRun: boolean; cron: string; start: string; end: string } | null;
  sync: { enabled: boolean; cron: string } | null;
  whatsappConfigured: boolean; whatsappVerification: string; executor: string;
  runs: { id: number; job: string; instance: string; status: string; started_at: string; finished_at: string | null; summary: Record<string, number> }[];
  notificationErrors: { id: number; tipo: string; error_codigo: string | null; pedido: string | null; cliente_nombre: string; created_at: string }[];
}
export interface WepTemplate { enabled: boolean; name: string; language: string }
export type WepTemplateType = 'programmed' | 'enReparto' | 'enCamino' | 'enCaminoZona'
export interface WepSettings {
  integrations: Record<WepIntegration, { enabled: boolean; timeoutMs: number }>
  sync: { enabled: boolean; blocked: boolean; cron: string; daysBack: number; daysAhead: number; vehicleCodes: string[] }
  programmed: { enabled: boolean; dryRun: boolean; cron: string; start: string; end: string; weekdays: number[] }
  meta: { paused: boolean; testRouting: { enabled: boolean; phone: string }; phoneNumberId: string; apiVersion: string; templates: Record<WepTemplateType, WepTemplate> }
}
export interface WepSettingsData {
  integrationStatus?: Record<WepIntegration, { configured: boolean }>
  config: WepSettings; revision: number; updatedAt: string | null; tokenConfigured: boolean
  applied: { instance: string; revision: number; executor: boolean; next_sync_at: string | null; next_programmed_at: string | null; applied_at: string }[]
}
export type WepIntegration = 'gestya' | 'google' | 'heigit'
export interface IntegrationTestResult { provider: WepIntegration; checkedAt: string; result: { latitude?: number; longitude?: number; positionDate?: string | null; approximateArea?: boolean; durationMinutes?: number; distanceMeters?: number } }
export interface AdminVehicle {
  id: number; codigo_erp: string | null; nombre: string; patente: string; activo: boolean; es_externo: boolean
  wep_login_activo: boolean; pin_configured: boolean; last_imported_at: string | null
}
export interface SettingsAudit { id: number; actor_name: string; action: string; target: string; previous: Record<string, unknown>; current: Record<string, unknown>; created_at: string }
