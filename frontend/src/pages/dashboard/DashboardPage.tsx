import DeviceOverview from '../../components/common/DeviceOverview';
import BudgetReport from '../../components/common/BudgetReport';
import FleetHealth from '../../components/common/FleetHealth';
import EquipmentRisk from '../../components/common/EquipmentRisk';
import MonthlyBudget from '../../components/common/MonthlyBudget';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowRight, Plus, AlertCircle } from 'lucide-react';
import { dashboardApi } from '../../api';
import { SkeletonCard } from '../../components/common/Skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { DashboardResumen, Mantenimiento } from '../../types';

const number = new Intl.NumberFormat('es-CO');
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function LoadError({ children, retry }: { children: React.ReactNode; retry: () => void }) {
  return <div role="alert" className="panel-message"><p>{children}</p><button className="btn-secondary mt-3" onClick={retry}>Reintentar</button></div>;
}

export default function DashboardPage() {
  const summary = useQuery<DashboardResumen>({ queryKey: ['dashboard-resumen'], queryFn: () => dashboardApi.resumen().then(r => r.data.data ?? r.data) });
  const upcoming = useQuery<Mantenimiento[]>({ queryKey: ['mantenimientos-proximos'], queryFn: () => dashboardApi.mantenimientosProximos().then(r => r.data.data ?? r.data) });
  const recurring = useQuery<{ equipoId: string; nombre: string; totalFallas: number }[]>({ queryKey: ['equipos-recurrentes'], queryFn: () => dashboardApi.equiposRecurrentes().then(r => r.data.data ?? r.data) });
  const data = summary.data;
  const ranking = [...(recurring.data ?? [])].sort((a, b) => b.totalFallas - a.totalFallas).slice(0, 4);
  const maxFailures = Math.max(1, ...ranking.map(e => e.totalFallas));
  const tasks = [...(upcoming.data ?? [])].sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime()).slice(0, 5);
  const overdue = data?.mantenimientosVencidos ?? 0;
  const metrics = data ? [
    { label: 'Equipos registrados', value: data.totalEquipos, detail: `${number.format(data.equiposActivos)} activos`, to: '/equipos' },
    { label: 'Fallas pendientes', value: data.fallasPendientes, detail: 'Por resolver', to: '/fallas', attention: data.fallasPendientes > 0 },
    { label: 'Tareas vencidas', value: overdue, detail: overdue ? 'Requieren atención' : 'Sin tareas vencidas', to: '/mantenimientos?estado=vencido', attention: overdue > 0 },
    { label: 'Completados este mes', value: data.mantenimientosCompletadosMes, detail: format(new Date(), 'MMMM yyyy', { locale: es }), to: '/mantenimientos?estado=completado' },
  ] : [];

  return <div className="overview space-y-6">
    <header className="page-heading flex flex-wrap items-end justify-between gap-4">
      <div><h1>Centro de mantenimiento</h1><p className="text-sm text-zinc-400 mt-2">{data ? overdue ? `${number.format(overdue)} tareas vencidas necesitan tu atención.` : 'Sin mantenimientos vencidos. Consulta la próxima revisión.' : 'Inventario, tareas y seguimiento de fallas.'}</p></div>
      <Link to="/mantenimientos" className="btn-primary inline-flex items-center gap-2 text-sm"><Plus size={16} /> Gestionar tareas</Link>
    </header>

    {summary.isError ? <LoadError retry={() => { void summary.refetch(); }}>No se pudo cargar el resumen.</LoadError> : summary.isLoading ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}</div> : <dl className="metric-strip">
      {metrics.map(metric => <div key={metric.label} className="metric-cell"><dt><Link to={metric.to}>{metric.label}<ArrowUpRight size={14} aria-hidden="true" /></Link></dt><dd className={metric.attention ? 'metric-value text-brand' : 'metric-value'}>{number.format(metric.value)}</dd><dd className="metric-detail">{metric.detail}</dd></div>)}
    </dl>}

    {/* At 1440: 240 sidebar + 56 gutters + 24 gap + 760 main + 360 rail = 1440. */}
    <div className="overview-grid">
      <div className="space-y-6 min-w-0"><DeviceOverview /><FleetHealth /><section className="card agenda-panel">
        <div className="panel-heading"><div><h2>Agenda de mantenimiento</h2><p>Próximas revisiones de tus equipos</p></div><Link to="/mantenimientos" className="text-link">Ver todas <ArrowUpRight size={15} /></Link></div>
        {overdue > 0 && <Link to="/mantenimientos?estado=vencido" className="attention-row"><AlertCircle size={17} aria-hidden="true" /><span>{number.format(overdue)} tareas fuera de plazo</span><ArrowRight size={17} aria-hidden="true" /></Link>}
        {upcoming.isError ? <LoadError retry={() => { void upcoming.refetch(); }}>No se pudo cargar la agenda.</LoadError> : upcoming.isLoading ? <div className="p-6 space-y-4" aria-label="Cargando agenda">{[0, 1, 2].map(i => <div key={i} className="h-14 bg-raised rounded-lg animate-pulse" />)}</div> : tasks.length ? <ul className="agenda-list">{tasks.map(task => {
          const date = new Date(task.fechaProgramada);
          return <li key={task.id}><Link to={`/mantenimientos?estado=${task.estado}`} className="agenda-item"><time className="agenda-date" dateTime={task.fechaProgramada}><span>{format(date, 'dd')}</span><span>{format(date, 'MMM', { locale: es })}</span></time><div className="min-w-0"><h3>{task.titulo}</h3><p>{task.equipo.nombre}</p></div><span className={`agenda-state ${task.estado === 'vencido' ? 'text-brand' : ''}`}>{task.estado === 'vencido' ? 'Vencido' : task.estado === 'en_proceso' ? 'En proceso' : 'Programado'}</span><ArrowUpRight className="agenda-arrow" size={16} aria-hidden="true" /></Link></li>;
        })}</ul> : <div className="panel-message"><p>No hay revisiones próximas.</p><Link to="/mantenimientos" className="text-link mt-3">Organizar mantenimiento <ArrowRight size={16} /></Link></div>}
        {data && <div className="agenda-footer"><span>Equipos en mantenimiento</span><strong>{number.format(data.equiposEnMantenimiento)}</strong></div>}
      </section></div>

      <div className="overview-rail"><EquipmentRisk />
        <section className="card ranking-panel">
          <div className="panel-heading"><div><h2>Equipos a seguir</h2><p>Mayor número de fallas registradas</p></div></div>
          {recurring.isError ? <LoadError retry={() => { void recurring.refetch(); }}>No se pudo cargar la recurrencia.</LoadError> : recurring.isLoading ? <div className="p-6" role="status">Cargando equipos…</div> : ranking.length ? <ol className="ranking-list">{ranking.map(e => <li key={e.equipoId}><Link to={`/equipos/${e.equipoId}`}><span className="ranking-label"><span>{e.nombre}</span><span className="tabular-nums">{number.format(e.totalFallas)} <span className="text-zinc-400">fallas</span></span></span><span className="ranking-track" aria-hidden="true"><span style={{ width: `${e.totalFallas / maxFailures * 100}%` }} /></span></Link></li>)}</ol> : <div className="panel-message">No hay fallas registradas.</div>}
        </section>
      </div>
    </div>
    <div className="overview-finance">
      <BudgetReport compact />
        {data?.presupuestoMes ? <MonthlyBudget budget={data.presupuestoMes} /> : <section className="card monthly-panel"><div className="panel-heading"><div><h2>Inversión del mes</h2><p>{format(new Date(), 'MMMM yyyy', { locale: es })} · COP</p></div></div>{summary.isError ? <LoadError retry={() => { void summary.refetch(); }}>No se pudo cargar el costo.</LoadError> : <div className="monthly-total">{summary.isLoading ? '…' : data?.costoMes != null ? money.format(data.costoMes) : '—'}</div>}<Link to="/reportes" className="text-link">Consultar reportes <ArrowUpRight size={15} /></Link></section>}
      </div>
  </div>;
}
