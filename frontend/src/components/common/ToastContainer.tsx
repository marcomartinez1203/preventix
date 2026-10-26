import type { Toast } from '../../hooks/useToast';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-brand" />,
};

const colors = {
  success: 'border-emerald-400/25 bg-emerald-400/10',
  error: 'border-red-400/25 bg-red-400/10',
  info: 'border-brand/25 bg-brand/10',
};

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[70] flex flex-col gap-2 max-w-[calc(100vw-3rem)] sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[t.type]} animate-fade-in`}
        >
          {icons[t.type]}
          <p className="text-sm text-zinc-100 flex-1">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
