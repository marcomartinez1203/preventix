import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Monitor, Wrench, ShieldCheck } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
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
  const [showPassword, setShowPassword] = useState(false);
  const [demoFilled, setDemoFilled] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'demo@preventix.com', password: '' },
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
      setError(e?.response?.data?.message || 'No se pudo iniciar sesión. Comprueba tu conexión y vuelve a intentarlo.');
    }
  };

  return (
    <div className="auth-page min-h-dvh flex items-center justify-center px-5 py-8 sm:px-10 lg:py-12">
      <div className="w-full max-w-6xl grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center">
        <section className="relative hidden lg:block space-y-8">
          <div className="flex items-center gap-5">
            <BrandLogo className="!w-[146px] !h-[120px]" />
            <span className="eyebrow max-w-32 leading-5">Gestión de mantenimiento</span>
          </div>
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08]">Anticípate.<br />Mantén el <span className="text-brand">control.</span></h1>
            <p className="text-zinc-400 mt-5 text-base lg:text-lg max-w-md leading-relaxed">Tus equipos, fallas y mantenimientos en un solo lugar. Menos imprevistos. Más tiempo para lo que importa.</p>
          </div>
          <div className="hidden lg:grid gap-4">
            {[
              { icon: Monitor, title: 'Conoce tu inventario', description: 'Cada equipo y su información, siempre a mano.' },
              { icon: Wrench, title: 'Planifica con tiempo', description: 'Organiza el mantenimiento y evita interrupciones.' },
              { icon: ShieldCheck, title: 'Sigue cada detalle', description: 'Consulta el historial y toma decisiones informadas.' },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/15 flex items-center justify-center text-brand shrink-0"><Icon className="w-5 h-5" strokeWidth={1.7} /></div>
                <div><p className="text-sm font-semibold text-zinc-100">{title}</p><p className="text-sm text-zinc-400 mt-0.5">{description}</p></div>
              </div>
            ))}
          </div>
        </section>
        <section className="card auth-card p-5 sm:p-9 lg:p-10 w-full max-w-lg mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-6"><BrandLogo compact /><span className="text-lg font-semibold">Preventix</span></div>
          <p className="eyebrow mb-3">Tu espacio de trabajo</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Bienvenido de nuevo</h2>
          <p className="text-zinc-400 text-sm mt-2 mb-8">Ingresa para tener todo bajo control.</p>
          {error && <div role="alert" className="mb-5 p-3 bg-red-400/10 border border-red-400/25 text-red-300 rounded-xl text-sm">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input id="email" {...register('email')} type="email" className="input" placeholder="tu@empresa.com" autoComplete="username" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />
              {errors.email && <p id="email-error" className="text-red-400 text-xs mt-2">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <input id="password" {...register('password')} type={showPassword ? 'text' : 'password'} className="input pr-12" placeholder="Tu contraseña" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} />
                <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 min-w-11 px-3 text-zinc-400 hover:text-brand rounded-r-xl">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
              {errors.password && <p id="password-error" className="text-red-400 text-xs mt-2">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full !py-3 flex items-center justify-center gap-3 mt-2">{isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}<ArrowRight className="w-4 h-4" /></button>
          </form>
          <button type="button" disabled={isSubmitting} className="btn-secondary w-full mt-3" onClick={() => { setValue('email', 'demo@preventix.com', { shouldValidate: true }); setValue('password', 'Demo1234', { shouldValidate: true }); setDemoFilled(true); setError(''); }}>Completar con cuenta demo</button>
          {demoFilled && <p role="status" className="text-xs text-zinc-400 mt-3">Datos de ejemplo listos. Pulsa Iniciar sesión.</p>}
          <details className="mt-5 rounded-xl border border-line bg-ink p-4 text-sm">
            <summary className="font-medium text-zinc-300">Acceso de demostración</summary>
            <div className="mt-3 space-y-1 text-zinc-400"><p>Correo: <span className="text-zinc-100 select-all">demo@preventix.com</span></p><p>Contraseña: <span className="text-zinc-100 select-all">Demo1234</span></p></div>
          </details>
          <div className="flex items-center justify-center gap-2 mt-6 text-xs text-zinc-400"><ShieldCheck className="w-4 h-4 text-brand" />Tu mantenimiento, bajo control.</div>
        </section>
      </div>
    </div>
  );
}
