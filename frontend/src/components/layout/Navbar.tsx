import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '../common/BrandLogo';
import { Bell, X, CheckCheck, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { notificacionesApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';

export default function Navbar({ onMenu }: { onMenu: () => void }) {
  const { usuario } = useAuthStore();
  const { pathname } = useLocation();
  const section = ({ dashboard: 'Vista general', equipos: 'Inventario de equipos', fallas: 'Registro de fallas', mantenimientos: 'Mantenimientos', reportes: 'Reportes', usuarios: 'Equipo de trabajo', configuracion: 'Configuración', perfil: 'Mi perfil' } as Record<string, string>)[pathname.split('/')[1]] || 'Preventix';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifs = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => notificacionesApi.listar().then((r) => r.data.data ?? r.data),
    refetchInterval: 30_000,
  });

  const noLeidas = notifs.filter((n: { leida: boolean }) => !n.leida).length;

  const marcarLeida = useMutation({
    mutationFn: (id: string) => notificacionesApi.leer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  const marcarTodas = useMutation({
    mutationFn: () => notificacionesApi.leerTodas(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-[76px] bg-surface/80 border-b border-line flex items-center justify-between px-4 md:px-7 gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0"><button className="md:hidden p-2 -ml-2 text-zinc-300 rounded-lg" aria-label="Abrir menú" onClick={onMenu}><Menu className="w-5 h-5" /></button><div className="md:hidden"><BrandLogo compact /></div><div className="min-w-0"><p className="text-[10px] text-zinc-400 uppercase tracking-[0.15em] hidden sm:block">Preventix / Espacio de trabajo</p><p className="text-sm font-medium text-zinc-100 truncate">{section}</p></div></div>
      <div className="flex items-center gap-4">
        {/* Campana */}
        <div ref={ref} className="relative">
          <button
            aria-label="Notificaciones" aria-expanded={open} onClick={() => setOpen((v) => !v)}
            className="relative p-2 rounded-lg text-zinc-400 hover:bg-raised transition-colors"
          >
            <Bell className="w-5 h-5" />
            {noLeidas > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-4 w-80 max-w-[calc(100vw-2rem)] bg-surface rounded-xl shadow-xl border border-line z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-sm font-semibold text-zinc-100">Notificaciones</span>
                <div className="flex items-center gap-2 rounded-xl">
                  {noLeidas > 0 && (
                    <button
                      onClick={() => marcarTodas.mutate()}
                      className="text-xs text-brand hover:text-brand flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Leer todas
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} aria-label="Cerrar notificaciones" className="text-zinc-400 hover:text-zinc-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800">
                {notifs.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-8">Sin notificaciones</p>
                ) : (
                  notifs.slice(0, 5).map((n: { id: string; titulo: string; mensaje: string; leida: boolean; createdAt: string }) => (
                    <div
                      key={n.id}
                      onClick={() => !n.leida && marcarLeida.mutate(n.id)}
                      className={`px-4 py-3 cursor-pointer hover:bg-ink transition-colors ${!n.leida ? 'bg-brand/10' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.leida && <span className="mt-1.5 w-2 h-2 bg-brand rounded-full shrink-0" />}
                        <div className={!n.leida ? '' : 'ml-4'}>
                          <p className="text-sm font-medium text-zinc-100 leading-tight">{n.titulo}</p>
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.mensaje}</p>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Usuario */}
        <Link to="/perfil" aria-label="Mi perfil" className="flex items-center gap-2 rounded-xl">
          <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center text-ink text-sm font-semibold">
            {usuario?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-zinc-100 leading-tight">{usuario?.nombre}</p>
            <p className="text-xs text-zinc-400 capitalize">{usuario?.rol}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
