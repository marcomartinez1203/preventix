import { monthlyBudget } from './monthlyBudget';
type Row = { id: string; [key: string]: unknown };

/** Operational indicator. Missing maintenance history earns no preventive coverage. */
export function fleetHealth(equipment: Row[], failures: Row[], maintenance: Row[], zone = 'America/Bogota', currency = 'COP', now = new Date()) {
  let formatter: Intl.DateTimeFormat;
  try { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }); }
  const day = (value: unknown): string => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(String(value ?? ''));
    if (!Number.isFinite(date.getTime())) return '';
    const parts = formatter.formatToParts(date);
    return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
  };
  const today = day(now.toISOString());
  const current = equipment.filter(e => !e.archivado && e.estado !== 'archivado');
  const ids = new Set(current.map(e => e.id));
  const affected = new Set(failures.filter(f => ids.has(String(f.equipoId)) && ['abierta', 'en_proceso'].includes(String(f.estado))).map(f => f.equipoId));
  const covered = current.filter(e => {
    const tasks = maintenance.filter(m => m.equipoId === e.id && m.tipo === 'preventivo');
    const overdue = tasks.some(m => m.estado === 'vencido' || (['programado', 'en_proceso'].includes(String(m.estado)) && day(m.fechaProgramada) && day(m.fechaProgramada) < today));
    return !overdue && tasks.some(m => {
      const completed = new Date(String(m.fechaFin ?? '')).getTime();
      const days = (now.getTime() - completed) / 86400000;
      return m.estado === 'completado' && Number.isFinite(days) && days >= 0 && days <= 90;
    });
  }).length;
  const total = current.length;
  const active = current.filter(e => e.estado === 'activo').length;
  const factors = [
    { nombre: 'Equipos activos', cantidad: active, total, peso: 40 },
    { nombre: 'Sin fallas pendientes', cantidad: total - affected.size, total, peso: 20 },
    { nombre: 'Preventivo reciente y sin vencidos', cantidad: covered, total, peso: 40 },
  ].map(f => ({ ...f, puntos: total ? Math.round(f.cantidad / total * f.peso * 10) / 10 : null }));
  const indice = total ? Math.round(factors.reduce((sum, f) => sum + (f.puntos ?? 0), 0) * 10) / 10 : null;
  const [year, month] = today.split('-').map(Number);
  const trends = Array.from({ length: 6 }, (_, i) => {
    const reference = new Date(Date.UTC(year, month - 1 - 5 + i, 15, 12));
    const key = reference.toISOString().slice(0, 7);
    const costs = monthlyBudget(maintenance.map(m => ({ estado: m.estado, fechaFin: m.fechaFin, costo: m.costo })), 0, zone, reference);
    return { mes: key,
      reportadas: failures.filter(f => day(f.fechaReporte).slice(0, 7) === key).length,
      resueltas: failures.filter(f => ['resuelta', 'cerrada'].includes(String(f.estado)) && day(f.fechaResolucion).slice(0, 7) === key).length,
      costo: costs.gasto };
  });
  return { indice, estado: indice === null ? 'sin_equipos' : indice >= 80 ? 'favorable' : indice >= 60 ? 'atencion' : 'prioritario', totalEquipos: total, equiposConFallas: affected.size, equiposSinPreventivoReciente: total - covered, factores: factors, tendencias: trends, moneda: currency, calculadoEn: now.toISOString() };
}
