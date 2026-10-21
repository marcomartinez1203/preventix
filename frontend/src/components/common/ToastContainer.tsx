import type { Toast } from '../../hooks/useToast';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const colors = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
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
          <p className="text-sm text-slate-800 flex-1">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
