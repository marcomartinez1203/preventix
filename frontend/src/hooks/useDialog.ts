import { useEffect, useRef } from 'react';

export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const selector = 'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(selector) ?? []).filter(node => node.getClientRects().length > 0 && !node.closest('[inert]')).sort((a, b) => a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    (focusable()[0] ?? ref.current)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Keep the whole background out of the keyboard and accessibility trees.
    const changed: { element: HTMLElement; inert: boolean }[] = [];
    let root = ref.current?.closest<HTMLElement>('[data-modal-root]') ?? ref.current;
    while (root?.parentElement && root !== document.body) {
      for (const sibling of Array.from(root.parentElement.children)) {
        if (sibling !== root && sibling instanceof HTMLElement && !sibling.hasAttribute('data-toast-region')) {
          changed.push({ element: sibling, inert: sibling.inert }); sibling.inert = true;
        }
      }
      root = root.parentElement;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); ref.current?.focus(); return; }
      if (!ref.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      for (const { element, inert } of changed) element.inert = inert;
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
