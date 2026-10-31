import { useSyncExternalStore } from 'react';
import { getCatalog, setCatalog, validateCatalog } from '@nexum/engine';
import type { Catalog } from '@nexum/engine';
import { FIREBASE_CONFIG } from '../auth/firebaseConfig';

/**
 * Carica all'avvio la versione pubblicata del catalogo e la rende attiva.
 * Se arriva mentre una partita è in corso, aspetta la fine: cambiare carte a metà partita la romperebbe.
 */
class CatalogStore {
  private version = getCatalog().version;
  private pending: Catalog | null = null;
  private gameRunning = false;
  private beforeOverride: Catalog | null = null;
  private readonly listeners = new Set<() => void>();

  constructor() {
    if (!FIREBASE_CONFIG) return;
    import('./remote')
      .then((m) => m.loadCatalog('published'))
      .then((stored) => {
        if (!stored) return;
        const errors = validateCatalog(stored.catalog);
        if (errors.length) {
          console.warn('Catalogo pubblicato non valido, uso quello predefinito.', errors);
          return;
        }
        this.offer(stored.catalog);
      })
      .catch((error) => console.warn('Catalogo pubblicato non disponibile, uso quello predefinito.', error));
  }

  getSnapshot = (): number => this.version;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Propone un nuovo catalogo (dopo il caricamento o una pubblicazione dall'Editor). */
  offer(catalog: Catalog): void {
    this.pending = catalog;
    this.apply();
  }

  /** Una partita online usa il catalogo di chi ha creato la stanza, finché non finisce. */
  override(catalog: Catalog): void {
    this.beforeOverride ??= getCatalog();
    this.gameRunning = true;
    setCatalog(catalog);
    this.version = getCatalog().version;
    this.listeners.forEach((l) => l());
  }

  setGameRunning(running: boolean): void {
    this.gameRunning = running;
    if (!running && this.beforeOverride) {
      this.pending ??= this.beforeOverride;
      this.beforeOverride = null;
    }
    this.apply();
  }

  private apply(): void {
    if (!this.pending || this.gameRunning) return;
    setCatalog(this.pending);
    this.pending = null;
    this.version = getCatalog().version;
    this.listeners.forEach((l) => l());
  }
}

export const catalogStore = new CatalogStore();

/** Versione del catalogo attivo: cambia quando ne viene caricata o pubblicata una nuova. */
export function useCatalogVersion(): number {
  return useSyncExternalStore(catalogStore.subscribe, catalogStore.getSnapshot);
}
