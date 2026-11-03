import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  className: string;
  label: string;
  /** Esc e un tocco sullo sfondo chiudono la finestra. Senza, si esce solo dai suoi pulsanti. */
  onClose?: () => void;
  children: ReactNode;
}

/** Una finestra sopra allo schermo (Info, menu, Regole, passaggio del telefono): c'è finché è montata. */
export function Sheet({ className, label, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={`sheet ${className}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      // Il contenuto riempie la finestra: un tocco sul dialog stesso è un tocco fuori, sullo sfondo.
      onClick={(e) => {
        if (e.target === dialog.current) onClose?.();
      }}
    >
      {children}
    </dialog>
  );
}
