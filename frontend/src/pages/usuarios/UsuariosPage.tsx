import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCheck, UserX } from 'lucide-react';
import { usuariosApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { UsuarioResumen, Rol } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// ─── Helpers ────────────────────────────────────
const rolColor: Record<Rol, string> = {
  administrador: 'bg-purple-100 text-purple-700',
  responsable:   'bg-blue-100 text-blue-700',
  tecnico:       'bg-teal-100 text-teal-700',
  consulta:      'bg-slate-100 text-slate-600',
};
const rolDesc: Record<Rol, string> = {
  administrador: 'Gestión completa: usuarios, equipos, configuración',
  responsable:   'Gestiona equipos y mantenimientos asignados',
  tecnico:       'Registra fallas y completa mantenimientos',
  consulta:      'Solo lectura de la información',
};

// ─── Schemas ──────────────────────────────────────
const invitarSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Necesita una mayúscula').regex(/[0-9]/, 'Necesita un número'),
  rol: z.enum(['administrador', 'responsable', 'tecnico', 'consulta']),
});
const editarSchema = z.object({
  nombre: z.string().min(2),
  rol: z.enum(['administrador', 'responsable', 'tecnico', 'consulta']),
  activo: z.boolean(),
});
type InvitarForm = z.infer<typeof invitarSchema>;
type EditarForm = z.infer<typeof editarSchema>;

// ─── Invitar Modal ───────────────────────────────
function InvitarModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InvitarForm>({
    resolver: zodResolver(invitarSchema),
    defaultValues: { rol: 'consulta' },
  });
  const onSubmit = async (data: InvitarForm) => {
    try {
      await usuariosApi.invitar(data);
      toast.success('Usuario creado. No se envía correo.');
      qc.invalidateQueries();
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al invitar usuario'); }
  };
  return (
    <Modal open onClose={onClose} title="Invitar usuario">
      <p className="text-sm text-slate-500 mb-4">Se crea un usuario en el backend. No se envían invitaciones por correo.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nombre completo *</label>
          <input {...register('nombre')} className="input" placeholder="Ej: Juan García" />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" {...register('email')} className="input" placeholder="correo@empresa.com" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Contraseña inicial *</label>
          <input type="password" {...register('password')} className="input" placeholder="Mín. 8 chars, 1 mayúscula, 1 número" />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Rol *</label>
          <select {...register('rol')} className="input">
            <option value="consulta">Consulta</option>
            <option value="tecnico">Técnico</option>
            <option value="responsable">Responsable</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Invitando...' : 'Invitar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Editar Modal ────────────────────────────────
function EditarModal({ usuario, onClose }: { usuario: UsuarioResumen; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const authUser = useAuthStore((s) => s.usuario);
  const esMismoUsuario = authUser?.id === usuario.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditarForm>({
    resolver: zodResolver(editarSchema),
    defaultValues: { nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo },
  });

  const onSubmit = async (data: EditarForm) => {
    try {
      await usuariosApi.actualizar(usuario.id, data);
      toast.success('Usuario actualizado');
      qc.invalidateQueries();
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Error al actualizar'); }
  };

  return (
    <Modal open onClose={onClose} title={`Editar · ${usuario.nombre}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input {...register('nombre')} className="input" />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
        </div>
        <div>
          <label className="label">Rol</label>
          <select {...register('rol')} className="input" disabled={esMismoUsuario}>
            <option value="consulta">Consulta</option>
            <option value="tecnico">Técnico</option>
            <option value="responsable">Responsable</option>
            <option value="administrador">Administrador</option>
          </select>
          {esMismoUsuario && <p className="text-xs text-slate-400 mt-1">No puedes cambiar tu propio rol</p>}
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-slate-700">Estado del usuario</p>
            <p className="text-xs text-slate-400">Desactivar impide el acceso</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" {...register('activo')} disabled={esMismoUsuario} className="sr-only peer" />
            <div className="w-10 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full peer transition-colors peer-disabled:opacity-50" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────
export default function UsuariosPage() {
  const { usuario: authUser } = useAuthStore();
  const [invitarOpen, setInvitarOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioResumen | null>(null);

  const { data: usuarios = [], isLoading } = useQuery<UsuarioResumen[]>({
    queryKey: ['usuarios'],
    queryFn: () => usuariosApi.listar().then((r) => r.data.data ?? r.data),
  });

  if (authUser?.rol !== 'administrador') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-lg font-medium text-slate-700">Acceso restringido</p>
          <p className="text-sm text-slate-400 mt-1">Solo administradores pueden gestionar usuarios</p>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      {invitarOpen && <InvitarModal onClose={() => setInvitarOpen(false)} />}
      {editando && <EditarModal usuario={editando} onClose={() => setEditando(null)} />}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setInvitarOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Invitar usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><SkeletonTable rows={4} /></div>
        ) : usuarios.length === 0 ? (
          <EmptyState title="Sin usuarios" description="Invita al primer miembro de tu equipo." action={<button onClick={() => setInvitarOpen(true)} className="btn-primary">+ Invitar</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Usuario', 'Rol', 'Tipo', 'Estado', 'Último acceso', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.nombre}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${rolColor[u.rol]}`}>{u.rol}</span></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.esTecnicoExterno ? 'Técnico externo' : 'Interno'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.activo ? <><UserCheck className="w-3 h-3 inline mr-1" />Activo</> : <><UserX className="w-3 h-3 inline mr-1" />Inactivo</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.ultimoAcceso ? format(new Date(u.ultimoAcceso), 'dd MMM yyyy', { locale: es }) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditando(u)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabla de roles */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Descripción de roles</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100"><th className="text-left py-2 px-3 text-slate-500 font-medium">Rol</th><th className="text-left py-2 px-3 text-slate-500 font-medium">Permisos</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {(Object.keys(rolDesc) as Rol[]).map((r) => (
                <tr key={r}>
                  <td className="py-2.5 px-3"><span className={`badge ${rolColor[r]}`}>{r}</span></td>
                  <td className="py-2.5 px-3 text-slate-600">{rolDesc[r]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
