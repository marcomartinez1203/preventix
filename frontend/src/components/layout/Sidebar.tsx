import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, AlertTriangle, Wrench,
  Users, Settings, LogOut, FileBarChart, X
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api';
import clsx from 'clsx';
import BrandLogo from '../common/BrandLogo';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/equipos', icon: Monitor, label: 'Equipos' },
  { to: '/fallas', icon: AlertTriangle, label: 'Fallas' },
  { to: '/mantenimientos', icon: Wrench, label: 'Mantenimientos' },
  { to: '/reportes', icon: FileBarChart, label: 'Reportes' },
  { to: '/usuarios', icon: Users, label: 'Usuarios', roles: ['administrador'] },
  { to: '/configuracion', icon: Settings, label: 'Configuración', roles: ['administrador'] },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { usuario, empresa, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* Local session still ends when the API is unavailable. */ }
    logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter(
    (item) => !item.roles || (usuario && item.roles.includes(usuario.rol))
  );

  return (
    <aside className="w-64 bg-ink border-r border-line flex flex-col shrink-0 h-full">
      <div className="relative px-5 pt-6 pb-5 border-b border-line">
        {onNavigate && <button onClick={onNavigate} aria-label="Cerrar menú" className="icon-button absolute top-3 right-2"><X className="w-4 h-4" /></button>}
        <NavLink to="/dashboard" onClick={onNavigate} aria-label="Preventix, ir al inicio" className="inline-flex rounded-2xl"><BrandLogo className="!w-[116px] !h-[96px]" /></NavLink>
        <p className="mt-4 text-xs text-zinc-400 truncate" title={empresa?.nombre}>{empresa?.nombre || 'Tu espacio de trabajo'}</p>
      </div>
      <nav aria-label="Navegación principal" onClick={onNavigate} className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-3 pt-3 pb-3 text-[10px] text-zinc-400 tracking-[0.17em] uppercase font-semibold">Centro de operaciones</p>
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors', isActive ? 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20' : 'text-zinc-400 hover:bg-raised hover:text-zinc-100')}>
            <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-line">
        <div className="flex items-center gap-3 px-3 py-3 mb-2"><div className="w-9 h-9 rounded-xl border border-brand/25 bg-brand/10 text-brand flex items-center justify-center text-sm font-semibold shrink-0">{usuario?.nombre?.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="text-zinc-100 text-sm font-medium truncate">{usuario?.nombre}</p><p className="text-zinc-400 text-xs capitalize">{usuario?.rol}</p></div></div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:bg-raised hover:text-zinc-100 rounded-xl text-sm transition-colors"><LogOut className="w-4 h-4" />Cerrar sesión</button>
      </div>
    </aside>
  );
}
