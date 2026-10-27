import { monthlyBudget } from './monthlyBudget';
type Row = { id: string; [key: string]: unknown };
type Snapshot = { mensual: number; anual: number; actualizadoEn: string };
const number = (v: unknown) => Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 100) / 100 : 0;
const history = (config: Row) => (config.presupuestoHistorial ??= {}) as Record<string, Snapshot>;
export function recordBudget(config: Row, now = new Date()) {
  const period = monthlyBudget([], 0, String(config.zonaHoraria || 'America/Bogota'), now).periodo;
  const snapshots = history(config);
  const mensual = number(config.presupuestoMensualMantenimiento);
  const anual = number(config.presupuestoAnualMantenimiento);
  if (!snapshots[period] || snapshots[period].mensual !== mensual || snapshots[period].anual !== anual) snapshots[period] = { mensual, anual, actualizadoEn: now.toISOString() };
}
export function budgetReport(records: Row[], config: Row, now = new Date()) {
  const costs = records.map(m => ({ estado: m.estado, fechaFin: m.fechaFin, costo: m.costo }));
  const zone = String(config.zonaHoraria || 'America/Bogota');
  const current = monthlyBudget(costs, number(config.presupuestoMensualMantenimiento), zone, now);
  const [year, month] = current.periodo.split('-').map(Number);
  const snapshots = (config.presupuestoHistorial ?? {}) as Record<string, Snapshot>;
  const keys = Object.keys(snapshots).sort();
  const meses = Array.from({ length: month }, (_, index) => {
    const reference = new Date(Date.UTC(year, index, 15, 12));
    const period = reference.toISOString().slice(0, 7);
    const key = keys.filter(k => k <= period).pop();
    const limit = key ? number(snapshots[key].mensual) : 0;
    return { ...monthlyBudget(costs, limit, zone, reference), historialDisponible: !!key };
  });
  const cents = meses.reduce((sum, m) => sum + Math.round(m.gasto * 100), 0);
  const limit = Math.round(number(config.presupuestoAnualMantenimiento) * 100);
  const closed = meses.slice(0, -1);
  const closedCents = closed.reduce((sum, m) => sum + Math.round(m.gasto * 100), 0);
  const proyeccion = closed.length ? Math.max(cents, Math.round(closedCents / closed.length * 12)) / 100 : null;
  return { moneda: String(config.moneda || 'COP'), mes: current, meses,
    anual: { periodo: String(year), gasto: cents / 100, limite: limit / 100, saldo: limit ? (limit - cents) / 100 : null, porcentaje: limit ? Math.round(cents / limit * 1000) / 10 : null, estado: !limit ? 'sin_configurar' : cents > limit ? 'excedido' : cents >= limit * .8 ? 'alerta' : 'normal', proyeccion, mesesCerrados: closed.length } };
}
export function syncBudgetNotifications(records: Row[], config: Row, notifications: Row[], now = new Date()) {
  recordBudget(config, now);
  const report = budgetReport(records, config, now);
  const valid = new Set<string>();
  for (const [kind, budget] of [['mensual', report.mes], ['anual', report.anual]] as const) {
    if (!['alerta', 'excedido'].includes(budget.estado)) continue;
    const stage = budget.estado === 'excedido' ? '100' : '80';
    const id = `presupuesto:${kind}:${budget.periodo}:${budget.limite}:${stage}`;
    valid.add(id);
    if (!notifications.some(n => n.id === id)) notifications.unshift({ id, tipo: 'presupuesto', titulo: budget.estado === 'excedido' ? `Presupuesto ${kind} superado` : `Presupuesto ${kind}: consumo desde el 80%`, mensaje: `${budget.periodo} · Gasto ${budget.gasto} / límite ${budget.limite} ${report.moneda}.`, leida: false, createdAt: now.toISOString() });
  }
  notifications.forEach(n => { if (n.tipo === 'presupuesto' && !valid.has(n.id)) n.leida = true; });
}
