import DeviceStatus, { DeviceIcon } from '../../components/common/DeviceStatus';
import CoverageBadges from '../../components/common/CoverageBadges';
import EquipmentRisk from '../../components/common/EquipmentRisk';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { equiposApi, fallasApi, mantenimientosApi } from '../../api';
import type { Equipo, Falla, HistorialEquipoItem, Mantenimiento } from '../../types';
import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import MaintenanceSuggestion from '../../components/common/MaintenanceSuggestion';
import { useAuthStore } from '../../stores/authStore';

export default function EquipoDetallePage() {
  const { id = '' } = useParams();
  const [suggesting, setSuggesting] = useState(false);
  const role = useAuthStore(s => s.usuario?.rol);
  const equipo = useQuery<Equipo>({ queryKey: ['equipo', id], queryFn: () => equiposApi.obtener(id).then(r => r.data.data) });
  const fallas = useQuery<Falla[]>({ queryKey: ['fallas-equipo', id], queryFn: () => fallasApi.listar({ equipoId: id }).then(r => r.data.data) });
  const mant = useQuery<Mantenimiento[]>({ queryKey: ['mantenimientos-equipo', id], queryFn: () => mantenimientosApi.listar({ equipoId: id }).then(r => r.data.data) });
  const historial = useQuery<HistorialEquipoItem[]>({ queryKey: ['historial', id], queryFn: () => equiposApi.historial(id).then(r => r.data.data) });
  if (equipo.isLoading) return <p role="status">Cargando equipo…</p>;
  if (!equipo.data) return <div className="card p-6 space-y-4"><p>No se encontró este equipo.</p><Link to="/equipos" className="text-brand">Volver a equipos</Link></div>;
  const e = equipo.data;
  const fields = { Tipo: e.tipo, Marca: e.marca, Modelo: e.modelo, Serie: e.numeroSerie, Procesador: e.procesador, 'RAM (GB)': e.ramGb, 'Almacenamiento (GB)': e.almacenamientoGb, 'Sistema operativo': e.sistemaOperativo, Sede: e.sede?.nombre, Responsable: e.responsable?.nombre, 'Usuario asignado': e.usuarioAsignado?.nombre, Adquisición: e.fechaAdquisicion ? new Date(e.fechaAdquisicion).toLocaleDateString('es-CO') : undefined };
  return <div className="space-y-6"><Link to="/equipos" className="text-sm text-brand">← Volver a equipos</Link><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-4"><DeviceIcon equipo={e} large /><div><h1 className="text-2xl font-bold">{e.nombre}</h1><DeviceStatus equipo={e} /></div></div></div>{['administrador', 'responsable', 'tecnico'].includes(role ?? '') && !e.archivado && !['archivado', 'fuera_servicio'].includes(e.estado) && <button className="btn-primary inline-flex items-center gap-2" onClick={() => setSuggesting(true)}><CalendarPlus size={18} />Sugerir mantenimiento</button>}</div>
    {suggesting && <MaintenanceSuggestion key={e.id} equipo={e} onClose={() => setSuggesting(false)} />}
        <section className="card p-6"><h2 className="font-semibold mb-4">Garantías y contratos</h2><CoverageBadges equipo={e} /><dl className="grid sm:grid-cols-3 gap-4 mt-4 text-sm"><div><dt className="text-zinc-400">Garantía hasta</dt><dd>{e.garantiaVencimiento || 'Sin registrar'}</dd></div><div><dt className="text-zinc-400">Proveedor de soporte</dt><dd>{e.contratoSoporte || 'Sin registrar'}</dd></div><div><dt className="text-zinc-400">Contrato hasta</dt><dd>{e.contratoVencimiento || 'Sin registrar'}</dd></div></dl><p className="text-xs text-zinc-400 mt-4">La cobertura se considera vigente durante todo el día de vencimiento. Edita sus datos desde el inventario.</p></section>
    <EquipmentRisk equipoId={e.id} /><section className="card p-6"><h2 className="font-semibold mb-4">Información técnica</h2><dl className="grid grid-cols-2 md:grid-cols-3 gap-5">{Object.entries(fields).map(([label, value]) => <div key={label}><dt className="text-sm text-zinc-400">{label}</dt><dd className="font-medium break-words">{value ?? 'Sin registrar'}</dd></div>)}</dl>{e.notas && <p className="mt-5 text-sm whitespace-pre-wrap">{e.notas}</p>}</section>
    <div className="grid lg:grid-cols-2 gap-6">{[{ title: 'Fallas registradas', query: fallas, link: '/fallas' }, { title: 'Mantenimientos', query: mant, link: '/mantenimientos' }].map(({ title, query, link }) => <section key={title} className="card p-5"><h2 className="font-semibold mb-3">{title}</h2>{query.isLoading ? <p>Cargando…</p> : !query.data?.length ? <p className="text-sm text-zinc-400">Sin registros.</p> : <ul className="divide-y divide-zinc-800">{query.data.map(item => <li key={item.id} className="py-3"><p>{item.titulo}</p><span className="text-sm text-zinc-400">{item.estado.replaceAll('_', ' ')}</span></li>)}</ul>}<Link to={link} className="text-sm text-brand inline-block mt-3">Gestionar {title.toLowerCase()} →</Link></section>)}</div>
    <section className="card p-6"><h2 className="font-semibold mb-4">Línea de tiempo</h2><ol className="space-y-4 border-l-2 border-brand/20 pl-4">{historial.data?.map(h => <li key={h.id}><p className="text-sm font-medium">{h.descripcion}</p><p className="text-xs text-zinc-400">{h.usuario.nombre} · {new Date(h.createdAt).toLocaleString('es-CO')}</p></li>)}</ol></section>
  </div>;
}
