import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, AlertTriangle, Wrench,
  Users, Settings, LogOut, Shield, FileBarChart
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
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
    <aside className="w-64 bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Preventix</p>
            <p className="text-slate-400 text-xs truncate max-w-[140px]">{empresa?.nombre}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav onClick={onNavigate} className="flex-1 p-3 space-y-1">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className="p-3 border-t border-slate-700">
        <div className="px-3 py-2 mb-1">
          <p className="text-white text-sm font-medium truncate">{usuario?.nombre}</p>
          <p className="text-slate-400 text-xs capitalize">{usuario?.rol}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
