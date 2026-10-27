type Row = { id: string; [key: string]: unknown };
export function equipmentRisk(equipment: Row, failures: Row[], maintenance: Row[], now = new Date()) {
  const elapsed = (value: unknown) => {
    if (!value) return null;
    const ms = new Date(String(value)).getTime();
    return Number.isFinite(ms) && ms <= now.getTime() ? (now.getTime() - ms) / 86400000 : null;
  };
  const recent = failures.filter(f => { const days = elapsed(f.fechaReporte); return days !== null && days <= 90; });
  const severe = recent.filter(f => ['alta', 'critica'].includes(String(f.prioridad))).length;
  const preventive = maintenance.filter(m => m.tipo === 'preventivo' && m.estado === 'completado')
    .map(m => elapsed(m.fechaFin)).filter((d): d is number => d !== null).sort((a, b) => a - b)[0];
  const age = elapsed(equipment.fechaAdquisicion);
  const since = preventive ?? age ?? elapsed(equipment.createdAt);
  const points = (value: number | null, cap: number, weight: number) => value === null ? null : Math.round(Math.min(value / cap, 1) * weight);
  const factores = [
    { nombre: 'Fallas en 90 días', detalle: `${recent.length} registradas; máximo aporte desde 5 fallas.`, puntos: points(recent.length, 5, 40), maximo: 40 },
    { nombre: 'Tiempo sin preventivo', detalle: since === null ? 'Sin fecha de referencia válida.' : `${Math.floor(since)} días ${preventive !== undefined ? 'desde el último preventivo completado' : 'desde la adquisición o registro; sin preventivos completados'}. Máximo aporte a los 180 días.`, puntos: points(since, 180, 30), maximo: 30 },
    { nombre: 'Antigüedad', detalle: age === null ? 'Falta una fecha de adquisición válida.' : `${(age / 365.25).toFixed(1)} años desde la adquisición. Máximo aporte a los 5 años.`, puntos: points(age === null ? null : age / 365.25, 5, 20), maximo: 20 },
    { nombre: 'Fallas graves en 90 días', detalle: `${severe} de prioridad alta o crítica; máximo aporte desde 2 fallas.`, puntos: points(severe, 2, 10), maximo: 10 },
  ];
  const scoreRiesgo = factores.some(f => f.puntos === null) ? null : factores.reduce((sum, f) => sum + (f.puntos ?? 0), 0);
  const nivelRiesgo = scoreRiesgo === null ? 'sin_datos' : scoreRiesgo >= 60 ? 'alto' : scoreRiesgo >= 30 ? 'medio' : 'bajo';
  return { equipoId: equipment.id, nombre: String(equipment.nombre), scoreRiesgo, nivelRiesgo, factores, calculadoEn: now.toISOString() };
}
