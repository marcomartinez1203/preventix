const { test } = require('node:test');
const assert = require('node:assert/strict');
const { equipmentRisk } = require('../dist/demo/equipmentRisk');
const now = new Date('2026-10-27T17:00:00Z');
const ago = days => new Date(now.getTime() - days * 86400000).toISOString();
const equipment = { id: 'e1', nombre: 'Equipo', fechaAdquisicion: ago(365.25 * 6), createdAt: ago(365) };
const fail = (days, priority = 'alta') => ({ id: String(days), fechaReporte: ago(days), prioridad: priority });
test('risk: normalized weights cap at 100 and explain all contributions', () => {
  const r = equipmentRisk(equipment, Array.from({ length: 10 }, (_, i) => fail(i)), [], now);
  assert.equal(r.scoreRiesgo, 100); assert.equal(r.nivelRiesgo, 'alto');
  assert.equal(r.factores.reduce((sum, f) => sum + f.puntos, 0), 100);
});
test('risk: recent preventive reduces score, old and future failures excluded', () => {
  const r = equipmentRisk(equipment, [fail(91), fail(-1), fail(90)], [{ id: 'm', tipo: 'preventivo', estado: 'completado', fechaFin: ago(0) }], now);
  assert.equal(r.factores[0].puntos, 8); assert.equal(r.factores[1].puntos, 0);
  assert.equal(r.factores[3].puntos, 5); assert.equal(r.scoreRiesgo, 33); assert.equal(r.nivelRiesgo, 'medio');
  assert.equal(equipmentRisk({ ...equipment, fechaAdquisicion: ago(0) }, [], [], now).nivelRiesgo, 'bajo');
});
test('risk: missing dates never look like a measured low risk', () => {
  const r = equipmentRisk({ id: 'e', nombre: 'Sin fecha' }, [], [], now);
  assert.equal(r.scoreRiesgo, null); assert.equal(r.nivelRiesgo, 'sin_datos');
  assert.equal(r.factores[2].puntos, null);
});
