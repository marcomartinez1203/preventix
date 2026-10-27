type Row = { id: string; [key: string]: unknown };
export function coverageStatus(expiry: unknown, zone = 'America/Bogota', now = new Date()) {
  const fecha = typeof expiry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : '';
  if (!fecha || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) return { fecha: null, diasRestantes: null, estado: 'sin_registrar' };
  let today: string;
  try { today = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
  catch { today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
  const diasRestantes = Math.round((Date.parse(fecha) - Date.parse(today)) / 86400000);
  return { fecha, diasRestantes, estado: diasRestantes < 0 ? 'vencida' : diasRestantes <= 30 ? 'por_vencer' : 'vigente' };
}
export function equipmentCoverage(equipment: Row, zone: string, now = new Date()) {
  return { garantia: coverageStatus(equipment.garantiaVencimiento, zone, now), contrato: coverageStatus(equipment.contratoVencimiento, zone, now) };
}
export function matchesCoverage(equipment: Row, filter: string, zone: string, now = new Date()) {
  const { garantia, contrato } = equipmentCoverage(equipment, zone, now);
  if (filter === 'sin_garantia') return ['sin_registrar', 'vencida'].includes(garantia.estado);
  if (filter === 'contratos_por_vencer') return contrato.estado === 'por_vencer';
  if (filter === 'por_vencer') return [garantia, contrato].some(c => c.estado === 'por_vencer');
  if (filter === 'vencidos') return [garantia, contrato].some(c => c.estado === 'vencida');
  return !filter;
}

/** Called while consulting notifications; deterministic keys make file/Blob retries idempotent. */
export function syncCoverageNotifications(equipment: Row[], notifications: Row[], zone: string, now = new Date()) {
  const current = new Set<string>();
  for (const e of equipment.filter(e => !e.archivado && e.estado !== 'archivado')) {
    const coverage = equipmentCoverage(e, zone, now);
    for (const kind of ['garantia', 'contrato'] as const) {
      const c = coverage[kind];
      if (c.diasRestantes === null || c.diasRestantes > 30) continue;
      const stage = c.diasRestantes < 0 ? 'vencido' : c.diasRestantes <= 7 ? '7' : '30';
      const id = `cobertura:${e.id}:${kind}:${c.fecha}:${stage}`;
      current.add(id);
      if (notifications.some(n => n.id === id)) continue;
      const label = kind === 'garantia' ? 'Garantía' : 'Contrato de soporte';
      notifications.unshift({ id, tipo: 'cobertura', referenciaId: e.id, referenciaTipo: 'equipo', titulo: `${label}: ${stage === 'vencido' ? 'vencimiento superado' : stage === '7' ? 'vence en 7 días o menos' : 'vence en 30 días o menos'}`, mensaje: `${e.nombre} · Fecha de vencimiento: ${c.fecha}.`, leida: false, createdAt: now.toISOString() });
    }
  }
  for (const n of notifications) if (n.tipo === 'cobertura' && !current.has(n.id)) n.leida = true;
}
