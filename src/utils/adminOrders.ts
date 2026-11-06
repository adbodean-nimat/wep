import type { AdminDelivery } from '@/types/admin'

export function groupAdminOrders(rows: AdminDelivery[]) {
  const groups = new Map<string, { id: string; pedido: string | null; division: string | null; tipo: string | null; preparations: AdminDelivery[] }>()
  for (const row of rows) {
    const pedido = row.pedido?.trim() || null
    // El número solo no identifica el documento: división y tipo también forman parte de su clave.
    const key = pedido ? JSON.stringify([row.pedido_division ?? '', row.pedido_tipo ?? '', pedido]) : `delivery-${row.id}`
    let group = groups.get(key)
    if (!group) {
      group = { id: String(row.id), pedido, division: row.pedido_division ?? null, tipo: row.pedido_tipo ?? null, preparations: [] }
      groups.set(key, group)
    }
    group.preparations.push(row)
  }
  return [...groups.values()]
}

export function orderStatus(rows: AdminDelivery[]) {
  const states = [...new Set(rows.map(row => row.estado))]
  if (states.length === 1) return states[0]!
  if (states.includes('NO_ENTREGADA')) return 'CON_INCIDENCIAS'
  if (states.includes('ENTREGADA')) return 'PARCIAL'
  if (states.some(state => ['EN_REPARTO', 'CLIENTE_AVISADO'].includes(state))) return 'EN_REPARTO'
  return 'PENDIENTE'
}

export function orderNotice(rows: AdminDelivery[]) {
  const rank: Record<string, number> = { ERROR: 5, LEIDO: 4, ENTREGADO: 3, ENVIADO: 2, PENDIENTE: 1 }
  const date = (row: AdminDelivery) => {
    const parsed = row.aviso_fecha ? Date.parse(row.aviso_fecha) : NaN
    return Number.isFinite(parsed) ? parsed : -Infinity
  }
  // Sin fechas, priorizar errores y luego la confirmación más avanzada.
  return [...rows].filter(row => row.aviso_estado).sort((a, b) => {
    const first = date(a), second = date(b)
    const unknownErrorA = a.aviso_estado === 'ERROR' && first === -Infinity
    const unknownErrorB = b.aviso_estado === 'ERROR' && second === -Infinity
    if (unknownErrorA !== unknownErrorB) return unknownErrorA ? -1 : 1
    if (first !== second) return second > first ? 1 : -1
    return (rank[b.aviso_estado!] ?? 0) - (rank[a.aviso_estado!] ?? 0)
  })[0] ?? null
}

export function orderWindow(rows: AdminDelivery[]) {
  const windows = [...new Set(rows.map(row => !row.hora_desde && !row.hora_hasta ? 'Sin horario' : `${row.hora_desde?.slice(0, 5) || '—'} – ${row.hora_hasta?.slice(0, 5) || '—'}`))]
  return windows.length === 1 ? windows[0]! : 'Franja a confirmar'
}
