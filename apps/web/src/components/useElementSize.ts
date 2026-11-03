import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Larghezza e altezza attuali di un elemento, aggiornate quando cambiano (rotazione del telefono, finestra ridimensionata). */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (width: number, height: number) =>
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    const rect = el.getBoundingClientRect();
    update(rect.width, rect.height);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

const onResize = (listener: () => void) => {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
};

/** Altezza della finestra: la mano si rimpicciolisce sugli schermi bassi. */
export function useViewportHeight(): number {
  return useSyncExternalStore(onResize, () => window.innerHeight);
}
