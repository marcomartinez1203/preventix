import ExcelExportButton from './ExcelExportButton';
import type { ExcelReport } from '../../utils/excelReport';
import InteractiveReportChart from './InteractiveReportChart';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import type { ReportePresupuesto } from '../../types';

export default function BudgetReport({ compact = false }: { compact?: boolean }) {
  const query = useQuery<ReportePresupuesto>({ queryKey: ['presupuesto-reporte'], queryFn: () => dashboardApi.presupuesto().then(r => r.data.data) });
  const data = query.data;
  if (query.isLoading) return <section className="card p-5" role="status">Cargando presupuesto anual…</section>;
  if (query.isError || !data) return <section className="card p-5" role="alert">No se pudo cargar el presupuesto. <button className="btn-secondary mt-3" onClick={() => query.refetch()}>Reintentar</button></section>;
  const money = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: data.moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const a = data.anual;
  const excelReport = (): ExcelReport => ({
    title: `Presupuesto ${a.periodo} · ${data.moneda}`, subtitle: 'Costos completados; límites históricos desde su primer registro. Vacío = sin límite.',
    headers: ['Mes', `Gasto (${data.moneda})`, `Presupuesto (${data.moneda})`, `Saldo (${data.moneda})`],
    rows: data.meses.map(m => [m.periodo, m.gasto, m.historialDisponible && m.limite > 0 ? m.limite : null, m.saldo]), moneyColumns: [1, 2, 3],
    highlights: [['Gasto anual', a.gasto], ['Límite anual', a.limite || null], ['Saldo anual', a.saldo], ['Proyección orientativa al cierre', a.proyeccion]],
    charts: [{ title: `Gasto y presupuesto mensual · ${data.moneda}`, categories: data.meses.map(m => m.periodo), series: [{ name: 'Gasto completado', values: data.meses.map(m => m.gasto) }, { name: 'Presupuesto', values: data.meses.map(m => m.historialDisponible && m.limite > 0 ? m.limite : null) }], money: true }],
  });
  return <div className="space-y-5">
    <section className="card p-5 sm:p-6"><h2 className="font-semibold mb-4">Presupuesto anual · {a.periodo}</h2><dl className="text-sm space-y-3 tabular-nums">
      <div className="flex justify-between gap-3"><dt className="text-zinc-400">Gasto acumulado</dt><dd className="text-right">{money(a.gasto)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-zinc-400">Límite anual</dt><dd className="text-right">{a.limite > 0 ? money(a.limite) : 'Sin configurar'}</dd></div>
      {a.saldo !== null && <div className="flex justify-between gap-3"><dt className="text-zinc-400">{a.saldo < 0 ? 'Exceso' : 'Disponible'}</dt><dd className={`text-right ${a.saldo < 0 ? 'text-red-300' : ''}`}>{money(Math.abs(a.saldo))}</dd></div>}
      {a.porcentaje !== null && <div className="flex justify-between gap-3"><dt className="text-zinc-400">Consumido</dt><dd>{a.porcentaje.toLocaleString('es-CO')}%</dd></div>}
      <div className="flex justify-between gap-3 border-t border-line pt-3"><dt className="text-zinc-400">Proyección al cierre</dt><dd className="text-right">{a.proyeccion === null ? 'Sin meses cerrados' : money(a.proyeccion)}</dd></div>
    </dl><details className="text-xs text-zinc-400 mt-3"><summary className="min-h-11 content-center">Sobre la proyección</summary><p>Proyección orientativa: gasto medio de los {a.mesesCerrados} meses cerrados del año × 12, como mínimo el gasto acumulado. Los meses sin gasto cuentan como cero.</p></details>
    {['alerta', 'excedido'].includes(a.estado) && <p role="status" className={`text-sm mt-4 ${a.estado === 'excedido' ? 'text-red-300' : 'text-brand'}`}>{a.estado === 'excedido' ? 'Límite anual superado.' : 'Consumido al menos el 80% del límite anual.'}</p>}
    {compact && <Link to="/reportes?tipo=presupuesto" className="text-link mt-3">Comparar gasto y presupuesto →</Link>}</section>
    {!compact && <section className="card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="font-semibold">Gasto frente a presupuesto · {data.moneda}</h2><ExcelExportButton report={excelReport} filename={`preventix-presupuesto-${a.periodo}`} /></div><InteractiveReportChart framed={false} title="Comparativa mensual" currency={data.moneda} series={[{ key: 'gasto', label: 'Gasto completado', color: '#ffd400' }, { key: 'limite', label: 'Presupuesto', color: '#a1a1aa' }]} rows={data.meses.map(m => ({ label: m.periodo, values: { gasto: m.gasto, limite: m.historialDisponible && m.limite > 0 ? m.limite : null } }))} />
    </section>}
  </div>;
}
