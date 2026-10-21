import Pagination, { usePagination } from '../../components/common/Pagination';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Wrench, AlertCircle } from 'lucide-react';
import { mantenimientosApi, equiposApi, usuariosApi, fallasApi } from '../../api';
import type { Mantenimiento, TipoMantenimiento, EstadoMantenimiento } from '../../types';
import { format, isPast, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import Modal from '../../components/common/Modal';
import SlideOver from '../../components/common/SlideOver';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// ─── Helpers ────────────────────────────────────
const estadoMantColor: Record<EstadoMantenimiento, string> = {
  programado: 'bg-slate-100 text-slate-600',
  en_proceso: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
  vencido: 'bg-red-200 text-red-800',
};
const tipoMantColor: Record<TipoMantenimiento, string> = {
  preventivo: 'bg-blue-100 text-blue-700',
  correctivo: 'bg-orange-100 text-orange-700',
};

const TABS: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'Programados', value: 'programado' },
  { label: 'En proceso', value: 'en_proceso' },
  { label: 'Completados', value: 'completado' },
  { label: 'Vencidos', value: 'vencido' },
];

// ─── Schema ──────────────────────────────────────
const schema = z.object({
  equipoId: z.string().min(1, 'Selecciona un equipo'),
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  tipo: z.enum(['preventivo', 'correctivo']),
  responsableId: z.string().min(1, 'Selecciona un responsable'),
  fechaProgramada: z.string().min(1, 'Fecha requerida'),
  actividades: z.string().optional(),
  observaciones: z.string().optional(),
  costo: z.coerce.number().min(0, 'El costo no puede ser negativo').optional().or(z.literal('')),
  fallaId: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Form ────────────────────────────────────────
function MantForm({ mant, onClose }: { mant?: Mantenimiento; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: equipos = [] } = useQuery({ queryKey: ['equipos-select'], queryFn: () => equiposApi.listar().then((r) => r.data.data ?? r.data) });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => usuariosApi.listar().then((r) => r.data.data ?? r.data) });
  const { data: fallas = [] } = useQuery({ queryKey: ['fallas-abiertas'], queryFn: () => fallasApi.listar({ estado: 'abierta' }).then((r) => r.data.data ?? r.data) });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: mant ? {
      equipoId: mant.equipo.id, titulo: mant.titulo, tipo: mant.tipo,
      responsableId: mant.responsable.id,
      fechaProgramada: mant.fechaProgramada.slice(0, 10),
      actividades: mant.actividades ?? '', observaciones: mant.observaciones ?? '',
      costo: mant.costo ?? '', fallaId: mant.falla?.id ?? '',
    } : { tipo: 'preventivo' },
  });

  const equipoId = watch('equipoId');
  const fallasDelEquipo = fallas.filter((f: { equipo: { id: string } }) => f.equipo.id === equipoId);

  const onSubmit = async (data: FormData) => {
    const payload = { ...data, costo: data.costo === '' ? undefined : data.costo, fallaId: data.fallaId || '' };
    try {
      if (mant) { await mantenimientosApi.actualizar(mant.id, payload); toast.success('Mantenimiento actualizado'); }
      else { await mantenimientosApi.crear(payload); toast.success('Mantenimiento programado'); }
      qc.invalidateQueries();
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al guardar'); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Equipo *</label>
        <select {...register('equipoId')} className="input">
          <option value="">Seleccionar equipo...</option>
          {equipos.map((e: { id: string; nombre: string }) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        {errors.equipoId && <p className="text-xs text-red-500 mt-1">{errors.equipoId.message}</p>}
      </div>
      <div>
        <label className="label">Título *</label>
        <input {...register('titulo')} className="input" placeholder="Ej: Mantenimiento preventivo mensual" />
        {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo</label>
          <select {...register('tipo')} className="input">
            <option value="preventivo">Preventivo</option>
            <option value="correctivo">Correctivo</option>
          </select>
        </div>
        <div>
          <label className="label">Fecha programada *</label>
          <input type="date" {...register('fechaProgramada')} className="input" />
          {errors.fechaProgramada && <p className="text-xs text-red-500 mt-1">{errors.fechaProgramada.message}</p>}
        </div>
      </div>
      <div>
        <label className="label">Responsable *</label>
        <select {...register('responsableId')} className="input">
          <option value="">Seleccionar responsable...</option>
          {usuarios.map((u: { id: string; nombre: string }) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        {errors.responsableId && <p className="text-xs text-red-500 mt-1">{errors.responsableId.message}</p>}
      </div>
      <div>
        <label className="label">Actividades a realizar</label>
        <textarea {...register('actividades')} rows={3} className="input resize-none" placeholder="Lista de actividades..." />
      </div>
      <div>
        <label className="label">Observaciones</label>
        <textarea {...register('observaciones')} rows={2} className="input resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Costo estimado</label>
          <input type="number" min="0" step="0.01" {...register('costo')} className="input" placeholder="0" />{errors.costo && <p className="text-xs text-red-500">{errors.costo.message}</p>}
        </div>
        <div>
          <label className="label">Vincular a falla</label>
          <select {...register('fallaId')} className="input">
            <option value="">Ninguna</option>
            {fallasDelEquipo.map((f: { id: string; titulo: string }) => <option key={f.id} value={f.id}>{f.titulo}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? 'Guardando...' : mant ? 'Actualizar' : 'Programar'}
        </button>
      </div>
    </form>
  );
}

// ─── Detalle Modal ───────────────────────────────
function DetalleModal({ mant, onClose }: { mant: Mantenimiento; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [nuevoEstado, setNuevoEstado] = useState<EstadoMantenimiento>(mant.estado);

  const cambiarEstado = useMutation({
    mutationFn: () => mantenimientosApi.cambiarEstado(mant.id, { estado: nuevoEstado }),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Estado actualizado'); onClose(); },
    onError: () => toast.error('Error al cambiar estado'),
  });

  return (
    <Modal open onClose={onClose} title={mant.titulo} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <span className={`badge ${estadoMantColor[mant.estado]}`}>{mant.estado.replace('_', ' ')}</span>
          <span className={`badge ${tipoMantColor[mant.tipo]}`}>{mant.tipo}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-500">Equipo</p><p className="font-medium">{mant.equipo.nombre}</p></div>
          <div><p className="text-slate-500">Responsable</p><p className="font-medium">{mant.responsable.nombre}</p></div>
          <div><p className="text-slate-500">Fecha programada</p><p className="font-medium">{format(new Date(mant.fechaProgramada), 'dd MMM yyyy', { locale: es })}</p></div>
          <div><p className="text-slate-500">Costo</p><p className="font-medium">{mant.costo ? `$${Number(mant.costo).toLocaleString('es-CO')}` : '—'}</p></div>
          {mant.fechaInicio && <div><p className="text-slate-500">Inicio</p><p className="font-medium">{format(new Date(mant.fechaInicio), 'dd MMM yyyy', { locale: es })}</p></div>}
          {mant.fechaFin && <div><p className="text-slate-500">Fin</p><p className="font-medium">{format(new Date(mant.fechaFin), 'dd MMM yyyy', { locale: es })}</p></div>}
        </div>
        {mant.actividades && <div><p className="text-slate-500 text-sm">Actividades</p><p className="text-sm mt-1 bg-slate-50 rounded-lg p-3 whitespace-pre-line">{mant.actividades}</p></div>}
        {mant.observaciones && <div><p className="text-slate-500 text-sm">Observaciones</p><p className="text-sm mt-1 bg-slate-50 rounded-lg p-3">{mant.observaciones}</p></div>}
        {mant.falla && <div className="text-sm bg-orange-50 rounded-lg p-3"><p className="text-slate-500">Falla relacionada</p><p className="font-medium text-orange-700">{mant.falla.titulo}</p></div>}
        <div className="border-t border-slate-100 pt-4">
          <label className="label">Cambiar estado</label>
          <div className="flex gap-3">
            <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value as EstadoMantenimiento)} className="input flex-1">
              <option value="programado">Programado</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option><option value="vencido">Vencido</option>
            </select>
            <button onClick={() => cambiarEstado.mutate()} disabled={nuevoEstado === mant.estado || cambiarEstado.isPending} className="btn-primary">Guardar</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────
export default function MantenimientosPage() {
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [slideover, setSlideover] = useState(false);
  const [editando, setEditando] = useState<Mantenimiento | null>(null);
  const [detalle, setDetalle] = useState<Mantenimiento | null>(null);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (tab) params.estado = tab;
  if (tipoFiltro) params.tipo = tipoFiltro;

  const { data: mantenimientos = [], isLoading, isError, refetch } = useQuery<Mantenimiento[]>({
    queryKey: ['mantenimientos', params],
    queryFn: () => mantenimientosApi.listar(params).then((r) => r.data.data ?? r.data),
  });
  const pagination = usePagination(mantenimientos, JSON.stringify(params));

  const vencidos = mantenimientos.filter((m) => m.estado === 'vencido').length;

  return (
    <div className="space-y-5">
      {detalle && <DetalleModal mant={detalle} onClose={() => setDetalle(null)} />}
      <SlideOver open={slideover || !!editando} onClose={() => { setSlideover(false); setEditando(null); }} title={editando ? 'Editar mantenimiento' : 'Programar mantenimiento'}>
        <MantForm mant={editando ?? undefined} onClose={() => { setSlideover(false); setEditando(null); }} />
      </SlideOver>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mantenimientos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{mantenimientos.length} registro{mantenimientos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setSlideover(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Programar mantenimiento
        </button>
      </div>

      {/* Banner vencidos */}
      {vencidos > 0 && !tab && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{vencidos} mantenimiento{vencidos !== 1 ? 's' : ''} vencido{vencidos !== 1 ? 's' : ''}.</span>{' '}
            <button onClick={() => setTab('vencido')} className="underline hover:no-underline">Ver vencidos</button>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
        </div>
        <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="input w-auto">
          <option value="">Todos los tipos</option>
          <option value="preventivo">Preventivo</option>
          <option value="correctivo">Correctivo</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {isError ? <div role="alert" className="p-6 text-red-600">No se pudieron cargar los datos. <button onClick={() => refetch()} className="underline">Reintentar</button></div> : isLoading ? (
          <div className="p-6"><SkeletonTable rows={5} /></div>
        ) : mantenimientos.length === 0 ? (
          <EmptyState icon={<Wrench className="w-14 h-14" />} title="Sin mantenimientos" description="Programa el primer mantenimiento." action={<button onClick={() => setSlideover(true)} className="btn-primary">+ Programar</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Título', 'Equipo', 'Tipo', 'Estado', 'Responsable', 'Fecha programada', 'Costo', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagination.visible.map((m) => {
                  const fecha = new Date(m.fechaProgramada);
                  const vencido = m.estado === 'programado' && isPast(fecha);
                  const diasDiff = differenceInDays(fecha, new Date());
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{m.titulo}</td>
                      <td className="px-4 py-3 text-slate-600">{m.equipo.nombre}</td>
                      <td className="px-4 py-3"><span className={`badge ${tipoMantColor[m.tipo]}`}>{m.tipo}</span></td>
                      <td className="px-4 py-3"><span className={`badge ${estadoMantColor[m.estado]}`}>{m.estado.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3 text-slate-600">{m.responsable.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${vencido ? 'text-red-600' : diasDiff <= 3 ? 'text-yellow-600' : 'text-slate-600'}`}>
                          {format(fecha, 'dd MMM yyyy', { locale: es })}
                          {vencido && <span className="ml-1 text-red-500">⚠</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {m.costo ? `$${Number(m.costo).toLocaleString('es-CO')}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setDetalle(m)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Ver detalle">👁</button>
                          <button onClick={() => setEditando(m)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-colors" title="Editar">✏️</button>
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
