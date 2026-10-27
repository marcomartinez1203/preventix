import type { Equipo, Cobertura } from '../../types';
export function coverageLabel(coverage?: Cobertura) {
  if (!coverage || coverage.estado === 'sin_registrar') return 'Sin registrar';
  if (coverage.estado === 'vencida') return 'Vencida';
  if (coverage.diasRestantes === 0) return 'Vence hoy';
  if (coverage.estado === 'por_vencer') return `Vence en ${coverage.diasRestantes} días`;
  return 'Vigente';
}
export default function CoverageBadges({ equipo }: { equipo: Equipo }) {
  return <div className="space-y-1 text-xs">{(['garantia', 'contrato'] as const).map(kind => {
    const status = equipo.cobertura?.[kind];
    return <p key={kind} className={status?.estado === 'vencida' ? 'text-red-300' : status?.estado === 'por_vencer' ? 'text-brand' : 'text-zinc-400'}>{kind === 'garantia' ? 'Garantía' : 'Soporte'}: {coverageLabel(status)}</p>;
  })}</div>;
}
