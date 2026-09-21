// Servidor de QA aislado. Nunca conecta con WEP ni servicios externos.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fixtureTrip } from '../tests/fixtures.mjs'
let trip = fixtureTrip()
let scenario = 'normal'
const root = resolve('dist-qa')
const closed = new Set(['ENTREGADA', 'NO_ENTREGADA', 'CANCELADA'])
const stateNames = { PROGRAMADA: 'Programada', ASIGNADA: 'Asignada', EN_REPARTO: 'En reparto', CLIENTE_AVISADO: 'Cliente avisado', ENTREGADA: 'Entregada', NO_ENTREGADA: 'No entregada', CANCELADA: 'Cancelada', CERRADA_PARCIAL: 'Cerrada parcialmente' }
const entries = () => trip.paradas.flatMap(stop => stop.entregas.map(delivery => ({ stop, delivery })))
function updateStopState(stop) {
  const states = stop.entregas.map(delivery => delivery.estado.codigo)
  const codigo = states.every(state => state === 'ENTREGADA') ? 'ENTREGADA'
    : states.every(state => state === 'NO_ENTREGADA') ? 'NO_ENTREGADA'
      : states.every(state => state === 'CANCELADA') ? 'CANCELADA'
        : states.every(state => closed.has(state)) ? 'CERRADA_PARCIAL'
          : states.includes('CLIENTE_AVISADO') ? 'CLIENTE_AVISADO'
            : states.includes('EN_REPARTO') ? 'EN_REPARTO'
              : states.includes('ASIGNADA') ? 'ASIGNADA' : 'PROGRAMADA'
  stop.estado = { codigo, nombre: stateNames[codigo] }
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4173')
  const send = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
  if (url.pathname === '/__qa/reset') { trip = fixtureTrip(); scenario = url.searchParams.get('scenario') || 'normal'; return send({ ok: true }) }
  if (url.pathname.startsWith('/api/wep/')) {
    const path = url.pathname.slice('/api/wep'.length)
    let body = ''
    for await (const chunk of req) body += chunk
    const input = body ? JSON.parse(body) : {}
    const vehicle = trip.vehiculo
    if (path === '/auth/vehiculos') return send({ ok: true, vehiculos: [vehicle] })
    if (path === '/auth/login') return input.vehiculoId === vehicle.id && input.pin === '1234'
      ? send({ ok: true, token: 'qa-token', vehiculo: vehicle })
      : send({ ok: false, message: 'Credenciales de QA inválidas' }, 401)
    if (path === '/auth/me') return send({ ok: true, vehiculo: vehicle })
    if (path === '/pwa/viajes') {
      if (scenario === 'error') return send({ ok: false, message: 'Error de conexión de prueba' }, 503)
      return send({ ok: true, fecha: url.searchParams.get('fecha'), totalViajes: scenario === 'empty' ? 0 : 1, totalParadas: scenario === 'empty' ? 0 : trip.paradas.length, totalEntregas: scenario === 'empty' ? 0 : entries().length, viajes: scenario === 'empty' ? [] : [trip] })
    }
    const stopAction = path.match(/^\/pwa\/viajes\/(\d+)\/paradas\/([^/]+)\/(avisar|entregar|no-entregado)$/)
    if (stopAction) {
      const stop = trip.paradas.find(item => item.grupoId === decodeURIComponent(stopAction[2]))
      if (!stop || Number(stopAction[1]) !== trip.id) return send({ ok: false, message: 'Parada no encontrada' }, 404)
      if (scenario === 'conflict') return send({ ok: false, message: 'La parada no admite la acción en su estado actual' }, 409)
      const action = stopAction[3]
      const code = action === 'avisar' ? 'CLIENTE_AVISADO' : action === 'entregar' ? 'ENTREGADA' : 'NO_ENTREGADA'
      const operable = stop.entregas.filter(item => item.estado.codigo !== 'CANCELADA')
      operable.forEach(item => { item.estado = { codigo: code, nombre: stateNames[code] } })
      updateStopState(stop)
      const parada = { grupoId: stop.grupoId, estado: stop.estado, cantidadOrdenes: stop.cantidadOrdenes, entregasActualizadas: operable.length, entregas: stop.entregas.map(item => ({ id: item.id, estado: item.estado })) }
      if (action !== 'avisar') parada.posicion = { latitud: null, longitud: null, obtenidaDesdeGestya: false }
      return send({ ok: true, message: `Acción ${action} completada`, parada, ...(action === 'avisar' ? { notificacion: { tipo: 'EN_CAMINO', canal: 'WHATSAPP', estado: 'ENVIADO', enviadoAt: new Date().toISOString() } } : {}) })
    }
    const entry = entries().find(item => item.delivery.id === Number(path.split('/')[3]))
    const delivery = entry?.delivery
    if (req.method === 'GET' && delivery && entry) return send({ ok: true, entrega: { id: delivery.id, ordenSecuencia: delivery.ordenSecuencia, estado: delivery.estado, estadoErp: null, ordenPreparacion: delivery.ordenPreparacion, notaPedido: delivery.notaPedido, cliente: entry.stop.cliente, entrega: { domicilio: entry.stop.domicilio, localidad: entry.stop.localidad, zonaCodigo: null, zonaNombre: null, fecha: null, horaDesde: entry.stop.horaDesde, horaHasta: entry.stop.horaHasta }, logistica: { pesoCalculado: delivery.peso, volumenCalculado: delivery.volumen, bultosCalculados: delivery.bultos }, observacionEntrega: null, observaciones: null, contacto: { telefono: '000000000', telefonoAlternativo: null, email: 'prueba@example.com' }, vehiculo: trip.vehiculo, viaje: { id: trip.id, numeroVuelta: trip.numeroVuelta, estado: trip.estado } } })
    if (path.endsWith('/orden')) {
      if (input.entregas.length !== entries().length) return send({ ok: false, message: 'Debe enviarse el orden completo' }, 400)
      const orderById = new Map(input.entregas.map(item => [item.id, item.orden]))
      for (const stop of trip.paradas) {
        stop.entregas.sort((left, right) => orderById.get(left.id) - orderById.get(right.id))
        stop.entregas.forEach(item => { item.ordenSecuencia = orderById.get(item.id) })
        stop.ordenSecuencia = Math.min(...stop.entregas.map(item => item.ordenSecuencia))
      }
      trip.paradas.sort((left, right) => left.ordenSecuencia - right.ordenSecuencia)
      return send({ ok: true, message: 'Orden de entregas actualizado', viajeId: trip.id, totalEntregas: input.entregas.length, entregas: input.entregas.map(item => ({ id: item.id, ordenSecuencia: item.orden })) })
    }
    if (path.endsWith('/iniciar')) {
      trip.estado = 'EN_REPARTO'; trip.iniciadoAt = new Date().toISOString()
      for (const stop of trip.paradas) {
        stop.entregas.forEach(item => { if (item.estado.codigo === 'PROGRAMADA') item.estado = { codigo: 'EN_REPARTO', nombre: 'En reparto' } })
        updateStopState(stop)
      }
      return send({ ok: true, message: 'Viaje iniciado correctamente', viaje: { id: trip.id, estado: trip.estado, iniciadoAt: trip.iniciadoAt }, entregasActualizadas: entries().filter(item => item.delivery.estado.codigo === 'EN_REPARTO').length })
    }
    if (path.endsWith('/finalizar')) {
      if (entries().some(item => !closed.has(item.delivery.estado.codigo))) return send({ ok: false, message: 'El viaje todavía tiene entregas pendientes' }, 409)
      trip.estado = 'FINALIZADO'; trip.finalizadoAt = new Date().toISOString()
      return send({ ok: true, message: 'Viaje finalizado correctamente', viaje: { id: trip.id, estado: trip.estado, iniciadoAt: trip.iniciadoAt, finalizadoAt: trip.finalizadoAt }, resumen: { totalEntregas: 3, entregadas: 1, noEntregadas: 1, canceladas: 1 } })
    }
    if (delivery && entry) {
      if (scenario === 'conflict') return send({ ok: false, message: 'La entrega ya tiene un aviso enviado' }, 409)
      const code = path.endsWith('/avisar') ? 'CLIENTE_AVISADO' : path.endsWith('/no-entregado') ? 'NO_ENTREGADA' : 'ENTREGADA'
      delivery.estado = { codigo: code, nombre: code }
      updateStopState(entry.stop)
      const extra = code === 'NO_ENTREGADA' ? { motivo: input.motivo, observacion: input.observacion || null, noEntregadoAt: new Date().toISOString(), posicion: { latitud: null, longitud: null } } : code === 'ENTREGADA' ? { entregadoAt: new Date().toISOString(), posicion: { latitud: null, longitud: null } } : {}
      return send({ ok: true, message: 'Operación de prueba completada', entrega: { id: delivery.id, estado: delivery.estado, ...extra }, ...(code === 'CLIENTE_AVISADO' ? { notificacion: { tipo: 'CLIENTE_AVISADO', canal: 'WHATSAPP', estado: 'ENVIADO', enviadoAt: new Date().toISOString() } } : {}) })
    }
    return send({ ok: false, message: 'No encontrado' }, 404)
  }
  const file = resolve(root, '.' + decodeURIComponent(url.pathname))
  if (!file.startsWith(root + sep)) return send({ ok: false }, 404)
  try {
    const data = await readFile(file)
    const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.html': 'text/html' }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data)
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(await readFile(resolve(root, 'index.html')))
  }
})
server.listen(4173, '127.0.0.1', () => process.stdout.write('QA sintético: http://localhost:4173/chofer/viajes\n'))
