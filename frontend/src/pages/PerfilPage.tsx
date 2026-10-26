import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api';
import { useQueryClient } from '@tanstack/react-query';

export default function PerfilPage() {
  const { usuario, setAuth } = useAuthStore();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Mi perfil</h1><p className="text-zinc-400">Actualiza tu nombre o cambia tu contraseña.</p></div>
    <form className="card p-6 max-w-lg space-y-4" onSubmit={async e => {
      e.preventDefault(); const form = e.currentTarget; const values = Object.fromEntries(new FormData(form));
      if (values.password !== values.confirmacion) { setMessage('Las contraseñas nuevas no coinciden.'); return; }
      setBusy(true); setMessage('');
      try { const { data } = await authApi.perfil(values); setAuth(data.data.accessToken, data.data.usuario, data.data.empresa); await qc.invalidateQueries(); form.reset(); setMessage('Perfil actualizado.'); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.'); }
      finally { setBusy(false); }
    }}>
      <label className="label">Nombre<input name="nombre" defaultValue={usuario?.nombre} minLength={2} required className="input mt-1" /></label>
      <p className="text-sm text-zinc-400">{usuario?.email} · {usuario?.rol}</p>
      <hr className="border-zinc-800" /><p className="text-sm">Para cambiar la contraseña, completa estos campos. Si los dejas vacíos, se conserva la actual.</p>
      <label className="label">Contraseña actual<input name="passwordActual" type="password" autoComplete="current-password" className="input mt-1" /></label>
      <label className="label">Nueva contraseña<input name="password" type="password" minLength={8} autoComplete="new-password" className="input mt-1" /></label>
      <label className="label">Confirmar nueva contraseña<input name="confirmacion" type="password" minLength={8} autoComplete="new-password" className="input mt-1" /></label>
      {message && <p role="status" className="text-sm bg-ink p-3 rounded-lg">{message}</p>}
      <button disabled={busy} className="btn-primary">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
    </form></div>;
}
