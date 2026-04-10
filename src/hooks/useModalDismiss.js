import { useEffect, useRef } from 'react';

/**
 * Escape-to-dismiss for modal overlays (stable callback via ref).
 */
export function useModalDismiss(isOpen, onDismiss) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onDismissRef.current();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);
}
