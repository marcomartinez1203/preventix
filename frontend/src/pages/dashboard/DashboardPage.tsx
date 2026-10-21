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
  color: 'blue' | 'green' | 'yellow' | 'red'; sub?: string;
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">{empresa?.nombre} · Resumen general</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingResumen ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard label="Total equipos" value={resumen?.totalEquipos ?? 0} icon={Monitor} color="blue" sub={`${resumen?.equiposActivos ?? 0} activos`} />
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
            <Wrench className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-800">Próximos mantenimientos</h2>
          </div>
          {loadingProximos ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="bg-slate-200 rounded h-4 w-1/3" />
                  <div className="bg-slate-200 rounded h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : proximos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin mantenimientos próximos</p>
          ) : (
            <div className="space-y-3">
              {proximos.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 leading-tight">{m.titulo}</p>
                    <p className="text-xs text-slate-400">{m.equipo.nombre}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.estado === 'vencido' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
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
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-slate-800">Equipos con más fallas</h2>
          </div>
          {loadingRecurrentes ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="bg-slate-200 rounded h-3 w-1/3" />
                  <div className="bg-slate-200 rounded h-2 w-full" />
                </div>
              ))}
            </div>
          ) : recurrentes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin fallas registradas</p>
          ) : (
            <div className="space-y-3">
              {recurrentes.slice(0, 5).map((e) => (
                <div key={e.equipoId}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-slate-700">{e.nombre}</p>
                    <p className="text-xs font-semibold text-slate-500">{e.totalFallas} falla{e.totalFallas !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
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
          <h2 className="font-semibold text-slate-800 mb-4">Resumen del mes actual</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{resumen.mantenimientosCompletadosMes}</p>
              <p className="text-xs text-slate-500 mt-1">Completados</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{resumen.mantenimientosProximos}</p>
              <p className="text-xs text-slate-500 mt-1">Próximos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{resumen.equiposEnMantenimiento}</p>
              <p className="text-xs text-slate-500 mt-1">En mantenimiento</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-700">
                {resumen.costoMes != null
                  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(resumen.costoMes)
                  : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Costo total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
