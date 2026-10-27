const { test } = require('node:test');
const assert = require('node:assert/strict');
const { monthlyBudget } = require('../dist/demo/monthlyBudget');
const now = new Date('2026-10-27T17:00:00Z');
const record = cost => ({ estado: 'completado', fechaFin: '2026-10-20T17:00:00Z', costo: cost });
test('monthly budget: empty, unset, 80%, full and overspend', () => {
  assert.equal(monthlyBudget([], 100, 'America/Bogota', now).gasto, 0);
  assert.equal(monthlyBudget([record(80)], 0, 'America/Bogota', now).porcentaje, null);
  assert.equal(monthlyBudget([record(79)], 100, 'America/Bogota', now).estado, 'normal');
  assert.equal(monthlyBudget([record(80)], 100, 'America/Bogota', now).estado, 'alerta');
  assert.equal(monthlyBudget([record(100)], 100, 'America/Bogota', now).saldo, 0);
  const exceeded = monthlyBudget([record(120)], 100, 'America/Bogota', now);
  assert.equal(exceeded.estado, 'excedido'); assert.equal(exceeded.saldo, -20); assert.equal(exceeded.porcentaje, 120);
});
test('monthly budget: completion month in business timezone, no estimates, cent arithmetic', () => {
  const result = monthlyBudget([
    record(.1), record(.2),
    { ...record(500), estado: 'programado' }, { ...record(500), estado: 'cancelado' },
    { ...record(500), fechaFin: '2026-10-01T02:00:00Z' },
    { ...record(.4), fechaFin: '2026-11-01T02:00:00Z' },
    { ...record(500), fechaFin: 'invalid' },
  ], 1, 'America/Bogota', now);
  assert.equal(result.gasto, .7); assert.equal(result.completados, 3); assert.equal(result.saldo, .3);
  assert.equal(result.periodo, '2026-10');
});
