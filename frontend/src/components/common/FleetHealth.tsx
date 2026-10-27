import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import type { SaludEquipos } from '../../types';

const labels = { sin_equipos: 'Sin equipos registrados', favorable: 'Estado favorable', atencion: 'Requiere atención', prioritario: 'Atención prioritaria' };
const decimal = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 1 });
const monthLabel = (value: string) => new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${value}-15T12:00:00Z`));

function Trends({ data }: { data: SaludEquipos }) {
  const rows = data.tendencias;
  const top = Math.max(2, Math.ceil(Math.max(...rows.flatMap(r => [r.reportadas, r.resueltas]), 0) / 2) * 2);
  const x = (i: number) => 40 + i * 55;
  const y = (value: number) => 140 - value / top * 110;
  const points = (key: 'reportadas' | 'resueltas') => rows.map((r, i) => `${x(i)},${y(r[key])}`).join(' ');
  const maxCost = Math.max(...rows.map(r => r.costo), 1);
  const currency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: data.moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return <div className="space-y-6 mt-4">
    <section aria-label="Tendencia de fallas"><h3 className="text-sm font-medium">Fallas reportadas y resueltas</h3>
      <div className="flex flex-wrap gap-4 text-xs text-zinc-300 mt-3"><span className="inline-flex items-center gap-2"><span className="w-5 h-0.5 bg-brand" />Reportadas</span><span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-zinc-300" />Resueltas</span></div>
      <svg viewBox="0 0 350 175" role="img" aria-label="Fallas por mes. Los valores exactos están en la tabla debajo." className="w-full mt-3">
        {[0, top / 2, top].map(tick => <g key={tick}><line x1="40" x2="315" y1={y(tick)} y2={y(tick)} stroke="#343434" /><text x="29" y={y(tick) + 4} textAnchor="end" fill="#b4b4b4" fontSize="11">{tick}</text></g>)}
        <polyline points={points('reportadas')} fill="none" stroke="#ffd400" strokeWidth="2" />
        <polyline points={points('resueltas')} fill="none" stroke="#d4d4d4" strokeWidth="2" strokeDasharray="5 4" />
        {rows.map((r, i) => <text key={r.mes} x={x(i)} y="162" textAnchor="middle" fill="#b4b4b4" fontSize="10">{monthLabel(r.mes)}</text>)}
      </svg>
      <div className="overflow-x-auto"><table className="w-full text-xs tabular-nums"><caption className="sr-only">Valores de fallas en los últimos seis meses</caption><thead><tr><th className="text-left py-2">Mes</th><th className="text-right">Reportadas</th><th className="text-right">Resueltas</th></tr></thead><tbody>{rows.map(r => <tr key={r.mes} className="border-t border-line"><th scope="row" className="text-left py-2 font-normal">{monthLabel(r.mes)}</th><td className="text-right">{r.reportadas}</td><td className="text-right">{r.resueltas}</td></tr>)}</tbody></table></div>
    </section>
    <section aria-label="Tendencia de costos"><h3 className="text-sm font-medium mb-3">Costo de mantenimientos completados · {data.moneda}</h3><ul className="space-y-3">{rows.map(r => <li key={r.mes}><div className="flex justify-between gap-3 text-xs tabular-nums mb-1"><span className="text-zinc-400">{monthLabel(r.mes)}</span><span>{currency(r.costo)}</span></div><div className="h-1.5 bg-raised" aria-hidden="true"><div className="h-full bg-brand" style={{ width: `${r.costo / maxCost * 100}%` }} /></div></li>)}</ul></section>
    <p className="text-xs text-zinc-400">Historial de toda la organización, incluidos equipos archivados. Fallas por fecha de reporte o resolución; costos por fecha de finalización. El mes actual está en curso. No son saldos históricos de fallas abiertas.</p>
  </div>;
}

export default function FleetHealth() {
  const query = useQuery<SaludEquipos>({ queryKey: ['salud-parque'], queryFn: () => dashboardApi.salud().then(r => r.data.data) });
  const data = query.data;
  return <section className="card p-5 sm:p-6">
    <h2 className="font-semibold">Estado general de los equipos</h2>
    {query.isLoading ? <p role="status" className="text-sm text-zinc-400 mt-4">Calculando estado general…</p> : query.isError ? <div role="alert" className="mt-4 text-sm"><p>No se pudo cargar el estado general.</p><button className="btn-secondary mt-3" onClick={() => query.refetch()}>Reintentar</button></div> : data && <>
      <div className="fleet-status flex flex-wrap items-center justify-between gap-3 mt-2"><p className={data.estado === 'prioritario' ? 'text-red-300' : data.estado === 'atencion' ? 'text-brand' : 'text-zinc-200'}>{labels[data.estado]}</p><p className="text-3xl tabular-nums font-medium">{data.indice === null ? '—' : decimal(data.indice)}<span className="text-sm text-zinc-400"> /100</span></p></div>
      <p className="text-xs text-zinc-400 mt-2">{data.totalEquipos} equipos · índice operativo</p>
      {data.indice === null ? <Link to="/equipos" className="text-link mt-3">Registrar equipos →</Link> : <>
        <div role="meter" aria-label="Índice de estado general" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.indice} className="h-2 bg-raised rounded-full overflow-hidden mt-4"><div className="h-full bg-brand" style={{ width: `${data.indice}%` }} /></div>
        <details className="mt-3"><summary className="text-sm text-zinc-300 min-h-11 content-center">Ver desglose</summary><dl className="fleet-factors mt-3">{data.factores.map(f => <div key={f.nombre} className="flex justify-between gap-4 text-sm"><dt className="text-zinc-300">{f.nombre}<span className="block text-xs text-zinc-400">{f.cantidad} de {f.total} equipos</span></dt><dd className="text-right tabular-nums shrink-0">{decimal(f.puntos ?? 0)}<span className="text-xs text-zinc-400"> / {f.peso} puntos</span></dd></div>)}</dl></details>
        <div className="flex flex-wrap gap-x-4 mt-3"><Link to="/fallas" className="text-link">Revisar fallas ({data.equiposConFallas} equipos)</Link><Link to="/mantenimientos" className="text-link">Revisar mantenimiento</Link></div>
      </>}
      <details className="text-xs text-zinc-400 mt-2"><summary className="min-h-11 content-center">Cómo se calcula</summary><p className="leading-relaxed">40 puntos por la proporción de equipos activos, 20 por equipos sin fallas abiertas o en proceso y 40 por equipos con un preventivo completado en los últimos 90 días y sin preventivos vencidos. Sin historial preventivo no se suman esos puntos. Cada aporte se redondea a un decimal y se suma. Favorable: 80–100; requiere atención: 60–79,9; atención prioritaria: menos de 60. No mide disponibilidad histórica.</p></details>
      <details className="border-t border-line mt-2 pt-1"><summary className="text-sm font-medium min-h-11 content-center">Ver tendencias de seis meses</summary><Trends data={data} /></details>
    </>}
  </section>;
}
