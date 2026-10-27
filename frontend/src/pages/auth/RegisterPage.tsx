import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/common/BrandLogo';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { useState } from 'react';

const schema = z.object({
  empresa: z.object({
    nombre: z.string().min(2, 'Nombre de empresa requerido'),
    nit: z.string().optional(),
    emailContacto: z.string().email('Email inválido'),
    telefono: z.string().optional(),
  }),
  admin: z.object({
    nombre: z.string().min(2, 'Tu nombre es requerido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Debe tener una mayúscula').regex(/[0-9]/, 'Debe tener un número'),
  }),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      const res = await authApi.register(data);
      const { accessToken, usuario, empresa } = res.data.data;
      setAuth(accessToken, usuario, empresa);
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Error al registrar');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink to-surface flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <BrandLogo className="mb-4" />
          <p className="text-zinc-400 text-sm mt-1">Registra tu empresa</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-6">Nueva cuenta demo</h2><p className="text-sm text-zinc-400 mb-4">El registro personaliza la empresa de esta demo compartida en tu navegador. Usa datos de prueba.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/25 text-red-400 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">Empresa</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="RegisterPage-register-empresa-nombre" className="label">Nombre de la empresa *</label>
                  <input id="RegisterPage-register-empresa-nombre" {...register('empresa.nombre')} className="input" placeholder="Mi Empresa S.A.S" />
                  {errors.empresa?.nombre && <p className="text-red-400 text-xs mt-1">{errors.empresa.nombre.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="RegisterPage-register-empresa-nit" className="label">NIT</label>
                    <input id="RegisterPage-register-empresa-nit" {...register('empresa.nit')} className="input" placeholder="900123456-7" />
                  </div>
                  <div>
                    <label htmlFor="RegisterPage-register-empresa-telefono" className="label">Teléfono</label>
                    <input id="RegisterPage-register-empresa-telefono" {...register('empresa.telefono')} className="input" placeholder="3001234567" />
                  </div>
                </div>
                <div>
                  <label htmlFor="RegisterPage-register-empresa-emailContacto" className="label">Email de contacto *</label>
                  <input id="RegisterPage-register-empresa-emailContacto" {...register('empresa.emailContacto')} type="email" className="input" placeholder="contacto@empresa.com" />
                  {errors.empresa?.emailContacto && <p className="text-red-400 text-xs mt-1">{errors.empresa.emailContacto.message}</p>}
                </div>
              </div>
            </div>

            <hr className="border-line" />

            <div>
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">Administrador</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="RegisterPage-register-admin-nombre" className="label">Tu nombre *</label>
                  <input id="RegisterPage-register-admin-nombre" {...register('admin.nombre')} className="input" placeholder="Juan Pérez" />
                  {errors.admin?.nombre && <p className="text-red-400 text-xs mt-1">{errors.admin.nombre.message}</p>}
                </div>
                <div>
                  <label htmlFor="RegisterPage-register-admin-email" className="label">Email *</label>
                  <input id="RegisterPage-register-admin-email" {...register('admin.email')} type="email" className="input" placeholder="admin@empresa.com" />
                  {errors.admin?.email && <p className="text-red-400 text-xs mt-1">{errors.admin.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="RegisterPage-register-admin-password" className="label">Contraseña *</label>
                  <input id="RegisterPage-register-admin-password" {...register('admin.password')} type="password" className="input" placeholder="Mín. 8 caracteres, mayúscula y número" />
                  {errors.admin?.password && <p className="text-red-400 text-xs mt-1">{errors.admin.password.message}</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Registrando...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-400 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand hover:underline font-medium">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
