const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordBudget, budgetReport, syncBudgetNotifications } = require('../dist/demo/budgetPlanner');
const { suggestMaintenance } = require('../dist/demo/maintenanceSuggestion');
const config = () => ({ id: 'configuracion', zonaHoraria: 'America/Bogota', moneda: 'COP', presupuestoMensualMantenimiento: 100, presupuestoAnualMantenimiento: 1000 });
const date = month => new Date(`2026-${month}-20T17:00:00Z`);
const cost = (month, amount) => ({ id: month, estado: 'completado', fechaFin: date(month).toISOString(), costo: amount });

test('budget history preserves old limits and does not invent missing history', () => {
  const c = config(); recordBudget(c, date('02'));
  c.presupuestoMensualMantenimiento = 200; recordBudget(c, date('03'));
  const report = budgetReport([cost('01', 10), cost('02', 20), cost('03', 30), { ...cost('03', 999), estado: 'programado' }], c, date('03'));
  assert.deepEqual(report.meses.map(m => m.limite), [0, 100, 200]);
  assert.equal(report.meses[0].historialDisponible, false);
  assert.equal(report.anual.gasto, 60);
  assert.equal(report.anual.proyeccion, 180);
  assert.equal(report.anual.saldo, 940);
  assert.equal(budgetReport([], c, date('01')).anual.proyeccion, null);
  assert.equal(budgetReport([cost('03', 30)], c, new Date('2027-01-20T17:00:00Z')).anual.gasto, 0);
});

test('budget alerts persist read state, deduplicate and retire obsolete thresholds', () => {
  const c = config(); c.presupuestoAnualMantenimiento = 100;
  const notices = [];
  syncBudgetNotifications([cost('03', 80)], c, notices, date('03'));
  assert.equal(notices.length, 2);
  notices.forEach(n => n.leida = true);
  syncBudgetNotifications([cost('03', 80)], c, notices, date('03'));
  assert.equal(notices.length, 2); assert.ok(notices.every(n => n.leida));
  syncBudgetNotifications([cost('03', 101)], c, notices, date('03'));
  assert.equal(notices.filter(n => !n.leida).length, 2);
  c.presupuestoMensualMantenimiento = 0; c.presupuestoAnualMantenimiento = 0;
  syncBudgetNotifications([cost('03', 101)], c, notices, date('03'));
  assert.ok(notices.every(n => n.leida));
});

test('recommendation badge appears within seven days and disappears with pending preventive', () => {
  const equipment = { fechaAdquisicion: '2026-03-01' };
  assert.equal(suggestMaintenance(equipment, 0, [], date('03')).recomendado, false);
  const now = new Date('2026-03-24T17:00:00Z');
  assert.equal(suggestMaintenance(equipment, 0, [], now).recomendado, true);
  assert.equal(suggestMaintenance(equipment, 0, [{ id: 'm1', tipo: 'preventivo', estado: 'programado' }], now).recomendado, false);
});
