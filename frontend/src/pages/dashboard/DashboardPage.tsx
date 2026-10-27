import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Monitor, AlertTriangle, Wrench, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { dashboardApi } from '../../api';
import { SkeletonCard } from '../../components/common/Skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { DashboardResumen, Mantenimiento } from '../../types';
import { useAuthStore } from '../../stores/authStore';

function KpiCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: 'brand' | 'green' | 'yellow' | 'red'; sub?: string;
}) {
  const colors = {
    brand:   'bg-raised text-zinc-300',
    green:  'bg-emerald-400/10 text-emerald-400',
    yellow: 'bg-brand/10 text-brand',
    red:    'bg-red-400/10 text-red-400',
  };
  return (
    <div className="card kpi-card p-5 flex items-start gap-3 min-w-0">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon aria-hidden="true" className="w-5 h-5" />
      </div>
      <dl className="min-w-0"><dt className="text-sm text-zinc-400">{label}</dt><dd className="text-3xl font-semibold tracking-tight tabular-nums text-zinc-100 mt-2">{value}</dd>{sub && <dd className="text-xs text-zinc-400 mt-1">{sub}</dd>}</dl>
    </div>
  );
}

export default function DashboardPage() {
  const { empresa } = useAuthStore();

  const { data: resumen, isLoading: loadingResumen, isError: errorResumen, refetch: retryResumen } = useQuery<DashboardResumen>({
    queryKey: ['dashboard-resumen'],
    queryFn: () => dashboardApi.resumen().then((r) => r.data.data ?? r.data),
  });

  const { data: proximos = [], isLoading: loadingProximos, isError: errorProximos, refetch: retryProximos } = useQuery<Mantenimiento[]>({
    queryKey: ['mantenimientos-proximos'],
    queryFn: () => dashboardApi.mantenimientosProximos().then((r) => r.data.data ?? r.data),
  });

  const { data: recurrentes = [], isLoading: loadingRecurrentes, isError: errorRecurrentes, refetch: retryRecurrentes } = useQuery<{ equipoId: string; nombre: string; totalFallas: number }[]>({
    queryKey: ['equipos-recurrentes'],
    queryFn: () => dashboardApi.equiposRecurrentes().then((r) => r.data.data ?? r.data),
  });

  const maxFallas = recurrentes[0]?.totalFallas ?? 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm text-zinc-400 mb-2">{empresa?.nombre || 'Tu espacio de trabajo'}</p><h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Resumen de mantenimiento</h1><p className="text-sm text-zinc-400 mt-2">Equipos, incidencias y próximas tareas.</p></div>
        <Link to="/reportes" className="btn-secondary text-sm inline-flex items-center gap-2">Consultar reportes</Link>
      </header>
      {!!resumen?.mantenimientosVencidos && <section aria-label="Tareas que requieren atención" className="card p-5 border-l-[3px] border-l-red-400 flex flex-wrap items-center justify-between gap-4"><div className="flex items-start gap-3"><Clock aria-hidden="true" className="w-5 h-5 text-red-400 mt-0.5 shrink-0" /><div><h2 className="font-semibold">{resumen.mantenimientosVencidos} mantenimiento{resumen.mantenimientosVencidos === 1 ? '' : 's'} vencido{resumen.mantenimientosVencidos === 1 ? '' : 's'}</h2><p className="text-sm text-zinc-400 mt-1">Revisa las tareas pendientes y actualiza su estado.</p></div></div><Link to="/mantenimientos?estado=vencido" className="btn-primary text-sm">Revisar vencidos</Link></section>}

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {errorResumen ? <div role="alert" className="card p-5 sm:col-span-2 xl:col-span-4"><p>No se pudo cargar el resumen.</p><button className="record-action mt-3" onClick={() => retryResumen()}>Reintentar</button></div> : loadingResumen ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard label="Total equipos" value={resumen?.totalEquipos ?? 0} icon={Monitor} color="brand" sub={`${resumen?.equiposActivos ?? 0} activos`} />
            <KpiCard label="Fallas pendientes" value={resumen?.fallasPendientes ?? 0} icon={AlertTriangle} color={resumen?.fallasPendientes ? 'yellow' : 'green'} />
            <KpiCard label="Mantenimientos vencidos" value={resumen?.mantenimientosVencidos ?? 0} icon={Clock} color={resumen?.mantenimientosVencidos ? 'red' : 'green'} />
            <KpiCard label="Completados este mes" value={resumen?.mantenimientosCompletadosMes ?? 0} icon={CheckCircle} color="green" />
          </>
        )}
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximos mantenimientos */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-zinc-400" />
            <h2 className="font-semibold text-zinc-100">Próximos mantenimientos</h2>
          </div>
          {errorProximos ? <p role="alert" className="text-sm">No se pudieron cargar las tareas. <button className="min-h-11 text-brand" onClick={() => retryProximos()}>Reintentar</button></p> : loadingProximos ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="bg-zinc-800 rounded h-4 w-1/3" />
                  <div className="bg-zinc-800 rounded h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : proximos.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">Sin mantenimientos próximos</p>
          ) : (
            <div className="space-y-3">
              {proximos.slice(0, 5).map((m) => (
                <div key={m.id} className="flex flex-wrap gap-3 items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-zinc-200 leading-tight">{m.titulo}</p>
                    <p className="text-xs text-zinc-400">{m.equipo.nombre}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.estado === 'vencido' ? 'bg-red-400/10 text-red-400' : 'bg-brand/15 text-brand'
                    }`}>
                      {format(new Date(m.fechaProgramada), 'dd MMM', { locale: es })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equipos con más fallas */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            <h2 className="font-semibold text-zinc-100">Equipos con más fallas</h2>
          </div>
          {errorRecurrentes ? <p role="alert" className="text-sm">No se pudo cargar la recurrencia. <button className="min-h-11 text-brand" onClick={() => retryRecurrentes()}>Reintentar</button></p> : loadingRecurrentes ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="bg-zinc-800 rounded h-3 w-1/3" />
                  <div className="bg-zinc-800 rounded h-2 w-full" />
                </div>
              ))}
            </div>
          ) : recurrentes.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">Sin fallas registradas</p>
          ) : (
            <div className="space-y-3">
              {recurrentes.slice(0, 5).map((e) => (
                <div key={e.equipoId}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-zinc-200">{e.nombre}</p>
                    <p className="text-xs font-semibold text-zinc-400">{e.totalFallas} falla{e.totalFallas !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-400 rounded-full transition-all"
                      style={{ width: `${(e.totalFallas / maxFallas) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumen mes */}
      {resumen && (
        <div className="card p-5">
          <h2 className="font-semibold text-zinc-100 mb-4">Resumen del mes actual</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">{resumen.mantenimientosCompletadosMes}</p>
              <p className="text-xs text-zinc-400 mt-1">Completados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-brand">{resumen.mantenimientosProximos}</p>
              <p className="text-xs text-zinc-400 mt-1">Próximos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-brand">{resumen.equiposEnMantenimiento}</p>
              <p className="text-xs text-zinc-400 mt-1">En mantenimiento</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-zinc-200">
                {resumen.costoMes != null
                  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(resumen.costoMes)
                  : '—'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Costo total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
