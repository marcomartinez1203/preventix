import type { Equipo, Falla, Mantenimiento } from '../../types';
import InteractiveReportChart from './InteractiveReportChart';

const labels: Record<string, string> = { activo: 'Activos', en_mantenimiento: 'En mantenimiento', fuera_servicio: 'Fuera de servicio', archivado: 'Archivados', desktop: 'Escritorio', laptop: 'Portátiles', servidor: 'Servidores', otro: 'Otros', programado: 'Programados', en_proceso: 'En proceso', completado: 'Completados', cancelado: 'Cancelados', vencido: 'Vencidos', preventivo: 'Preventivos', correctivo: 'Correctivos', hardware: 'Hardware', software: 'Software', red: 'Red', perifericos: 'Periféricos' };
function counts(values: string[]) {
  const groups = new Map<string, number>();
  values.forEach(value => groups.set(value, (groups.get(value) ?? 0) + 1));
  return [...groups].map(([key, count]) => ({ label: labels[key] ?? key, values: { count } }));
}
const series = [{ key: 'count', label: 'Cantidad', color: '#ffd400' }];
export default function ReportCharts({ tipo, equipos, fallas, mantenimientos }: { tipo: string; equipos: Equipo[]; fallas: Falla[]; mantenimientos: Mantenimiento[] }) {
  if (tipo === 'fallas') {
    const categories = [...new Set(fallas.map(f => f.categoria))];
    return <InteractiveReportChart title="Fallas por categoría" series={[{ key: 'pending', label: 'Pendientes', color: '#ffd400' }, { key: 'resolved', label: 'Resueltas / cerradas', color: '#4ade80' }]} rows={categories.map(category => ({ label: labels[category] ?? category, values: { pending: fallas.filter(f => f.categoria === category && ['abierta', 'en_proceso'].includes(f.estado)).length, resolved: fallas.filter(f => f.categoria === category && ['resuelta', 'cerrada'].includes(f.estado)).length } }))} />;
  }
  return <div className="grid lg:grid-cols-2 gap-5">
    <InteractiveReportChart title={tipo === 'equipos' ? 'Equipos por estado' : 'Mantenimientos por estado'} rows={counts(tipo === 'equipos' ? equipos.map(e => e.estado) : mantenimientos.map(m => m.estado))} series={series} />
    <InteractiveReportChart title={tipo === 'equipos' ? 'Tipos de dispositivo' : 'Tipos de mantenimiento'} rows={counts(tipo === 'equipos' ? equipos.map(e => e.tipo) : mantenimientos.map(m => m.tipo))} series={series} />
  </div>;
}
