const { test } = require('node:test');
const assert = require('node:assert/strict');
const { coverageStatus, matchesCoverage, syncCoverageNotifications } = require('../dist/demo/coverage');
const now = new Date('2026-10-27T17:00:00Z');
const expiry = days => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
test('coverage: calendar boundaries, missing dates and timezone', () => {
  for (const [days, state] of [[31, 'vigente'], [30, 'por_vencer'], [7, 'por_vencer'], [0, 'por_vencer'], [-1, 'vencida']]) {
    const result = coverageStatus(expiry(days), 'America/Bogota', now);
    assert.equal(result.estado, state); assert.equal(result.diasRestantes, days);
  }
  assert.equal(coverageStatus('', 'America/Bogota', now).estado, 'sin_registrar');
  assert.equal(coverageStatus('2026-02-31', 'America/Bogota', now).estado, 'sin_registrar');
  assert.equal(coverageStatus('2026-10-26', 'America/Bogota', new Date('2026-10-27T02:00:00Z')).diasRestantes, 0);
});
test('coverage: durable notices at 30 and 7 days, renewal and archive retire old alerts', () => {
  const equipment = [{ id: 'e1', nombre: 'Equipo', garantiaVencimiento: expiry(30) }];
  const notices = [];
  syncCoverageNotifications(equipment, notices, 'America/Bogota', now);
  syncCoverageNotifications(equipment, notices, 'America/Bogota', now);
  assert.equal(notices.length, 1);
  notices[0].leida = true;
  syncCoverageNotifications(equipment, notices, 'America/Bogota', now);
  assert.equal(notices[0].leida, true);
  syncCoverageNotifications(equipment, notices, 'America/Bogota', new Date(now.getTime() + 23 * 86400000));
  assert.equal(notices.length, 2); assert.equal(notices[0].leida, false);
  equipment[0].garantiaVencimiento = expiry(100);
  syncCoverageNotifications(equipment, notices, 'America/Bogota', now);
  assert.ok(notices.every(n => n.leida));
  equipment[0].contratoVencimiento = expiry(5); equipment[0].archivado = true;
  syncCoverageNotifications(equipment, notices, 'America/Bogota', now);
  assert.equal(notices.length, 2);
});
test('coverage: filters use the same calculated states', () => {
  const e = { id: 'e1', garantiaVencimiento: expiry(-1), contratoVencimiento: expiry(7) };
  assert.equal(matchesCoverage(e, 'sin_garantia', 'America/Bogota', now), true);
  assert.equal(matchesCoverage(e, 'contratos_por_vencer', 'America/Bogota', now), true);
  assert.equal(matchesCoverage(e, 'vencidos', 'America/Bogota', now), true);
});
