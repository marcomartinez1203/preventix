import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'demo@preventix.com', password: 'Demo1234' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      const res = await authApi.login(data);
      const { accessToken, usuario, empresa } = res.data.data;
      setAuth(accessToken, usuario, empresa);
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'No se pudo conectar con el backend. Inicia el programa con npm run dev.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Preventix</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de mantenimiento de equipos</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Iniciar sesión</h2>
          <div className="mb-6 rounded-xl bg-blue-50 p-4 space-y-2">
            <p className="text-sm text-blue-900">Usuario predefinido para la sustentación</p>
            <p className="text-sm text-slate-600">Correo: <strong>demo@preventix.com</strong><br />Contraseña: <strong>Demo1234</strong></p>
            <p className="text-xs text-slate-500">Inicia sesión para gestionar los equipos de ejemplo.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input
                id="email" {...register('email')}
                type="email"
                className="input"
                placeholder="tu@empresa.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <input
                id="password" {...register('password')}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
