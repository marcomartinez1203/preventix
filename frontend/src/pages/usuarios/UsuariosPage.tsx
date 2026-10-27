import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCheck, UserX, LockKeyhole } from 'lucide-react';
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
  administrador: 'bg-zinc-700/50 text-zinc-300',
  responsable:   'bg-brand/15 text-brand',
  tecnico:       'bg-emerald-400/10 text-emerald-400',
  consulta:      'bg-raised text-zinc-300',
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
      <p className="text-sm text-zinc-400 mb-4">Se crea un usuario en el backend. No se envían invitaciones por correo.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="InvitarModal-register-nombre" className="label">Nombre completo *</label>
          <input id="InvitarModal-register-nombre" {...register('nombre')} className="input" placeholder="Ej: Juan García" />
          {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
        </div>
        <div>
          <label htmlFor="InvitarModal-register-email" className="label">Email *</label>
          <input id="InvitarModal-register-email" type="email" {...register('email')} className="input" placeholder="correo@empresa.com" />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="InvitarModal-register-password" className="label">Contraseña inicial *</label>
          <input id="InvitarModal-register-password" type="password" {...register('password')} className="input" placeholder="Mín. 8 chars, 1 mayúscula, 1 número" />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label htmlFor="InvitarModal-register-rol" className="label">Rol *</label>
          <select id="InvitarModal-register-rol" {...register('rol')} className="input">
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
          <label htmlFor="EditarModal-register-nombre" className="label">Nombre</label>
          <input id="EditarModal-register-nombre" {...register('nombre')} className="input" />
          {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
        </div>
        <div>
          <label htmlFor="EditarModal-register-rol" className="label">Rol</label>
          <select id="EditarModal-register-rol" {...register('rol')} className="input" disabled={esMismoUsuario}>
            <option value="consulta">Consulta</option>
            <option value="tecnico">Técnico</option>
            <option value="responsable">Responsable</option>
            <option value="administrador">Administrador</option>
          </select>
          {esMismoUsuario && <p className="text-xs text-zinc-400 mt-1">No puedes cambiar tu propio rol</p>}
        </div>
        <div className="flex items-center justify-between p-3 bg-ink rounded-lg">
          <div>
            <p className="text-sm font-medium text-zinc-200">Estado del usuario</p>
            <p className="text-xs text-zinc-400">Desactivar impide el acceso</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" {...register('activo')} disabled={esMismoUsuario} className="sr-only peer" />
            <div className="w-10 h-6 bg-zinc-600 peer-checked:bg-brand rounded-full peer transition-colors peer-disabled:opacity-50" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-zinc-200 rounded-full transition-transform peer-checked:translate-x-4" />
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
          <LockKeyhole className="w-6 h-6 mb-3 mx-auto text-zinc-400" aria-hidden="true" />
          <p className="text-lg font-medium text-zinc-200">Acceso restringido</p>
          <p className="text-sm text-zinc-400 mt-1">Solo administradores pueden gestionar usuarios</p>
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
          <h1 className="text-2xl font-bold text-zinc-100">Gestión de Usuarios</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
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
                <tr className="border-b border-line bg-ink">
                  {['Usuario', 'Rol', 'Tipo', 'Estado', 'Último acceso', 'Acciones'].map((h) => (
                    <th scope="col" key={h} className="text-left text-xs font-medium text-zinc-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-ink transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand/15 text-brand rounded-full flex items-center justify-center font-semibold text-sm">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{u.nombre}</p>
                          <p className="text-xs text-zinc-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${rolColor[u.rol]}`}>{u.rol}</span></td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{u.esTecnicoExterno ? 'Técnico externo' : 'Interno'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.activo ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                        {u.activo ? <><UserCheck className="w-3 h-3 inline mr-1" />Activo</> : <><UserX className="w-3 h-3 inline mr-1" />Inactivo</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {u.ultimoAcceso ? format(new Date(u.ultimoAcceso), 'dd MMM yyyy', { locale: es }) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditando(u)} className="text-xs text-brand hover:underline">Editar</button>
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
        <h2 className="font-semibold text-zinc-100 mb-4">Descripción de roles</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800"><th className="text-left py-2 px-3 text-zinc-400 font-medium">Rol</th><th className="text-left py-2 px-3 text-zinc-400 font-medium">Permisos</th></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {(Object.keys(rolDesc) as Rol[]).map((r) => (
                <tr key={r}>
                  <td className="py-2.5 px-3"><span className={`badge ${rolColor[r]}`}>{r}</span></td>
                  <td className="py-2.5 px-3 text-zinc-300">{rolDesc[r]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
