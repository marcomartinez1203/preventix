import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, X, CheckCheck, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { notificacionesApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';

export default function Navbar({ onMenu }: { onMenu: () => void }) {
  const { usuario } = useAuthStore();
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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2"><button className="md:hidden p-2" aria-label="Abrir menú" onClick={onMenu}><Menu className="w-5 h-5" /></button><span className="badge bg-blue-50 text-blue-700">Sustentación</span></div>
      <div className="flex items-center gap-4">
        {/* Campana */}
        <div ref={ref} className="relative">
          <button
            aria-label="Notificaciones" aria-expanded={open} onClick={() => setOpen((v) => !v)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {noLeidas > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
                <div className="flex items-center gap-2">
                  {noLeidas > 0 && (
                    <button
                      onClick={() => marcarTodas.mutate()}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Leer todas
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Sin notificaciones</p>
                ) : (
                  notifs.slice(0, 5).map((n: { id: string; titulo: string; mensaje: string; leida: boolean; createdAt: string }) => (
                    <div
                      key={n.id}
                      onClick={() => !n.leida && marcarLeida.mutate(n.id)}
                      className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!n.leida ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.leida && <span className="mt-1.5 w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                        <div className={!n.leida ? '' : 'ml-4'}>
                          <p className="text-sm font-medium text-slate-800 leading-tight">{n.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
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
        <Link to="/perfil" aria-label="Mi perfil" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {usuario?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">{usuario?.nombre}</p>
            <p className="text-xs text-slate-500 capitalize">{usuario?.rol}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
