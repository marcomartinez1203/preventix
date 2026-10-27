import InteractiveReportChart from './InteractiveReportChart';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { equiposApi } from '../../api';
import type { Equipo } from '../../types';
import { coverageLabel } from './CoverageBadges';
import Pagination, { usePagination } from './Pagination';

export default function CoverageReport() {
  const [filter, setFilter] = useState('');
  const query = useQuery<Equipo[]>({ queryKey: ['reporte-cobertura', filter], queryFn: () => equiposApi.listar(filter ? { cobertura: filter } : {}).then(r => r.data.data) });
  const headers = ['Equipo', 'Garantía hasta', 'Estado de garantía', 'Proveedor de soporte', 'Contrato hasta', 'Estado de contrato'];
  const rows = (query.data ?? []).map(e => [e.nombre, e.garantiaVencimiento || 'Sin registrar', coverageLabel(e.cobertura?.garantia), e.contratoSoporte || 'Sin registrar', e.contratoVencimiento || 'Sin registrar', coverageLabel(e.cobertura?.contrato)]);
  const pagination = usePagination(rows, filter);
  function exportCsv() {
    const cell = (value: string) => `"${value.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'preventix-garantias-contratos.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between items-end gap-4"><label className="label">Coberturas<select className="input mt-1" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todas</option><option value="sin_garantia">Sin garantía vigente</option><option value="por_vencer">Por vencer en 30 días</option><option value="contratos_por_vencer">Contratos por vencer</option><option value="vencidos">Coberturas vencidas</option></select></label><button className="btn-primary" disabled={query.isLoading || query.isError || !rows.length} onClick={exportCsv}>Exportar CSV para Excel</button></div>
    <p className="text-sm text-zinc-400">Equipos sin archivar. «Sin garantía vigente» incluye garantías vencidas y fechas sin registrar.</p>
    {!query.isLoading && !query.isError && <InteractiveReportChart key={filter} title="Vigencia de coberturas" series={[{ key: 'garantia', label: 'Garantías', color: '#ffd400' }, { key: 'contrato', label: 'Contratos', color: '#a1a1aa' }]} rows={(query.data?.length ? ['vigente', 'por_vencer', 'vencida', 'sin_registrar'] : []).map(state => ({ label: ({ vigente: 'Vigentes', por_vencer: 'Por vencer', vencida: 'Vencidas', sin_registrar: 'Sin registrar' } as Record<string, string>)[state], values: { garantia: (query.data ?? []).filter(e => (e.cobertura?.garantia.estado ?? 'sin_registrar') === state).length, contrato: (query.data ?? []).filter(e => (e.cobertura?.contrato.estado ?? 'sin_registrar') === state).length } }))} />}
    {query.isLoading ? <p role="status">Cargando coberturas…</p> : query.isError ? <div role="alert">No se pudieron cargar las coberturas. <button className="btn-secondary" onClick={() => query.refetch()}>Reintentar</button></div> : <div className="card overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Garantías y contratos de soporte</caption><thead><tr>{headers.map(h => <th key={h} scope="col" className="p-4 text-left text-zinc-400">{h}</th>)}</tr></thead><tbody>{pagination.visible.map((row, index) => <tr key={index} className="border-t border-line">{row.map((value, i) => <td key={i} className="p-4">{value}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="p-6 text-zinc-400">No hay equipos con ese filtro.</td></tr>}</tbody></table></div>}
    <Pagination {...pagination} />
  </div>;
}
