import type { ReactNode } from 'react';

interface RecordCardProps {
  title: ReactNode;
  subtitle?: string;
  badges?: ReactNode;
  fields: { label: string; value: ReactNode }[];
  actions: ReactNode;
}

// The compact counterpart of a data-table row, with the same actions.
export default function RecordCard({ title, subtitle, badges, fields, actions }: RecordCardProps) {
  return <article className="record-card">
    <header className="space-y-2"><h2 className="text-base font-semibold break-words leading-snug">{title}</h2>{subtitle && <p className="text-sm text-zinc-400 break-words">{subtitle}</p>}{badges && <div className="flex flex-wrap gap-2">{badges}</div>}</header>
    <dl className="grid grid-cols-2 gap-x-5 gap-y-3 mt-4">{fields.map(({ label, value }) => <div key={label} className="min-w-0"><dt className="text-xs text-zinc-400 mb-1">{label}</dt><dd className="text-sm text-zinc-200 break-words">{value === '' || value == null ? '—' : value}</dd></div>)}</dl>
    <footer className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-line">{actions}</footer>
  </article>;
}
