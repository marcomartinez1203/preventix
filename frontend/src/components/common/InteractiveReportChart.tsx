import { useState } from 'react';

export interface ChartRow { label: string; values: Record<string, number | null> }
export interface ChartSeries { key: string; label: string; color: string }

/** Native buttons keep the chart usable with keyboard, touch and screen readers. */
export default function InteractiveReportChart({ title, rows, series, currency, framed = true }: {
  title: string; rows: ChartRow[]; series: ChartSeries[]; currency?: string; framed?: boolean;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const visible = series.filter(s => !hidden.includes(s.key));
  const max = Math.max(1, ...rows.flatMap(r => visible.map(s => r.values[s.key] ?? 0)));
  const format = (n: number | null | undefined) => n == null ? 'Sin límite registrado' : new Intl.NumberFormat('es-CO', currency ? { style: 'currency', currency, maximumFractionDigits: 2 } : {}).format(n);
  const detail = rows.find(r => r.label === selected);
  return <section className={`${framed ? 'card p-5 sm:p-6 ' : ''}report-chart${currency ? ' chart-currency' : ''}`} aria-label={title}>
    <header className="flex flex-wrap items-center justify-between gap-3 mb-3"><h2 className="font-semibold">{title}</h2>{detail && <button className="text-link" onClick={() => setSelected(null)}>Quitar selección</button>}</header>
    <div className="chart-legend">{series.map(s => <button type="button" key={s.key} aria-pressed={!hidden.includes(s.key)} onClick={() => setHidden(current => current.includes(s.key) ? current.filter(k => k !== s.key) : [...current, s.key])}><span style={{ background: s.color }} aria-hidden="true" />{s.label}</button>)}</div>
    <p className="text-xs text-zinc-400 mb-4">Toca una barra para ver el detalle. Usa la leyenda para comparar series.</p>
    {!rows.length ? <p className="text-sm text-zinc-400 py-6">Sin datos para estos filtros.</p> : !visible.length ? <p className="text-sm text-zinc-400 py-6">Activa una serie en la leyenda.</p> : <ul className="chart-rows">{rows.map(row => <li key={row.label}><button type="button" className="chart-row" aria-pressed={selected === row.label} onClick={() => setSelected(selected === row.label ? null : row.label)} aria-label={`${row.label}. ${visible.map(s => `${s.label}: ${format(row.values[s.key])}`).join('. ')}`}>
      <span className="chart-category">{row.label}</span><span className="chart-bars">{visible.map(s => <span className="chart-series" key={s.key}><span className="chart-track" aria-hidden="true"><span style={{ background: s.color, transform: `scaleX(${Math.max(0, row.values[s.key] ?? 0) / max})` }} /></span><span className="chart-value">{format(row.values[s.key])}</span></span>)}</span>
    </button></li>)}</ul>}
    <div aria-live="polite" aria-atomic="true">{detail && <div className="chart-detail"><h3 className="font-medium text-sm">{detail.label}</h3><dl className="flex flex-wrap gap-x-6 gap-y-3 mt-3">{series.map(s => <div key={s.key}><dt className="text-xs text-zinc-400">{s.label}</dt><dd className="text-sm tabular-nums mt-1">{format(detail.values[s.key])}</dd></div>)}</dl></div>}</div>
  </section>;
}
