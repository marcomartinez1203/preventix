interface CostRecord { estado?: unknown; fechaFin?: unknown; costo?: unknown }
export function monthlyBudget(records: CostRecord[], limit: number, zone = 'America/Bogota', now = new Date()) {
  let formatter: Intl.DateTimeFormat;
  try { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit' }); }
  catch { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }); }
  const month = (date: Date) => { const parts = formatter.formatToParts(date); return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`; };
  const periodo = month(now);
  const completed = records.filter(record => {
    const date = new Date(String(record.fechaFin ?? ''));
    return record.estado === 'completado' && Number.isFinite(date.getTime()) && month(date) === periodo;
  });
  const cents = completed.reduce((sum, record) => {
    const cost = Number(record.costo ?? 0);
    return sum + (Number.isFinite(cost) && cost > 0 ? Math.round(cost * 100) : 0);
  }, 0);
  const budget = Number.isFinite(limit) && limit > 0 ? Math.round(limit * 100) : 0;
  return { periodo, completados: completed.length, gasto: cents / 100, limite: budget / 100,
    saldo: budget ? (budget - cents) / 100 : null,
    porcentaje: budget ? Math.round(cents / budget * 1000) / 10 : null,
    estado: !budget ? 'sin_configurar' : cents > budget ? 'excedido' : cents >= budget * .8 ? 'alerta' : 'normal' };
}
