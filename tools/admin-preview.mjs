// QA visual aislada con datos ficticios. No conecta con ERP, WEP, Meta o AD.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist-qa-admin');
const users = [{ id: 1, username: 'tic', displayName: 'TIC · Datos ficticios', role: 'TIC', active: true, lastLoginAt: null },
  { id: 2, username: 'consulta', displayName: 'Consulta · Datos ficticios', role: 'CONSULTA', active: true, lastLoginAt: null }];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4176');
  const send = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  if (url.pathname.startsWith('/api/wep/control/')) {
    const path = url.pathname.slice('/api/wep/control'.length);
    if (path === '/login') {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const input = JSON.parse(raw || '{}'); const user = users.find(user => user.username === input.username);
      return user && input.password === 'solo-preview-local' ? send({ ok: true, token: `preview-${user.username}`, user }) : send({ ok: false, message: 'Vista de prueba: usuario tic o consulta; contraseña solo-preview-local.' }, 401);
    }
    const user = users.find(user => req.headers.authorization === `Bearer preview-${user.username}`);
    if (!user) return send({ ok: false, message: 'Ingresá a la vista de prueba.' }, 401);
    if (path === '/me') return send({ ok: true, user });
    if (path === '/dashboard') {
      const allDeliveries = ['PROGRAMADA', 'EN_REPARTO', 'ENTREGADA', 'NO_ENTREGADA', 'CLIENTE_AVISADO', 'ASIGNADA'].map((estado, index) => ({
        id: index + 1, pedido: String(index === 1 ? 880001 : 880001 + index), pedido_division: '1', pedido_tipo: 'NP', op_division: '1', op_tipo: 'OP', op_numero: String(990001 + index), cliente_codigo: `DEMO${index < 2 || index === 5 ? 1 : index === 4 ? 2 : index}`, cliente_nombre: `Cliente de ejemplo ${index < 2 || index === 5 ? 1 : index === 4 ? 2 : index}`, localidad: 'Concordia',
        domicilio: index < 2 || index === 5 ? 'Calle de ejemplo 100' : `Calle de ejemplo ${100 + index}`,
        viaje_id: index === 3 || index === 5 ? 2 : 1,
        estado, vehiculo: index === 3 || index === 5 ? 'Camión 102' : 'Camión 101', patente: index === 3 || index === 5 ? 'DEMO 102' : 'DEMO 101', vuelta: 1, viaje_estado: 'EN_REPARTO',
        hora_desde: '10:00:00', hora_hasta: '14:00:00', aviso_tipo: 'PROGRAMADA', aviso_estado: index === 3 ? 'ERROR' : index === 0 ? null : 'ENVIADO', aviso_fecha: index === 0 || index === 3 ? null : new Date().toISOString(),
      }));
      const deliveries = allDeliveries.filter(row => (!url.searchParams.get('estado') || row.estado === url.searchParams.get('estado')) && (!url.searchParams.get('vehiculo') || (row.vehiculo.endsWith('101') ? '1' : '2') === url.searchParams.get('vehiculo')) && (!url.searchParams.get('q') || `${row.pedido} ${row.cliente_nombre} ${row.localidad}`.toLowerCase().includes(url.searchParams.get('q').toLowerCase())));
      const byStop = new Map();
      for (const order of deliveries) {
        const key = `${order.viaje_id}-${order.cliente_codigo}-${order.domicilio.replaceAll(' ', '-')}`;
        if (!byStop.has(key)) byStop.set(key, { id: `preview-${key}`, orders: [] });
        byStop.get(key).orders.push(order);
      }
      const days = Number(url.searchParams.get('dias') || 14);
      const end = new Date(`${url.searchParams.get('fecha')}T12:00:00Z`);
      const trendOrders = allDeliveries.filter(order => !url.searchParams.get('vehiculo') || String(order.viaje_id) === url.searchParams.get('vehiculo'));
      const trendStops = new Set(trendOrders.map(order => `${order.viaje_id}-${order.cliente_codigo}-${order.domicilio}`));
      const trend = Array.from({ length: days }, (_, index) => {
        const day = new Date(end); day.setUTCDate(day.getUTCDate() - (days - index - 1));
        const paradas = index === days - 1 ? trendStops.size : [8, 5, 0, 9, 12, 7, 10][index % 7];
        const completadas = index === days - 1 ? trendOrders.filter(order => order.estado === 'ENTREGADA').length : Math.max(0, paradas - (index % 3));
        return { fecha: day.toISOString().slice(0, 10), paradas, completadas, pedidos: index === days - 1 ? trendOrders.length : paradas * 2, pedidos_entregados: index === days - 1 ? completadas : completadas * 2 };
      });
      return send({ ok: true, fecha: url.searchParams.get('fecha'), fetchedAt: new Date().toISOString(), page: 1, pageSize: 50, grouping: 'parada', groups: [...byStop.values()], totalGroups: byStop.size, trend, vehicles: [{ id: 1, nombre: 'Camión 101', patente: 'DEMO 101' }, { id: 2, nombre: 'Camión 102', patente: 'DEMO 102' }], deliveries,
        summary: { total: deliveries.length, entregadas: deliveries.filter(d => d.estado === 'ENTREGADA').length, en_reparto: deliveries.filter(d => ['EN_REPARTO', 'CLIENTE_AVISADO'].includes(d.estado)).length, no_entregadas: deliveries.filter(d => d.estado === 'NO_ENTREGADA').length, viajes: new Set(deliveries.map(d => d.vehiculo)).size, sin_telefono: 0, errores_avisos: deliveries.filter(d => d.aviso_estado === 'ERROR').length, avisos_enviados: deliveries.filter(d => d.aviso_estado === 'ENVIADO').length } });
    }
    if (user.role !== 'TIC') return send({ ok: false, message: 'Solo TIC.' }, 403);
    if (path === '/technical') return send({ ok: true, database: 'DISPONIBLE', lastImportedRecordAt: new Date().toISOString(), monitorEnabled: true, historyAvailable: true, configValid: true,
      programmed: { enabled: true, dryRun: true, cron: '*/5 * * * *', start: '06:00', end: '21:00' }, sync: { enabled: true, cron: '*/5 * * * *' }, whatsappConfigured: true, whatsappVerification: 'NO_VERIFICADO', executor: 'NODE_APP_INSTANCE=0',
      runs: [{ id: 1, job: 'PROGRAMADA', instance: '0', status: 'SIMULACION', started_at: new Date().toISOString(), finished_at: new Date().toISOString(), summary: { errores: 0 } }], notificationErrors: [{ id: 1, tipo: 'PROGRAMADA', error_codigo: 'ERROR_DE_EJEMPLO', pedido: '880004', cliente_nombre: 'Cliente de ejemplo 4', created_at: new Date().toISOString() }] });
    if (path === '/users' && req.method === 'GET') return send({ ok: true, users });
    return send({ ok: false, message: 'La vista de prueba no modifica usuarios.' }, 403);
  }
  const file = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + sep)) {
    res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(await readFile(resolve(root, 'index.html')));
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end(await readFile(resolve(root, 'index.html'))); }
});
server.listen(4176, '127.0.0.1', () => console.log('QA administración (datos ficticios): http://127.0.0.1:4176/administracion/login'));
