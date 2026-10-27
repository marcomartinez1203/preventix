import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import type { DashboardResumen } from '../../types';

export default function MonthlyBudget({ budget }: { budget: NonNullable<DashboardResumen['presupuestoMes']> }) {
  const admin = useAuthStore(s => s.usuario?.rol === 'administrador');
  const amount = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: budget.moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const over = budget.estado === 'excedido';
  return <section className="card monthly-panel">
    <div className="panel-heading"><div><h2>Presupuesto del mes</h2><p>{budget.periodo} · {budget.moneda}</p></div></div>
    <div className="px-4 sm:px-6 pb-5 space-y-4">
      <dl className="space-y-3 text-sm tabular-nums">
        <div className="flex justify-between gap-3"><dt className="text-zinc-400">Gastado</dt><dd className="text-right font-medium">{amount(budget.gasto)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-zinc-400">Límite mensual</dt><dd className="text-right">{budget.limite > 0 ? amount(budget.limite) : 'Sin configurar'}</dd></div>
        {budget.saldo !== null && <div className="flex justify-between gap-3"><dt className="text-zinc-400">{over ? 'Exceso' : 'Disponible'}</dt><dd className={`text-right ${over ? 'text-red-300' : ''}`}>{amount(Math.abs(budget.saldo))}</dd></div>}
      </dl>
      {budget.porcentaje !== null && <div><div role="progressbar" aria-label="Presupuesto mensual consumido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, budget.porcentaje)} aria-valuetext={`${budget.porcentaje}% del presupuesto consumido`} className="h-2 bg-raised rounded-full overflow-hidden"><div className={`h-full ${over ? 'bg-red-400' : 'bg-brand'}`} style={{ width: `${Math.min(100, budget.porcentaje)}%` }} /></div><p className="text-xs text-zinc-400 mt-2">{budget.porcentaje.toLocaleString('es-CO')}% consumido</p></div>}
      {budget.estado === 'sin_configurar' ? <p className="text-sm text-zinc-400">{admin ? 'Define un límite en Configuración → General.' : 'El administrador todavía no ha definido un presupuesto.'}</p> : budget.estado !== 'normal' && <p role="status" className={`text-sm ${over ? 'text-red-300' : 'text-brand'}`}>{over ? 'Se superó el presupuesto mensual.' : 'Has consumido al menos el 80% del presupuesto.'}</p>}
      <p className="text-xs text-zinc-400">Costos de mantenimientos completados este mes. Excluye tareas pendientes y canceladas.</p>
      <div className="flex flex-wrap gap-x-4"><Link to="/reportes" className="text-link">Ver costos</Link>{admin && <Link to="/configuracion" className="text-link">Abrir configuración</Link>}</div>
    </div>
  </section>;
}
