import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/** Toast simple hook */
export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  action?: { label: string; onClick: () => void | Promise<void> };
}

let toastId = 0;
const useToastStore = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));
export const dismissToast = (id: number) => useToastStore.setState(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));

export function useToast() {
  const { toasts } = useToastStore();

  const addToast = (type: Toast['type'], message: string, action?: Toast['action']) => {
    const id = ++toastId;
    useToastStore.setState(state => ({ toasts: [...state.toasts, { id, type, message, action }] }));
    if (type !== 'error' && !action) setTimeout(() => dismissToast(id), 8000);
  };

  return {
    toasts,
    success: (msg: string, action?: Toast['action']) => addToast('success', msg, action),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg),
  };
}

/** Close on outside click */
export function useOutsideClick<T extends HTMLElement>(callback: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [callback]);
  return ref;
}
