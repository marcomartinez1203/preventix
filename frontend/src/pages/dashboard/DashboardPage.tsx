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
    brand:   'bg-brand/10 text-brand',
    green:  'bg-emerald-400/10 text-emerald-400',
    yellow: 'bg-brand/10 text-brand',
    red:    'bg-red-400/10 text-red-400',
  };
  return (
    <div className="card kpi-card p-5 pt-6 flex flex-col sm:flex-row items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="text-3xl font-bold tracking-tight text-zinc-100 mt-1">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { empresa } = useAuthStore();

  const { data: resumen, isLoading: loadingResumen } = useQuery<DashboardResumen>({
    queryKey: ['dashboard-resumen'],
    queryFn: () => dashboardApi.resumen().then((r) => r.data.data ?? r.data),
  });

  const { data: proximos = [], isLoading: loadingProximos } = useQuery<Mantenimiento[]>({
    queryKey: ['mantenimientos-proximos'],
    queryFn: () => dashboardApi.mantenimientosProximos().then((r) => r.data.data ?? r.data),
  });

  const { data: recurrentes = [], isLoading: loadingRecurrentes } = useQuery<{ equipoId: string; nombre: string; totalFallas: number }[]>({
    queryKey: ['equipos-recurrentes'],
    queryFn: () => dashboardApi.equiposRecurrentes().then((r) => r.data.data ?? r.data),
  });

  const maxFallas = recurrentes[0]?.totalFallas ?? 1;

  return (
    <div className="space-y-6">
      <section className="dashboard-hero card relative overflow-hidden p-6 sm:p-8">
        <Monitor aria-hidden="true" className="absolute right-6 top-1/2 -translate-y-1/2 w-52 h-52 text-brand/[0.06] hidden lg:block pointer-events-none" strokeWidth={1} />
        <div className="relative"><p className="eyebrow mb-3">{empresa?.nombre || 'Tu espacio de trabajo'}</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">Centro de control</h1><p className="text-zinc-400 text-sm sm:text-base mt-3 max-w-xl">El estado de tus equipos y lo que viene, de un vistazo.</p><div className="flex flex-wrap gap-3 mt-6"><Link to="/equipos" className="btn-primary text-sm inline-flex items-center gap-2"><Monitor className="w-4 h-4" />Ver inventario</Link><Link to="/mantenimientos" className="btn-secondary text-sm inline-flex items-center gap-2"><Wrench className="w-4 h-4" />Ver mantenimientos</Link></div></div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingResumen ? (
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
            <Wrench className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-zinc-100">Próximos mantenimientos</h2>
          </div>
          {loadingProximos ? (
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
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
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
            <TrendingUp className="w-5 h-5 text-brand" />
            <h2 className="font-semibold text-zinc-100">Equipos con más fallas</h2>
          </div>
          {loadingRecurrentes ? (
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
                      className="h-full bg-brand rounded-full transition-all"
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
