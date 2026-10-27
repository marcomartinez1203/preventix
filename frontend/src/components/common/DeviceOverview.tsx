import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { equiposApi } from '../../api';
import type { Equipo } from '../../types';
import DeviceStatus, { DeviceIcon, deviceState } from './DeviceStatus';

export default function DeviceOverview() {
  const query = useQuery<Equipo[]>({ queryKey: ['equipos', 'vista-general'], queryFn: () => equiposApi.listar().then(r => r.data.data) });
  const devices = (query.data ?? []).filter(e => !e.archivado && e.estado !== 'archivado').sort((a, b) => deviceState(a).order - deviceState(b).order || a.nombre.localeCompare(b.nombre));
  return <section className="card device-overview">
    <div className="panel-heading"><h2>Tus dispositivos</h2><Link to="/equipos" className="text-link">Ver todos{query.data ? ` (${devices.length})` : ''} →</Link></div>
    <div className="device-legend" aria-label="Leyenda de estados"><span><i className="status-dot status-good" />Operativo</span><span><i className="status-dot status-warning" />Revisión / mantenimiento</span><span><i className="status-dot status-danger" />Fuera de servicio</span></div>
    {query.isLoading ? <div className="device-grid" role="status" aria-label="Cargando dispositivos">{[0, 1, 2, 3].map(i => <div className="h-36 bg-raised rounded-lg animate-pulse" key={i} />)}</div> : query.isError ? <div role="alert" className="panel-message">No se pudieron cargar los dispositivos. <button className="btn-secondary" onClick={() => query.refetch()}>Reintentar</button></div> : !devices.length ? <div className="panel-message"><Link className="text-link" to="/equipos">Registrar primer dispositivo →</Link></div> : <ul className="device-grid">{devices.slice(0, 8).map(e => <li key={e.id}><Link to={`/equipos/${e.id}`} className="device-tile"><DeviceIcon equipo={e} large /><span className="device-name">{e.nombre}</span><DeviceStatus equipo={e} /></Link></li>)}</ul>}
  </section>;
}
