// Datos sintéticos con la estructura de groupPwaViajes/mapPwaEntregaDetalle.
// No contienen datos de clientes reales y no forman parte del bundle de producción.
export function fixtureTrip() {
  return {
    id: 10, numeroVuelta: 1, estado: 'PROGRAMADO', iniciadoAt: null, finalizadoAt: null,
    vehiculo: { id: 3, codigoErp: '001', nombre: 'M BENZ', patente: 'AB172IK' },
    paradas: ['Almacén de prueba', 'Cliente de prueba B', 'Cliente de prueba C'].map((nombre, index) => ({
      grupoId: `stop_test_${index}`, ordenSecuencia: index + 1,
      cliente: { codigo: `TEST-${index}`, nombre }, domicilio: 'San Lorenzo 1234', localidad: 'Concordia',
      estado: { codigo: index === 2 ? 'CANCELADA' : 'PROGRAMADA', nombre: index === 2 ? 'Cancelada' : 'Programada' },
      cantidadOrdenes: index === 0 ? 2 : 1,
      totales: { bultos: index === 0 ? 24 : 12, peso: index === 0 ? 2401 : 1200.5, volumen: index === 0 ? 4.8 : 2.4 },
      horaDesde: '09:00:00', horaHasta: '11:00:00',
      entregas: Array.from({ length: index === 0 ? 2 : 1 }, (_, orderIndex) => ({
        id: 101 + index * 2 + orderIndex, ordenSecuencia: index + orderIndex + 1,
        ordenPreparacion: { division: '01', tipo: 'OP', numero: 12345 + index * 2 + orderIndex },
        notaPedido: { division: '01', tipo: 'NP', numero: 98765 + index * 2 + orderIndex },
        estado: { codigo: index === 2 ? 'CANCELADA' : 'PROGRAMADA', nombre: index === 2 ? 'Cancelada' : 'Programada' },
        bultos: 12, peso: 1200.5, volumen: 2.4,
      })),
    })),
  }
}
