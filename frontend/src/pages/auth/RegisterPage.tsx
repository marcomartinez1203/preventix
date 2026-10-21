import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Preventix</h1>
          <p className="text-slate-400 text-sm mt-1">Registra tu empresa</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Nueva cuenta demo</h2><p className="text-sm text-slate-500 mb-4">El registro personaliza la empresa de esta demo compartida en tu navegador. Usa datos de prueba.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Empresa</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Nombre de la empresa *</label>
                  <input {...register('empresa.nombre')} className="input" placeholder="Mi Empresa S.A.S" />
                  {errors.empresa?.nombre && <p className="text-red-500 text-xs mt-1">{errors.empresa.nombre.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">NIT</label>
                    <input {...register('empresa.nit')} className="input" placeholder="900123456-7" />
                  </div>
                  <div>
                    <label className="label">Teléfono</label>
                    <input {...register('empresa.telefono')} className="input" placeholder="3001234567" />
                  </div>
                </div>
                <div>
                  <label className="label">Email de contacto *</label>
                  <input {...register('empresa.emailContacto')} type="email" className="input" placeholder="contacto@empresa.com" />
                  {errors.empresa?.emailContacto && <p className="text-red-500 text-xs mt-1">{errors.empresa.emailContacto.message}</p>}
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Administrador</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Tu nombre *</label>
                  <input {...register('admin.nombre')} className="input" placeholder="Juan Pérez" />
                  {errors.admin?.nombre && <p className="text-red-500 text-xs mt-1">{errors.admin.nombre.message}</p>}
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input {...register('admin.email')} type="email" className="input" placeholder="admin@empresa.com" />
                  {errors.admin?.email && <p className="text-red-500 text-xs mt-1">{errors.admin.email.message}</p>}
                </div>
                <div>
                  <label className="label">Contraseña *</label>
                  <input {...register('admin.password')} type="password" className="input" placeholder="Mín. 8 caracteres, mayúscula y número" />
                  {errors.admin?.password && <p className="text-red-500 text-xs mt-1">{errors.admin.password.message}</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Registrando...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
