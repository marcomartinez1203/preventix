import { Laptop, Monitor, Server, Shapes } from 'lucide-react';
import type { Equipo } from '../../types';

export function deviceState(equipo: Equipo) {
  if (equipo.archivado || equipo.estado === 'archivado') return { tone: 'neutral', label: 'Archivado', order: 3 };
  if (equipo.estado === 'fuera_servicio') return { tone: 'danger', label: 'Fuera de servicio', order: 0 };
  if (equipo.estado === 'en_mantenimiento') return { tone: 'warning', label: 'En mantenimiento', order: 1 };
  if (equipo.sugerenciaMantenimiento?.recomendado) return { tone: 'warning', label: 'Requiere revisión', order: 1 };
  if (equipo.estado === 'activo') return { tone: 'good', label: 'Operativo', order: 2 };
  return { tone: 'neutral', label: 'Sin estado', order: 3 };
}

export function DeviceIcon({ equipo, large = false }: { equipo: Equipo; large?: boolean }) {
  const Icon = { desktop: Monitor, laptop: Laptop, servidor: Server, otro: Shapes }[equipo.tipo] || Shapes;
  const state = deviceState(equipo);
  return <span className={`device-icon ${large ? 'device-icon-large' : ''}`} aria-hidden="true"><Icon strokeWidth={1.5} /><span key={state.label} className={`status-dot device-signal status-${state.tone}`} /></span>;
}

export default function DeviceStatus({ equipo }: { equipo: Equipo }) {
  const state = deviceState(equipo);
  return <span className={`device-status status-text-${state.tone}`}><span className={`status-dot status-${state.tone}`} aria-hidden="true" />{state.label}</span>;
}
