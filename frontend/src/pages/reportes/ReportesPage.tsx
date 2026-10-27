import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { equiposApi, fallasApi, mantenimientosApi } from '../../api';
import type { Equipo, Falla, Mantenimiento } from '../../types';
import Pagination, { usePagination } from '../../components/common/Pagination';

export default function ReportesPage() {
  const [tipo, setTipo] = useState('equipos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const query = useQuery({ queryKey: ['reportes'], queryFn: async () => {
    const [e, f, m] = await Promise.all([equiposApi.listar(), fallasApi.listar(), mantenimientosApi.listar()]);
    return { equipos: e.data.data as Equipo[], fallas: f.data.data as Falla[], mantenimientos: m.data.data as Mantenimiento[] };
  } });
  const valid = !desde || !hasta || desde <= hasta;
  const inRange = (date: string) => { const d = new Date(date); const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return valid && (!desde || local >= desde) && (!hasta || local <= hasta); };
  const fallas = query.data?.fallas.filter(f => inRange(f.fechaReporte)) ?? [];
  const mant = query.data?.mantenimientos.filter(m => inRange(m.fechaProgramada)) ?? [];
  const headers = tipo === 'equipos' ? ['Equipo', 'Tipo', 'Estado', 'Fallas', 'Mantenimientos'] : tipo === 'mantenimientos' ? ['Mantenimiento', 'Equipo', 'Fecha', 'Estado', 'Costo'] : ['Equipo', 'Categoría', 'Total de fallas', 'Pendientes'];
  const groups = new Map<string, { nombre: string; categoria: string; total: number; pendientes: number }>();
  fallas.forEach(f => { const key = `${f.equipo.id}-${f.categoria}`; const g = groups.get(key) ?? { nombre: f.equipo.nombre, categoria: f.categoria, total: 0, pendientes: 0 }; g.total++; if (['abierta', 'en_proceso'].includes(f.estado)) g.pendientes++; groups.set(key, g); });
  const rows: (string | number)[][] = !valid ? [] : tipo === 'equipos' ? (query.data?.equipos ?? []).map(e => [e.nombre, e.tipo, e.estado.replaceAll('_', ' '), fallas.filter(f => f.equipo.id === e.id).length, mant.filter(m => m.equipo.id === e.id).length]) : tipo === 'mantenimientos' ? mant.map(m => [m.titulo, m.equipo.nombre, new Date(m.fechaProgramada).toLocaleDateString('es-CO'), m.estado.replaceAll('_', ' '), Number(m.costo ?? 0)]) : [...groups.values()].map(g => [g.nombre, g.categoria, g.total, g.pendientes]);
  const pagination = usePagination(rows, `${tipo}-${desde}-${hasta}`);
  const exportCsv = () => {
    const cell = (v: string | number) => `"${String(v).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `preventix-${tipo}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Reportes</h1><p className="text-zinc-400 text-sm">Consulta tu inventario, costos y fallas recurrentes.</p></div><button className="btn-primary" disabled={!rows.length || query.isLoading} onClick={exportCsv}>Exportar CSV para Excel</button></div>
    <div className="card p-4 flex flex-wrap gap-4"><label className="label">Reporte<select className="input mt-1" value={tipo} onChange={e => setTipo(e.target.value)}><option value="equipos">Equipos</option><option value="mantenimientos">Mantenimientos</option><option value="fallas">Fallas por equipo y categoría</option></select></label><label className="label">Desde<input className="input mt-1" type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label className="label">Hasta<input className="input mt-1" type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label><button className="text-sm text-brand" onClick={() => { setDesde(''); setHasta(''); }}>Limpiar fechas</button></div>
    {!valid && <p role="alert" className="text-red-400">La fecha inicial no puede ser posterior a la final.</p>}
    <p className="text-sm text-zinc-400">El rango filtra la fecha de reporte de fallas y la fecha programada de mantenimientos. El inventario incluye todos los equipos sin archivar.</p>
    {tipo === 'mantenimientos' && <div className="card p-5"><p className="text-sm text-zinc-400">Costo acumulado del período (incluye estimaciones, excluye cancelados)</p><p className="text-2xl font-bold">{mant.filter(m => m.estado !== 'cancelado').reduce((sum, m) => sum + Number(m.costo ?? 0), 0).toLocaleString('es-CO')}</p></div>}
    <div className="card overflow-x-auto">{query.isLoading ? <p className="p-6">Cargando reporte…</p> : query.isError ? <p role="alert" className="p-6">No se pudo cargar el reporte. <button onClick={() => query.refetch()} className="text-brand">Reintentar</button></p> : <table className="w-full text-sm"><thead className="bg-ink"><tr>{headers.map(h => <th scope="col" key={h} className="p-4 text-left text-zinc-400">{h}</th>)}</tr></thead><tbody>{pagination.visible.map((row, i) => <tr key={i} className="border-t border-zinc-800">{row.map((cell, j) => <td className="p-4" key={j}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="p-8 text-center text-zinc-400">No hay resultados para estos filtros.</td></tr>}</tbody></table>}</div><Pagination {...pagination} />
  </div>;
}
