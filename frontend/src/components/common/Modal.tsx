import { useDialog } from '../../hooks/useDialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const dialogRef = useDialog(open, onClose);

  if (!open) return null;

  return (
    <div
      data-modal-root className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`dialog-panel relative border border-line rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6 border-b border-line">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            aria-label="Cerrar" onClick={onClose}
            className="icon-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="dialog-body overflow-y-auto flex-1 px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
