import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import type { RiesgoEquipo } from '../../types';

const labels = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo', sin_datos: 'Datos incompletos' };
const colors = { alto: 'text-red-300', medio: 'text-brand', bajo: 'text-zinc-200', sin_datos: 'text-zinc-400' };
export default function EquipmentRisk({ equipoId }: { equipoId?: string }) {
  const query = useQuery<RiesgoEquipo[]>({ queryKey: ['riesgo-equipos'], queryFn: () => dashboardApi.riesgos().then(r => r.data.data) });
  const rows = equipoId ? query.data?.filter(r => r.equipoId === equipoId) : query.data?.slice(0, 5);
  return <section className="card p-5 sm:p-6">
    <h2 className="font-semibold mb-2">{equipoId ? 'Riesgo del equipo' : 'Prioridad por riesgo'}</h2>
    <details className="text-xs text-zinc-400 mb-4"><summary className="min-h-11 content-center">Cómo se mide</summary><p>Puntuación por reglas, no probabilidad de falla. Bajo: 0–29; medio: 30–59; alto: 60–100.</p></details>
    {query.isLoading ? <p role="status" className="text-sm">Calculando riesgo…</p> : query.isError ? <div role="alert" className="text-sm">No se pudo cargar el riesgo. <button className="btn-secondary mt-3" onClick={() => query.refetch()}>Reintentar</button></div> : !rows?.length ? <p className="text-sm text-zinc-400">{equipoId ? 'No se evalúan equipos archivados.' : 'No hay equipos para evaluar.'}</p> : <ul className="divide-y divide-line">{rows.map(row => <li key={row.equipoId} className="py-3 first:pt-0 last:pb-0">
      <div className="flex justify-between items-start gap-3"><Link to={`/equipos/${row.equipoId}`} className="text-sm font-medium hover:underline">{row.nombre}</Link><span className={`text-sm text-right shrink-0 ${colors[row.nivelRiesgo]}`}>{labels[row.nivelRiesgo]}{row.scoreRiesgo !== null && <span className="block text-xs tabular-nums mt-1">{row.scoreRiesgo}/100</span>}</span></div>
      {equipoId ? <ul className="space-y-4 mt-5">{row.factores.map(f => <li key={f.nombre}><div className="flex justify-between gap-4 text-sm"><span>{f.nombre}</span><span className="tabular-nums shrink-0">{f.puntos === null ? 'Sin datos' : `${f.puntos}/${f.maximo} puntos`}</span></div><p className="text-xs text-zinc-400 mt-1">{f.detalle}</p></li>)}</ul> : null}
    </li>)}</ul>}
    {equipoId && <p className="text-xs text-zinc-400 mt-5">Usa «Sugerir mantenimiento» para revisar una fecha antes de programar. Las fechas faltantes no se interpretan como riesgo bajo.</p>}
  </section>;
}
