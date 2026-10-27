import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { equiposApi, mantenimientosApi, usuariosApi } from '../../api';
import type { Equipo, UsuarioResumen } from '../../types';
import SlideOver from './SlideOver';
import { useToast } from '../../hooks/useToast';

interface Suggestion {
  frecuenciaDias: number; mtbfDias: number | null; totalFallas: number;
  fechaProgramada: string; fechaBase: string; base: string; justificacion: string; atrasado: boolean;
  pendiente: { id: string; estado: string; fechaProgramada: string } | null;
}
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export default function MaintenanceSuggestion({ equipo, onClose }: { equipo: Equipo; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [date, setDate] = useState('');
  const [owner, setOwner] = useState(equipo.responsable?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const suggestion = useQuery<Suggestion>({ queryKey: ['sugerencia-mantenimiento', equipo.id], queryFn: () => equiposApi.sugerencia(equipo.id).then(r => r.data.data) });
  const users = useQuery<UsuarioResumen[]>({ queryKey: ['usuarios'], queryFn: () => usuariosApi.listar().then(r => r.data.data) });
  const activeUsers = users.data?.filter(u => u.activo) ?? [];
  const selectedOwner = activeUsers.some(u => u.id === owner) ? owner : '';
  const data = suggestion.data;
  const selectedDate = date || data?.fechaProgramada || '';
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || saving || data.pendiente || !selectedOwner || selectedDate < today()) return;
    setSaving(true); setError('');
    try {
      await mantenimientosApi.crear({ equipoId: equipo.id, responsableId: selectedOwner, titulo: `Revisión preventiva · ${equipo.nombre}`, tipo: 'preventivo', fechaProgramada: selectedDate, sugerido: true, observaciones: `${data.justificacion} Fecha de referencia: ${data.fechaBase}.` });
      void qc.invalidateQueries();
      toast.success('Mantenimiento preventivo programado');
      onClose();
    } catch (err: unknown) {
      const failure = err as { response?: { data?: { message?: string }; status?: number } };
      setError(failure.response?.data?.message || 'No se pudo programar. Intenta nuevamente.');
      if (failure.response?.status === 409) void suggestion.refetch();
    } finally { setSaving(false); }
  }
  return <SlideOver open onClose={() => { if (!saving) onClose(); }} title="Sugerir mantenimiento">
    <p className="text-sm text-zinc-400 mb-5">{equipo.nombre}</p>
    {suggestion.isLoading || users.isLoading ? <p role="status">Calculando sugerencia…</p> : suggestion.isError || users.isError ? <div role="alert"><p>No se pudo cargar la sugerencia o los responsables.</p><button className="btn-secondary mt-4" onClick={() => { void suggestion.refetch(); void users.refetch(); }}>Reintentar</button></div> : data && <>
      <section className="card p-5 mb-6"><h3 className="text-base font-semibold">Revisión cada {data.frecuenciaDias} días</h3><p className="text-sm text-zinc-300 mt-3">{data.justificacion}</p><p className="text-xs text-zinc-400 mt-3">{data.base}: {data.fechaBase}. Es una recomendación por reglas, no una predicción de fallas.</p>{data.atrasado && <p className="text-sm text-brand mt-3">El intervalo ya se cumplió. La fecha propuesta es hoy.</p>}</section>
      {error && <p role="alert" className="text-sm text-red-300 mb-4">{error}</p>}
      {data.pendiente ? <div role="status"><p className="text-sm">Ya existe un preventivo {data.pendiente.estado.replaceAll('_', ' ')}. Revisa esa tarea antes de crear otra.</p><Link to="/mantenimientos" className="btn-secondary inline-flex mt-4">Ver mantenimientos</Link></div> : <form onSubmit={submit} className="space-y-5">
        <div><label htmlFor="suggested-date" className="label">Fecha propuesta</label><input id="suggested-date" type="date" className="input" required min={today()} value={selectedDate} onChange={e => setDate(e.target.value)} disabled={saving} /></div>
        <div><label htmlFor="suggested-owner" className="label">Responsable</label><select id="suggested-owner" className="input" required value={selectedOwner} onChange={e => setOwner(e.target.value)} disabled={saving}><option value="">Seleccionar responsable</option>{activeUsers.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>{!activeUsers.length && <p className="text-sm text-zinc-400 mt-2">No hay responsables activos disponibles.</p>}</div>
        <p className="text-sm text-zinc-400">Se creará una tarea preventiva. La frecuencia es orientativa; no crea tareas recurrentes.</p>
        <div className="flex gap-3"><button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="btn-primary flex-1" disabled={saving || !selectedOwner}>{saving ? 'Programando…' : 'Aceptar y programar'}</button></div>
      </form>}
    </>}
  </SlideOver>;
}
