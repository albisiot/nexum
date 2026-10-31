import { useEffect, useRef, useSyncExternalStore } from 'react';

export interface ConfirmOptions {
  title: string;
  text?: string;
  /** Testo del pulsante che conferma, es. "Elimina". */
  confirm: string;
  /** Testo del pulsante che lascia tutto com'è. */
  cancel?: string;
  /** L'azione fa perdere qualcosa: il pulsante è rosso. */
  danger?: boolean;
}

type Request = ConfirmOptions & { resolve(ok: boolean): void };

let request: Request | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Chiede conferma con una finestra nello stile del gioco, al posto di window.confirm. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  request?.resolve(false);
  return new Promise((resolve) => {
    request = { ...options, resolve };
    notify();
  });
}

function answer(ok: boolean) {
  const current = request;
  request = null;
  notify();
  current?.resolve(ok);
}

/** Va montato una volta sola, in App. */
export function ConfirmHost() {
  const current = useSyncExternalStore(subscribe, () => request);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (current && !dialog.current?.open) dialog.current?.showModal();
  }, [current]);

  if (!current) return null;
  return (
    <dialog
      ref={dialog}
      className="panel confirm"
      aria-label={current.title}
      onCancel={(e) => {
        e.preventDefault();
        answer(false);
      }}
      // Il contenuto riempie la finestra: un tocco sul dialog stesso è un tocco fuori, sullo sfondo.
      onClick={(e) => {
        if (e.target === dialog.current) answer(false);
      }}
    >
      <div className="confirm-body">
        <h3>{current.title}</h3>
        {current.text && <p>{current.text}</p>}
        <div className="controls">
          <button type="button" className="btn" autoFocus onClick={() => answer(false)}>
            {current.cancel ?? 'Indietro'}
          </button>
          <button type="button" className={`btn ${current.danger ? 'danger' : 'primary'}`} onClick={() => answer(true)}>
            {current.confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
