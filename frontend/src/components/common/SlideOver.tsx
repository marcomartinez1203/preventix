import { useDialog } from '../../hooks/useDialog';
import { X } from 'lucide-react';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

const widthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function SlideOver({ open, onClose, title, children, width = 'lg' }: SlideOverProps) {
  const dialogRef = useDialog(open, onClose);

  if (!open) return null;

  return (
    <div data-modal-root className="slideover-root fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      {/* Panel */}
      <div
        ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`dialog-panel !max-h-dvh relative ml-auto border-l border-line h-full w-full ${widthClasses[width]} shadow-2xl flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6 border-b border-line shrink-0">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            aria-label="Cerrar" onClick={onClose}
            className="icon-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="dialog-body flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
