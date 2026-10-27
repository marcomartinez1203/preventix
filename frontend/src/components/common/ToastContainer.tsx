import type { Toast } from '../../hooks/useToast';
import { dismissToast } from '../../hooks/useToast';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useState } from 'react';

interface ToastContainerProps {
  toasts: Toast[];
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-brand" />,
};

const colors = {
  success: 'border-emerald-400/25',
  error: 'border-red-400/25',
  info: 'border-brand/25',
};

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div data-toast-region className="toast-region fixed left-4 right-4 sm:left-auto sm:right-6 z-[70] flex flex-col gap-2 sm:w-96 max-h-[50dvh] overflow-y-auto">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className={`flex items-start gap-3 p-3 rounded-2xl border shadow-xl bg-elevated ${colors[t.type]}`}>
    <div className="pt-2" aria-hidden="true">{icons[t.type]}</div>
    <div className="flex-1 min-w-0 py-2"><p role={t.type === 'error' ? 'alert' : 'status'} className="text-sm text-zinc-100">{t.message}</p>{t.action && <button disabled={busy} className="mt-2 min-h-11 px-3 rounded-xl border border-line text-sm font-semibold text-brand hover:bg-raised" onClick={async () => {
      setBusy(true); setError('');
      try { await t.action!.onClick(); dismissToast(t.id); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la acción. Inténtalo otra vez.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Procesando…' : t.action.label}</button>}{error && <p role="alert" className="text-xs text-red-300 mt-2">{error}</p>}</div>
    <button aria-label="Cerrar aviso" className="icon-button" onClick={() => dismissToast(t.id)}><X className="w-4 h-4" /></button>
  </div>;
}
