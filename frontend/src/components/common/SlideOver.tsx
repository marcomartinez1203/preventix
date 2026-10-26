import { useDialog } from '../../hooks/useDialog';
import { X } from 'lucide-react';
import { useEffect } from 'react';

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
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}
        className={`relative ml-auto bg-surface border-l border-line h-full w-full ${widthClasses[width]} shadow-2xl flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            aria-label="Cerrar" onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-raised hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
