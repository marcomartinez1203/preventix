import ExcelExportButton from '../../components/common/ExcelExportButton';
import { countChart, type ExcelReport } from '../../utils/excelReport';
import ReportCharts from '../../components/common/ReportCharts';
import BudgetReport from '../../components/common/BudgetReport';
import { useSearchParams } from 'react-router-dom';
import CoverageReport from '../../components/common/CoverageReport';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { equiposApi, fallasApi, mantenimientosApi } from '../../api';
import type { Equipo, Falla, Mantenimiento } from '../../types';
import Pagination, { usePagination } from '../../components/common/Pagination';

export default function ReportesPage() {
  const [searchParams] = useSearchParams();
  const [tipo, setTipo] = useState(searchParams.get('tipo') === 'presupuesto' ? 'presupuesto' : 'equipos');
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
  const excelReport = (): ExcelReport => {
    const charts = tipo === 'equipos'
      ? [countChart('Equipos por estado', (query.data?.equipos ?? []).map(e => e.estado.replaceAll('_', ' '))), countChart('Tipos de dispositivo', (query.data?.equipos ?? []).map(e => e.tipo))]
      : tipo === 'mantenimientos'
      ? [countChart('Mantenimientos por estado', mant.map(m => m.estado.replaceAll('_', ' '))), countChart('Tipos de mantenimiento', mant.map(m => m.tipo))]
      : [countChart('Fallas por categoría', fallas.map(f => f.categoria)), countChart('Fallas por estado', fallas.map(f => f.estado.replaceAll('_', ' ')))];
    if (tipo === 'mantenimientos') charts.push({ title: 'Costo por tipo (sin cancelados)', categories: ['Preventivo', 'Correctivo'], series: [{ name: 'Costo registrado', values: ['preventivo', 'correctivo'].map(type => Math.round(mant.filter(m => m.tipo === type && m.estado !== 'cancelado').reduce((sum, m) => sum + Math.round(Number(m.costo ?? 0) * 100), 0)) / 100) }], money: true });
    if (tipo === 'fallas') {
      const chart = countChart('Equipos con más fallas · diez primeros', fallas.map(f => `${f.equipo.nombre} (${f.equipo.id})`));
      const top = chart.categories.map((label, i) => ({ label, value: chart.series[0].values[i] ?? 0 })).sort((a, b) => b.value - a.value).slice(0, 10);
      charts.push({ ...chart, categories: top.map(r => r.label), series: [{ name: 'Fallas', values: top.map(r => r.value) }] });
    }
    return { title: `Reporte de ${tipo}`, subtitle: `${desde || 'Inicio'} — ${hasta || 'Actualidad'} · ${tipo === 'equipos' ? 'Inventario actual; fechas aplicadas a fallas y mantenimientos' : tipo === 'mantenimientos' ? 'Por fecha programada; costos incluyen estimaciones' : 'Por fecha de reporte'}`, headers, rows, charts, moneyColumns: tipo === 'mantenimientos' ? [4] : [], highlights: [['Registros exportados', rows.length], ...(tipo === 'mantenimientos' ? [['Costo sin cancelados', mant.filter(m => m.estado !== 'cancelado').reduce((sum, m) => sum + Number(m.costo ?? 0), 0)]] as [string, number][] : [])] };
  };
  if (tipo === 'presupuesto') return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-bold">Control de presupuesto</h1><button className="btn-secondary" onClick={() => setTipo('equipos')}>Volver a reportes</button></header><BudgetReport /></div>;
  if (tipo === 'coberturas') return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">Garantías y contratos</h1><p className="text-sm text-zinc-400 mt-1">Vencimientos y proveedores de soporte.</p></div><button className="btn-secondary" onClick={() => setTipo('equipos')}>Volver a reportes</button></header><CoverageReport /></div>;
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Reportes</h1><p className="text-zinc-400 text-sm">Consulta tu inventario, costos y fallas recurrentes.</p></div><ExcelExportButton report={excelReport} filename={`preventix-${tipo}`} disabled={!rows.length || query.isLoading || query.isError} /></div>
    <div className="card p-4 flex flex-wrap gap-4"><label className="label">Reporte<select className="input mt-1" value={tipo} onChange={e => setTipo(e.target.value)}><option value="equipos">Equipos</option><option value="presupuesto">Presupuesto mensual y anual</option><option value="coberturas">Garantías y contratos</option><option value="mantenimientos">Mantenimientos</option><option value="fallas">Fallas por equipo y categoría</option></select></label><label className="label">Desde<input className="input mt-1" type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label className="label">Hasta<input className="input mt-1" type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label><button className="text-sm text-brand" onClick={() => { setDesde(''); setHasta(''); }}>Limpiar fechas</button></div>
    {!valid && <p role="alert" className="text-red-400">La fecha inicial no puede ser posterior a la final.</p>}
    <p className="text-sm text-zinc-400">El rango filtra la fecha de reporte de fallas y la fecha programada de mantenimientos. El inventario incluye todos los equipos sin archivar.</p>
    {tipo === 'mantenimientos' && <div className="card p-5"><p className="text-sm text-zinc-400">Costo acumulado del período (incluye estimaciones, excluye cancelados)</p><p className="text-2xl font-bold">{mant.filter(m => m.estado !== 'cancelado').reduce((sum, m) => sum + Number(m.costo ?? 0), 0).toLocaleString('es-CO')}</p></div>}
    {valid && !query.isLoading && !query.isError && <ReportCharts key={`${tipo}-${desde}-${hasta}`} tipo={tipo} equipos={query.data?.equipos ?? []} fallas={fallas} mantenimientos={mant} />}
    <div className="card overflow-x-auto">{query.isLoading ? <p className="p-6">Cargando reporte…</p> : query.isError ? <p role="alert" className="p-6">No se pudo cargar el reporte. <button onClick={() => query.refetch()} className="text-brand">Reintentar</button></p> : <table className="w-full text-sm"><thead className="bg-ink"><tr>{headers.map(h => <th scope="col" key={h} className="p-4 text-left text-zinc-400">{h}</th>)}</tr></thead><tbody>{pagination.visible.map((row, i) => <tr key={i} className="border-t border-zinc-800">{row.map((cell, j) => <td className="p-4" key={j}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="p-8 text-center text-zinc-400">No hay resultados para estos filtros.</td></tr>}</tbody></table>}</div><Pagination {...pagination} />
  </div>;
}
