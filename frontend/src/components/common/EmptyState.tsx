import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'Sin datos',
  description = 'No hay información para mostrar.',
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-slate-300">
        {icon ?? <AlertCircle className="w-14 h-14" />}
      </div>
      <p className="text-slate-600 font-medium text-base">{title}</p>
      <p className="text-slate-400 text-sm mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
