import { useState } from 'react';

export function usePagination<T>(items: T[], filterKey = '') {
  const [selection, setSelection] = useState({ page: 1, filterKey });
  const pages = Math.max(1, Math.ceil(items.length / 8));
  const page = selection.filterKey === filterKey ? Math.min(selection.page, pages) : 1;
  return { visible: items.slice((page - 1) * 8, page * 8), page, pages, total: items.length, setPage: (next: number) => setSelection({ page: next, filterKey }) };
}

export default function Pagination({ page, pages, total, setPage }: { page: number; pages: number; total: number; setPage: (page: number) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-zinc-400">
    <span>{total} resultados · Página {page} de {pages}</span>
    <div className="flex gap-2"><button className="btn-secondary disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><button className="btn-secondary disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button></div>
  </div>;
}
