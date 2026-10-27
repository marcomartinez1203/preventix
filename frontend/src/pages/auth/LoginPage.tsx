import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import { useState } from 'react';

const schema = z.object({ email: z.string().email('Email inválido'), password: z.string().min(1, 'Contraseña requerida') });
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [demoFilled, setDemoFilled] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: 'demo@preventix.com', password: '' } });
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
  return <main className="auth-page">
    <div className="auth-shell">
      <section className="auth-intro" aria-label="Preventix, gestión de mantenimiento">
        <BrandLogo />
        <div className="auth-story"><p className="auth-statement">Cada equipo tiene<br />una historia.</p><p className="auth-description">Del primer registro a la próxima revisión. Mantén el inventario, las fallas y el trabajo de tu equipo en un mismo lugar.</p></div>
        <dl className="auth-workflow"><div><dt>Inventario</dt><dd>Conoce lo que tienes.</dd></div><div><dt>Mantenimiento</dt><dd>Atiende lo que sigue.</dd></div><div><dt>Historial</dt><dd>Decide con lo que sabes.</dd></div></dl>
        <p className="auth-caption">Preventix · Gestión de equipos de cómputo</p>
      </section>
      <section className="auth-form-panel">
        <div className="auth-mobile-brand"><BrandLogo /></div>
        <header><h1>Iniciar sesión</h1><p>Entra a tu espacio de mantenimiento.</p></header>
        {error && <div role="alert" className="mb-5 p-3 bg-red-400/10 text-red-300 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div><label htmlFor="email" className="label">Correo electrónico</label><input id="email" {...register('email')} type="email" className="input" placeholder="tu@empresa.com" autoComplete="username" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <p id="email-error" className="text-red-400 text-xs mt-2">{errors.email.message}</p>}</div>
          <div><label htmlFor="password" className="label">Contraseña</label><div className="relative"><input id="password" {...register('password')} type={showPassword ? 'text' : 'password'} className="input pr-12" placeholder="Tu contraseña" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 min-w-11 px-3 text-zinc-400 hover:text-white rounded-r-lg">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password && <p id="password-error" className="text-red-400 text-xs mt-2">{errors.password.message}</p>}</div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-between gap-3">{isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}<ArrowRight size={17} aria-hidden="true" /></button>
        </form>
        <div className="auth-demo"><h2>Prueba Preventix</h2><p>Explora el programa con una cuenta de demostración.</p><button type="button" disabled={isSubmitting} className="btn-secondary w-full mt-4" onClick={() => { setValue('email', 'demo@preventix.com', { shouldValidate: true }); setValue('password', 'Demo1234', { shouldValidate: true }); setDemoFilled(true); setError(''); }}>Completar con cuenta demo</button>{demoFilled && <p role="status" className="mt-3">Datos de ejemplo listos. Pulsa Iniciar sesión.</p>}<details className="mt-4 text-sm"><summary className="text-zinc-400">Ver credenciales de prueba</summary><div className="mt-3 text-sm space-y-1 text-zinc-300"><p className="select-all">demo@preventix.com</p><p className="select-all">Demo1234</p></div></details></div>
      </section>
    </div>
  </main>;
}
