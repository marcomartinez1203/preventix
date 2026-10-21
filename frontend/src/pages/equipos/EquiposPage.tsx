import { Link } from 'react-router-dom';
import Pagination, { usePagination } from '../../components/common/Pagination';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Monitor, Laptop, Server, HelpCircle, Search, Edit2, Archive, Clock } from 'lucide-react';
import { equiposApi, sedesApi, usuariosApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { Equipo, EstadoEquipo, TipoEquipo, HistorialEquipoItem } from '../../types';
import Modal from '../../components/common/Modal';
import SlideOver from '../../components/common/SlideOver';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// ─── Helpers ────────────────────────────────────
const tipoIcono: Record<TipoEquipo, React.ElementType> = {
  desktop: Monitor, laptop: Laptop, servidor: Server, otro: HelpCircle,
};
const tipoColor: Record<TipoEquipo, string> = {
  desktop: 'bg-blue-100 text-blue-700',
  laptop: 'bg-indigo-100 text-indigo-700',
  servidor: 'bg-violet-100 text-violet-700',
  otro: 'bg-slate-100 text-slate-600',
};
const estadoColor: Record<EstadoEquipo, string> = {
  activo: 'bg-green-100 text-green-700',
  en_mantenimiento: 'bg-yellow-100 text-yellow-700',
  fuera_servicio: 'bg-red-100 text-red-700',
  archivado: 'bg-slate-100 text-slate-500',
};
const estadoLabel: Record<EstadoEquipo, string> = {
  activo: 'Activo', en_mantenimiento: 'En mantenimiento',
  fuera_servicio: 'Fuera de servicio', archivado: 'Archivado',
};

// ─── Schema ──────────────────────────────────────
const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  tipo: z.enum(['desktop', 'laptop', 'servidor', 'otro']),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  procesador: z.string().optional(),
  ramGb: z.coerce.number().int().positive().optional().or(z.literal('')),
  almacenamientoGb: z.coerce.number().int().positive().optional().or(z.literal('')),
  sistemaOperativo: z.string().optional(),
  fechaAdquisicion: z.string().optional(),
  sedeId: z.string().optional(),
  usuarioAsignadoId: z.string().optional(),
  responsableId: z.string().optional(),
  estado: z.enum(['activo', 'en_mantenimiento', 'fuera_servicio', 'archivado']),
  notas: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Historial Modal ─────────────────────────────
function HistorialModal({ equipo, onClose }: { equipo: Equipo; onClose: () => void }) {
  const { data: historial = [], isLoading } = useQuery<HistorialEquipoItem[]>({
    queryKey: ['historial', equipo.id],
    queryFn: () => equiposApi.historial(equipo.id).then((r) => r.data.data ?? r.data),
  });
  return (
    <Modal open onClose={onClose} title={`Historial · ${equipo.nombre}`} size="lg">
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse h-12 bg-slate-100 rounded" />)}</div>
      ) : historial.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin registros de historial</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
          <div className="space-y-4 ml-10">
            {historial.map((h) => (
              <div key={h.id} className="relative">
                <div className="absolute -left-[2.35rem] w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                <div className="card p-3">
                  <p className="text-sm font-medium text-slate-700">{h.descripcion}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-slate-400">{h.usuario.nombre}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(h.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Equipo Form ─────────────────────────────────
function EquipoForm({
  equipo, onClose,
}: { equipo?: Equipo; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: sedes = [] } = useQuery({ queryKey: ['sedes'], queryFn: () => sedesApi.listar().then((r) => r.data.data ?? r.data) });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => usuariosApi.listar().then((r) => r.data.data ?? r.data) });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: equipo ? {
      nombre: equipo.nombre, tipo: equipo.tipo, marca: equipo.marca ?? '',
      modelo: equipo.modelo ?? '', numeroSerie: equipo.numeroSerie ?? '',
      procesador: equipo.procesador ?? '', ramGb: equipo.ramGb ?? '',
      almacenamientoGb: equipo.almacenamientoGb ?? '',
      sistemaOperativo: equipo.sistemaOperativo ?? '',
      fechaAdquisicion: equipo.fechaAdquisicion?.slice(0, 10) ?? '',
      sedeId: equipo.sede?.id ?? '', usuarioAsignadoId: equipo.usuarioAsignado?.id ?? '',
      responsableId: equipo.responsable?.id ?? '', estado: equipo.estado,
      notas: equipo.notas ?? '',
    } : { tipo: 'desktop', estado: 'activo' },
  });

  const onSubmit = async (data: FormData) => {
    const payload = { ...data, ramGb: data.ramGb || undefined, almacenamientoGb: data.almacenamientoGb || undefined };
    try {
      if (equipo) {
        await equiposApi.actualizar(equipo.id, payload);
        toast.success('Equipo actualizado');
      } else {
        await equiposApi.crear(payload);
        toast.success('Equipo registrado');
      }
      qc.invalidateQueries();
      onClose();
    } catch {
      toast.error('Error al guardar el equipo');
    }
  };

  const field = (label: string, key: keyof FormData, type = 'text', opts?: object) => (
    <div>
      <label className="label">{label}</label>
      <input type={type} {...register(key)} className="input" {...opts} />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]?.message as string}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">{field('Nombre *', 'nombre')}</div>
        <div>
          <label className="label">Tipo</label>
          <select {...register('tipo')} className="input">
            <option value="desktop">Desktop</option>
            <option value="laptop">Laptop</option>
            <option value="servidor">Servidor</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select {...register('estado')} className="input">
            <option value="activo">Activo</option>
            <option value="en_mantenimiento">En mantenimiento</option>
            <option value="fuera_servicio">Fuera de servicio</option>
            <option value="archivado">Archivado</option>
          </select>
        </div>
        {field('Marca', 'marca')}
        {field('Modelo', 'modelo')}
        {field('Número de serie', 'numeroSerie')}
        {field('Sistema operativo', 'sistemaOperativo')}
        {field('Procesador', 'procesador')}
        {field('RAM (GB)', 'ramGb', 'number')}
        {field('Almacenamiento (GB)', 'almacenamientoGb', 'number')}
        {field('Fecha adquisición', 'fechaAdquisicion', 'date')}
        <div>
          <label className="label">Sede</label>
          <select {...register('sedeId')} className="input">
            <option value="">Sin asignar</option>
            {sedes.map((s: { id: string; nombre: string }) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Usuario asignado</label>
          <select {...register('usuarioAsignadoId')} className="input">
            <option value="">Sin asignar</option>
            {usuarios.map((u: { id: string; nombre: string }) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Responsable</label>
          <select {...register('responsableId')} className="input">
            <option value="">Sin asignar</option>
            {usuarios.map((u: { id: string; nombre: string }) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Notas</label>
          <textarea {...register('notas')} rows={3} className="input resize-none" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? 'Guardando...' : equipo ? 'Actualizar' : 'Registrar'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ───────────────────────────────────
export default function EquiposPage() {
  const { usuario } = useAuthStore();
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [slideover, setSlideover] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Equipo | null>(null);
  const [historialEquipo, setHistorialEquipo] = useState<Equipo | null>(null);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (tipoFiltro) params.tipo = tipoFiltro;
  if (estadoFiltro) params.estado = estadoFiltro;

  const { data: equipos = [], isLoading, isError, refetch } = useQuery<Equipo[]>({
    queryKey: ['equipos', params],
    queryFn: () => equiposApi.listar(params).then((r) => r.data.data ?? r.data),
  });
  const pagination = usePagination(equipos, JSON.stringify(params));

  const archivar = useMutation({
    mutationFn: (id: string) => equiposApi.archivar(id),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Equipo archivado'); },
    onError: () => toast.error('Error al archivar'),
  });

  const puedeEditar = ['administrador', 'responsable'].includes(usuario?.rol ?? '');

  return (
    <div className="space-y-5">
      {historialEquipo && <HistorialModal equipo={historialEquipo} onClose={() => setHistorialEquipo(null)} />}
      <SlideOver
        open={slideover !== null}
        onClose={() => { setSlideover(null); setSelected(null); }}
        title={slideover === 'edit' ? 'Editar equipo' : 'Registrar equipo'}
      >
        <EquipoForm equipo={selected ?? undefined} onClose={() => { setSlideover(null); setSelected(null); }} />
      </SlideOver>

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{equipos.length} equipo{equipos.length !== 1 ? 's' : ''} registrado{equipos.length !== 1 ? 's' : ''}</p>
        </div>
        {puedeEditar && (
          <button onClick={() => setSlideover('create')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Registrar equipo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Buscar por nombre o serie..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="input w-auto">
          <option value="">Todos los tipos</option>
          <option value="desktop">Desktop</option>
          <option value="laptop">Laptop</option>
          <option value="servidor">Servidor</option>
          <option value="otro">Otro</option>
        </select>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="input w-auto">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="en_mantenimiento">En mantenimiento</option>
          <option value="fuera_servicio">Fuera de servicio</option>
          <option value="archivado">Archivados</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {isError ? <div role="alert" className="p-6 text-red-600">No se pudieron cargar los datos. <button onClick={() => refetch()} className="underline">Reintentar</button></div> : isLoading ? (
          <div className="p-6"><SkeletonTable rows={5} /></div>
        ) : equipos.length === 0 ? (
          <EmptyState
            title="Sin equipos registrados"
            description="Registra el primer equipo para comenzar a gestionar el mantenimiento."
            action={puedeEditar ? <button onClick={() => setSlideover('create')} className="btn-primary">+ Registrar equipo</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Equipo', 'Marca / Modelo', 'Sede', 'Responsable', 'Estado', 'Adquisición', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagination.visible.map((eq) => {
                  const TipoIcon = tipoIcono[eq.tipo] ?? HelpCircle;
                  return (
                    <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${tipoColor[eq.tipo]}`}>
                            <TipoIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <Link to={`/equipos/${eq.id}`} className="font-medium text-blue-700 hover:underline">{eq.nombre}</Link>
                            {eq.numeroSerie && <p className="text-xs text-slate-400">S/N: {eq.numeroSerie}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {eq.marca || eq.modelo ? `${eq.marca ?? ''} ${eq.modelo ?? ''}`.trim() : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {eq.sede?.nombre ?? <span className="text-slate-300">—</span>}
                        {eq.ubicacion && <p className="text-xs text-slate-400">{eq.ubicacion.nombre}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {eq.responsable?.nombre ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${estadoColor[eq.estado]}`}>{estadoLabel[eq.estado]}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {eq.fechaAdquisicion ? format(new Date(eq.fechaAdquisicion), 'dd MMM yyyy', { locale: es }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setHistorialEquipo(eq)}
                            title="Ver historial"
                            className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          {puedeEditar && (
                            <>
                              <button
                                onClick={() => { setSelected(eq); setSlideover('edit'); }}
                                title="Editar"
                                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {!eq.archivado && (
                                <button
                                  onClick={() => { if (window.confirm(`¿Archivar ${eq.nombre}? Podrás recuperarlo desde el filtro Archivados.`)) archivar.mutate(eq.id); }}
                                  title="Archivar"
                                  className="p-1.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination {...pagination} />
    </div>
  );
}
