import Pagination, { usePagination } from '../../components/common/Pagination';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { fallasApi, equiposApi, usuariosApi } from '../../api';
import type { Falla, CategoriaFalla, PrioridadFalla, EstadoFalla } from '../../types';
import { format } from 'date-fns';
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
const prioridadColor: Record<PrioridadFalla, string> = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
};
const estadoFallaColor: Record<EstadoFalla, string> = {
  abierta: 'bg-blue-100 text-blue-700',
  en_proceso: 'bg-yellow-100 text-yellow-700',
  resuelta: 'bg-green-100 text-green-700',
  cerrada: 'bg-slate-100 text-slate-500',
};
const categoriaColor: Record<CategoriaFalla, string> = {
  hardware: 'bg-orange-100 text-orange-700',
  software: 'bg-blue-100 text-blue-700',
  red: 'bg-purple-100 text-purple-700',
  perifericos: 'bg-teal-100 text-teal-700',
  otro: 'bg-slate-100 text-slate-600',
};

// ─── Schema ──────────────────────────────────────
const schema = z.object({
  equipoId: z.string().min(1, 'Selecciona un equipo'),
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  descripcion: z.string().min(5, 'Describe el problema'),
  categoria: z.enum(['hardware', 'software', 'red', 'perifericos', 'otro']),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']),
  asignadoA: z.string().optional(),
  diagnostico: z.string().optional(),
  solucionAplicada: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Falla Form ──────────────────────────────────
function FallaForm({ falla, onClose }: { falla?: Falla; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: equipos = [] } = useQuery({ queryKey: ['equipos-select'], queryFn: () => equiposApi.listar().then((r) => r.data.data ?? r.data) });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => usuariosApi.listar().then((r) => r.data.data ?? r.data) });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: falla ? {
      equipoId: falla.equipo.id, titulo: falla.titulo, descripcion: falla.descripcion,
      categoria: falla.categoria, prioridad: falla.prioridad, asignadoA: falla.tecnico?.id ?? '',
      diagnostico: falla.diagnostico ?? '', solucionAplicada: falla.solucionAplicada ?? '',
    } : { categoria: 'otro', prioridad: 'media' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (falla) { await fallasApi.actualizar(falla.id, data); toast.success('Falla actualizada'); }
      else { await fallasApi.crear(data); toast.success('Falla registrada'); }
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
        <input {...register('titulo')} className="input" placeholder="Ej: Pantalla no enciende" />
        {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
      </div>
      <div>
        <label className="label">Descripción *</label>
        <textarea {...register('descripcion')} rows={3} className="input resize-none" placeholder="Describe el problema en detalle..." />
        {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Categoría</label>
          <select {...register('categoria')} className="input">
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="red">Red</option>
            <option value="perifericos">Periféricos</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="label">Prioridad</label>
          <select {...register('prioridad')} className="input">
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Técnico asignado</label>
        <select {...register('asignadoA')} className="input">
          <option value="">Sin asignar</option>
          {usuarios.map((u: { id: string; nombre: string }) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Diagnóstico</label>
        <textarea {...register('diagnostico')} rows={2} className="input resize-none" />
      </div>
      <div>
        <label className="label">Solución aplicada</label>
        <textarea {...register('solucionAplicada')} rows={2} className="input resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? 'Guardando...' : falla ? 'Actualizar' : 'Reportar falla'}
        </button>
      </div>
    </form>
  );
}

// ─── Detalle Modal ───────────────────────────────
function DetalleModal({ falla, onClose }: { falla: Falla; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [nuevoEstado, setNuevoEstado] = useState<EstadoFalla>(falla.estado);

  const cambiarEstado = useMutation({
    mutationFn: () => fallasApi.cambiarEstado(falla.id, { estado: nuevoEstado }),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Estado actualizado'); onClose(); },
    onError: () => toast.error('Error al cambiar estado'),
  });

  return (
    <Modal open onClose={onClose} title={falla.titulo} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <span className={`badge ${estadoFallaColor[falla.estado]}`}>{falla.estado.replace('_', ' ')}</span>
          <span className={`badge ${prioridadColor[falla.prioridad]}`}>{falla.prioridad}</span>
          <span className={`badge ${categoriaColor[falla.categoria]}`}>{falla.categoria}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-500">Equipo</p><p className="font-medium">{falla.equipo.nombre}</p></div>
          <div><p className="text-slate-500">Reportado por</p><p className="font-medium">{falla.reportador.nombre}</p></div>
          <div><p className="text-slate-500">Técnico</p><p className="font-medium">{falla.tecnico?.nombre ?? '—'}</p></div>
          <div><p className="text-slate-500">Fecha reporte</p><p className="font-medium">{format(new Date(falla.fechaReporte), 'dd MMM yyyy', { locale: es })}</p></div>
        </div>
        <div><p className="text-slate-500 text-sm">Descripción</p><p className="text-sm mt-1 bg-slate-50 rounded-lg p-3">{falla.descripcion}</p></div>
        {falla.diagnostico && <div><p className="text-slate-500 text-sm">Diagnóstico</p><p className="text-sm mt-1 bg-slate-50 rounded-lg p-3">{falla.diagnostico}</p></div>}
        {falla.solucionAplicada && <div><p className="text-slate-500 text-sm">Solución aplicada</p><p className="text-sm mt-1 bg-green-50 rounded-lg p-3">{falla.solucionAplicada}</p></div>}
        <div className="border-t border-slate-100 pt-4">
          <label className="label">Cambiar estado</label>
          <div className="flex gap-3">
            <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value as EstadoFalla)} className="input flex-1">
              <option value="abierta">Abierta</option>
              <option value="en_proceso">En proceso</option>
              <option value="resuelta">Resuelta</option>
              <option value="cerrada">Cerrada</option>
            </select>
            <button onClick={() => cambiarEstado.mutate()} disabled={nuevoEstado === falla.estado || cambiarEstado.isPending} className="btn-primary">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────
export default function FallasPage() {
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [prioridadFiltro, setPrioridadFiltro] = useState('');
  const [slideover, setSlideover] = useState(false);
  const [editando, setEditando] = useState<Falla | null>(null);
  const [detalle, setDetalle] = useState<Falla | null>(null);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (estadoFiltro) params.estado = estadoFiltro;
  if (categoriaFiltro) params.categoria = categoriaFiltro;
  if (prioridadFiltro) params.prioridad = prioridadFiltro;

  const { data: fallas = [], isLoading, isError, refetch } = useQuery<Falla[]>({
    queryKey: ['fallas', params],
    queryFn: () => fallasApi.listar(params).then((r) => r.data.data ?? r.data),
  });
  const pagination = usePagination(fallas, JSON.stringify(params));

  return (
    <div className="space-y-5">
      {detalle && <DetalleModal falla={detalle} onClose={() => setDetalle(null)} />}
      <SlideOver open={slideover || !!editando} onClose={() => { setSlideover(false); setEditando(null); }} title={editando ? 'Editar falla' : 'Reportar falla'}>
        <FallaForm falla={editando ?? undefined} onClose={() => { setSlideover(false); setEditando(null); }} />
      </SlideOver>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fallas</h1>
          <p className="text-slate-500 text-sm mt-0.5">{fallas.length} falla{fallas.length !== 1 ? 's' : ''} registrada{fallas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setSlideover(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Reportar falla
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por título..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
        </div>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="input w-auto">
          <option value="">Todos los estados</option>
          <option value="abierta">Abierta</option>
          <option value="en_proceso">En proceso</option>
          <option value="resuelta">Resuelta</option>
          <option value="cerrada">Cerrada</option>
        </select>
        <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="input w-auto">
          <option value="">Todas las categorías</option>
          <option value="hardware">Hardware</option>
          <option value="software">Software</option>
          <option value="red">Red</option>
          <option value="perifericos">Periféricos</option>
          <option value="otro">Otro</option>
        </select>
        <select value={prioridadFiltro} onChange={(e) => setPrioridadFiltro(e.target.value)} className="input w-auto">
          <option value="">Todas las prioridades</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isError ? <div role="alert" className="p-6 text-red-600">No se pudieron cargar los datos. <button onClick={() => refetch()} className="underline">Reintentar</button></div> : isLoading ? (
          <div className="p-6"><SkeletonTable rows={5} /></div>
        ) : fallas.length === 0 ? (
          <EmptyState icon={<AlertTriangle className="w-14 h-14" />} title="Sin fallas registradas" description="Reporta la primera falla para comenzar el seguimiento." action={<button onClick={() => setSlideover(true)} className="btn-primary">+ Reportar falla</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Título', 'Equipo', 'Prioridad', 'Estado', 'Reportado por', 'Técnico', 'Fecha', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagination.visible.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{f.titulo}</p>
                      <span className={`badge mt-1 ${categoriaColor[f.categoria]}`}>{f.categoria}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.equipo.nombre}</td>
                    <td className="px-4 py-3"><span className={`badge ${prioridadColor[f.prioridad]}`}>{f.prioridad}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${estadoFallaColor[f.estado]}`}>{f.estado.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 text-slate-600">{f.reportador.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{f.tecnico?.nombre ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(f.fechaReporte), 'dd MMM yyyy', { locale: es })}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setDetalle(f)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="Ver detalle"><AlertTriangle className="w-4 h-4" /></button>
                        <button onClick={() => setEditando(f)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 transition-colors" title="Editar">✏️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination {...pagination} />
    </div>
  );
}
