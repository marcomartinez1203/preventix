export interface MaintenanceInput {
  tipo?: unknown; estado?: unknown; fechaFin?: unknown; fechaProgramada?: unknown; id: string;
}
export function calendarDay(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : '';
}

/** A transparent scheduling rule, not a probability of failure. */
export function suggestMaintenance(equipment: { fechaAdquisicion?: unknown; createdAt?: unknown }, failures: number, maintenance: MaintenanceInput[], now = new Date()) {
  const today = calendarDay(now);
  const start = new Date(String(equipment.fechaAdquisicion || equipment.createdAt));
  const period = Math.max(1, (now.getTime() - start.getTime()) / 86_400_000);
  const mtbfDays = failures > 0 && Number.isFinite(period) ? Math.round(period / failures) : null;
  const sufficient = failures >= 2 && mtbfDays !== null;
  const interval = sufficient ? mtbfDays < 30 ? 15 : mtbfDays < 90 ? 30 : 60 : 30;
  const completed = maintenance.filter(m => m.tipo === 'preventivo' && m.estado === 'completado')
    .map(m => calendarDay(String(m.fechaFin ?? ''))).filter(d => d && d <= today).sort().pop();
  const acquisition = calendarDay(String(equipment.fechaAdquisicion || equipment.createdAt));
  const base = completed || (acquisition && acquisition <= today ? acquisition : today);
  const next = new Date(`${base}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + interval);
  const target = next.toISOString().slice(0, 10);
  const pending = maintenance.find(m => m.tipo === 'preventivo' && ['programado', 'en_proceso', 'vencido'].includes(String(m.estado)));
  const daysUntil = Math.round((Date.parse(target) - Date.parse(today)) / 86400000);
  return {
    recomendado: !pending && daysUntil <= 7, diasHastaRevision: daysUntil,
    frecuenciaDias: interval, mtbfDias: mtbfDays, totalFallas: failures,
    fechaProgramada: target < today ? today : target,
    fechaBase: base, base: completed ? 'Último preventivo completado' : 'Adquisición o registro del equipo',
    justificacion: sufficient ? `MTBF estimado de ${mtbfDays} días con ${failures} fallas registradas. Se recomienda una revisión cada ${interval} días.` : 'Hay menos de dos fallas o falta una fecha válida. Se propone una revisión inicial cada 30 días, sin inferir una frecuencia de fallas.',
    atrasado: target < today,
    pendiente: pending ? { id: pending.id, estado: String(pending.estado), fechaProgramada: String(pending.fechaProgramada) } : null,
  };
}
