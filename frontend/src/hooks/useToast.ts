import { useEffect, useRef } from 'react';
import { create } from 'zustand';

/** Toast simple hook */
export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toastId = 0;
const useToastStore = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));

export function useToast() {
  const { toasts } = useToastStore();

  const addToast = (type: Toast['type'], message: string) => {
    const id = ++toastId;
    useToastStore.setState(state => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      useToastStore.setState(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3500);
  };

  return {
    toasts,
    success: (msg: string) => addToast('success', msg),
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
