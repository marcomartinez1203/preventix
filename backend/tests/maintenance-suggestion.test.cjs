const { test } = require('node:test');
const assert = require('node:assert/strict');
const { suggestMaintenance } = require('../dist/demo/maintenanceSuggestion');
const now = new Date('2026-10-27T17:00:00Z');
const equipment = days => ({ fechaAdquisicion: new Date(now.getTime() - days * 86400000).toISOString() });

test('suggestions: MTBF boundaries and insufficient history', () => {
  for (const [days, expected] of [[29, 15], [30, 30], [89, 30], [90, 60]]) {
    assert.equal(suggestMaintenance(equipment(days * 2), 2, [], now).frecuenciaDias, expected);
  }
  const noFailures = suggestMaintenance(equipment(365), 0, [], now);
  assert.equal(noFailures.frecuenciaDias, 30);
  assert.equal(noFailures.mtbfDias, null);
  assert.equal(noFailures.fechaProgramada, '2026-10-27');
  assert.equal(suggestMaintenance(equipment(10), 1, [], now).frecuenciaDias, 30);
  assert.equal(suggestMaintenance({}, 4, [], now).frecuenciaDias, 30);
});

test('suggestions: last completed preventive, calendar month rollover and pending work', () => {
  const rows = [
    { id: '1', tipo: 'preventivo', estado: 'completado', fechaFin: '2026-10-20T17:00:00Z' },
    { id: '2', tipo: 'correctivo', estado: 'completado', fechaFin: '2026-10-26T17:00:00Z' },
    { id: '3', tipo: 'preventivo', estado: 'cancelado', fechaProgramada: '2026-11-01' },
  ];
  const result = suggestMaintenance(equipment(100), 2, rows, now);
  assert.equal(result.fechaProgramada, '2026-11-19');
  assert.equal(result.fechaBase, '2026-10-20');
  assert.equal(result.pendiente, null);
  assert.equal(result.atrasado, false);
  rows.push({ id: '4', tipo: 'preventivo', estado: 'vencido', fechaProgramada: '2026-10-25' });
  assert.equal(suggestMaintenance(equipment(100), 2, rows, now).pendiente.id, '4');
});
