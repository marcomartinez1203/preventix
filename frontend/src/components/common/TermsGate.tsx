import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import BrandLogo from './BrandLogo';

interface Contract { version: string; title: string; accepted: boolean; blocks: { type: string; text?: string; rows?: string[][] }[] }
export default function TermsGate({ children }: { children: React.ReactNode }) {
  const cache = useQueryClient();
  const logout = useAuthStore(s => s.logout);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery<Contract>({ queryKey: ['session-terms'], queryFn: () => authApi.terms().then(r => r.data.data), retry: false, refetchOnWindowFocus: false });
  async function accept() {
    if (!agreed || !query.data) return;
    setBusy(true); setError('');
    try {
      const response = await authApi.acceptTerms(query.data.version);
      if (response.data.data.accessToken) useAuthStore.getState().setAccessToken(response.data.data.accessToken);
      await query.refetch();
    } catch { setError('No se pudo registrar la aceptación. Vuelve a intentarlo.'); }
    finally { setBusy(false); }
  }
  async function reject() {
    setBusy(true); setError('');
    try { await authApi.logout(); cache.clear(); logout(); }
    catch { setError('No se pudo cerrar la sesión. Inténtalo nuevamente; el acceso sigue bloqueado.'); }
    finally { setBusy(false); }
  }
  if (query.data?.accepted && !query.isFetching && !query.isError) return <>{children}</>;
  return <main className="min-h-dvh bg-ink px-4 py-6 sm:py-10"><div className="max-w-3xl mx-auto space-y-6">
    <BrandLogo /><header><h1 className="text-2xl font-semibold">Términos y condiciones</h1><p className="text-sm text-zinc-400 mt-2">Lee las condiciones de uso y acepta para continuar.</p></header>
    {query.isLoading || query.isFetching ? <p role="status">Cargando contrato…</p> : query.isError ? <div role="alert" className="card p-5">No se pudo cargar el contrato. <button className="btn-secondary mt-3" onClick={() => query.refetch()}>Reintentar</button></div> : query.data && <>
      <article aria-label={query.data.title} className="card p-5 sm:p-8 space-y-4 text-sm leading-7 text-zinc-200">
        {query.data.blocks.slice(1).map((block, i) => /^\d+\s/.test(block.text ?? '') ? <h2 key={i} className="font-semibold text-brand pt-3">{block.text}</h2> : <p key={i} className="whitespace-pre-wrap">{block.text}</p>)}
      </article>
      <label className="flex items-start gap-3 text-sm min-h-11 cursor-pointer"><input type="checkbox" checked={agreed} disabled={busy} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-5 h-5 accent-brand shrink-0" /><span>He leído y acepto los términos y condiciones de PREVENTIX.</span></label>
    </>}
    {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
    <div className="flex flex-wrap gap-3 pb-6"><button className="btn-primary" disabled={!agreed || !query.data || query.isError || query.isFetching || busy} onClick={accept}>{busy ? 'Procesando…' : 'Aceptar y entrar'}</button><button className="btn-secondary" disabled={busy} onClick={reject}>No acepto · Cerrar sesión</button></div>
  </div></main>;
}
