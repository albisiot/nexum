import { useSyncExternalStore } from 'react';

// Tutte le finestre del gioco sono <dialog>: Info, menu ☰, Impostazioni, Regole, tutorial, conferme,
// passaggio del telefono e presentazione del Contratto. Basta guardare se ce n'è una aperta nella pagina.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
  return () => observer.disconnect();
}

const anyOpen = () => document.querySelector('dialog[open]') !== null;

/** C'è una finestra aperta sopra la pagina. */
export function useDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, anyOpen);
}
