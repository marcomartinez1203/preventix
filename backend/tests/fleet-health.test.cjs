const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fleetHealth } = require('../dist/demo/fleetHealth');
const now = new Date('2026-10-27T17:00:00Z');
const ago = days => new Date(now.getTime() - days * 86400000).toISOString();
const equipment = [{ id: 'e1', estado: 'activo' }, { id: 'e2', estado: 'fuera_servicio' }, { id: 'archived', estado: 'archivado', archivado: true }];
const completed = { id: 'm1', equipoId: 'e1', tipo: 'preventivo', estado: 'completado', fechaFin: ago(1), costo: 20 };

test('fleet health: bounded weighted score, archived excluded and failures counted per equipment', () => {
  const failures = Array.from({ length: 10 }, (_, i) => ({ id: String(i), equipoId: 'e2', estado: 'abierta', fechaReporte: ago(1) }));
  failures.push({ id: 'old', equipoId: 'archived', estado: 'abierta' });
  const result = fleetHealth(equipment, failures, [completed], 'America/Bogota', 'COP', now);
  assert.equal(result.totalEquipos, 2); assert.equal(result.equiposConFallas, 1);
  assert.equal(result.indice, 50); assert.equal(result.estado, 'prioritario');
  assert.deepEqual(result.factores.map(f => f.puntos), [20, 10, 20]);
  assert.equal(result.equiposSinPreventivoReciente, 1);
});
test('fleet health: empty fleet is unknown, complete coverage is 100', () => {
  assert.equal(fleetHealth([], [], [], 'America/Bogota', 'COP', now).indice, null);
  const result = fleetHealth([equipment[0]], [], [completed], 'America/Bogota', 'COP', now);
  assert.equal(result.indice, 100); assert.equal(result.estado, 'favorable');
  assert.equal(fleetHealth([equipment[0]], [], [], 'America/Bogota', 'COP', now).indice, 60);
});
test('fleet health: only completed recent preventive, overdue tasks remove coverage', () => {
  for (const record of [{ ...completed, fechaFin: ago(91) }, { ...completed, fechaFin: ago(-1) }, { ...completed, tipo: 'correctivo' }, { ...completed, estado: 'cancelado' }]) {
    assert.equal(fleetHealth([equipment[0]], [], [record], 'America/Bogota', 'COP', now).factores[2].cantidad, 0);
  }
  const overdue = { id: 'due', equipoId: 'e1', tipo: 'preventivo', estado: 'programado', fechaProgramada: '2026-10-26' };
  assert.equal(fleetHealth([equipment[0]], [], [completed, overdue], 'America/Bogota', 'COP', now).factores[2].cantidad, 0);
  assert.equal(fleetHealth([equipment[0]], [], [{ ...completed, fechaFin: ago(90) }], 'America/Bogota', 'COP', now).factores[2].cantidad, 1);
});
test('fleet health: six calendar months, zero bins, local timezone and completion costs', () => {
  const failures = [{ id: 'f1', estado: 'resuelta', fechaReporte: '2026-10-01T02:00:00Z', fechaResolucion: '2026-10-02T02:00:00Z' }];
  const tasks = [{ ...completed, fechaFin: '2026-11-01T02:00:00Z', costo: .1 }, { ...completed, id: 'm2', costo: .2 }, { ...completed, id: 'm3', estado: 'programado', costo: 100 }];
  const result = fleetHealth([], failures, tasks, 'America/Bogota', 'COP', now);
  assert.deepEqual(result.tendencias.map(m => m.mes), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  assert.equal(result.tendencias[0].reportadas, 0); assert.equal(result.tendencias[4].reportadas, 1);
  assert.equal(result.tendencias[5].resueltas, 1); assert.equal(result.tendencias[5].costo, .3);
  const january = fleetHealth([], [], [], 'America/Bogota', 'COP', new Date('2027-01-15T17:00:00Z'));
  assert.equal(january.tendencias[0].mes, '2026-08');
});
