// Ciò che una partita online chiede al database. Online è Firestore (firestoreBackend.ts);
// in sviluppo, con ?fakeOnline=Nome, sono le schede dello stesso browser (localBackend.ts).
import type { MatchAction } from '@nexum/engine';

export interface Member {
  name: string;
  /** Quando è entrato: decide l'ordine dei posti. */
  at: number;
}

/**
 * lobby: si entra e si aspetta · playing: partita in corso · ended: partita finita, si può rigiocare ·
 * closed: chi l'ha creata ha chiuso la stanza.
 */
export type RoomStatus = 'lobby' | 'playing' | 'ended' | 'closed';

export interface Room {
  code: string;
  hostUid: string;
  status: RoomStatus;
  members: Record<string, Member>;
  /** La partita (JSON di MatchSetup), scritta all'avvio. */
  setup?: string;
  /** Il catalogo della partita (JSON): tutti giocano con le stesse carte, anche se ne viene pubblicato uno nuovo. */
  catalog?: string;
}

export interface RemoteAction {
  id: string;
  uid: string;
  /** Il seme della partita: le azioni rimaste da una partita precedente si scartano. */
  seed: number;
  action: MatchAction;
}

export interface RoomBackend {
  /** Crea una stanza con un codice libero e restituisce il codice. */
  createRoom(uid: string, name: string): Promise<string>;
  /** Entra nella stanza. Lancia un errore con un testo per il giocatore se non si può. */
  joinRoom(code: string, uid: string, name: string): Promise<void>;
  /** Esce dalla stanza; se esce chi l'ha creata, la stanza si chiude. */
  leaveRoom(room: Room, uid: string): Promise<void>;
  watchRoom(code: string, onRoom: (room: Room | null) => void, onError: (error: unknown) => void): () => void;
  startMatch(code: string, setup: string, catalog: string): Promise<void>;
  setStatus(code: string, status: RoomStatus): Promise<void>;
  /** La vista privata di un giocatore. */
  watchView(code: string, uid: string, onView: (json: string) => void, onError: (error: unknown) => void): () => void;
  sendAction(code: string, uid: string, seed: number, action: MatchAction): Promise<void>;
  watchActions(code: string, onActions: (actions: RemoteAction[]) => void, onError: (error: unknown) => void): () => void;
  /** Salva lo stato e le viste, e toglie le azioni già lette, tutto insieme. */
  publish(code: string, state: string, views: Record<string, string>, consumed: string[]): Promise<void>;
  /** Lo stato salvato, per riprendere la partita. */
  loadState(code: string): Promise<string | null>;
}

const FAKE_NAME = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('fakeOnline') : null;

/** In sviluppo, il nome con cui giocare senza account (vedi localBackend.ts). */
export const fakeIdentity = FAKE_NAME ? { uid: `fake-${FAKE_NAME}`, firstName: FAKE_NAME } : null;

let backend: Promise<RoomBackend> | null = null;

export function loadBackend(): Promise<RoomBackend> {
  backend ??= fakeIdentity
    ? import('./localBackend').then((m) => m.localBackend)
    : import('./firestoreBackend').then((m) => m.firestoreBackend);
  return backend;
}

/** Il testo da mostrare al giocatore per un errore del database. */
export function roomErrorText(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'permission-denied') return 'Il database non permette questa operazione: le regole di sicurezza potrebbero non essere aggiornate.';
  if (code === 'unavailable') return 'Database non raggiungibile: controlla la connessione.';
  return error instanceof Error ? error.message : String(error);
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Un codice di 5 caratteri, senza quelli che si confondono (I, O, 0, 1). */
export function newRoomCode(): string {
  return Array.from({ length: 5 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]!).join('');
}

export const MAX_MEMBERS = 8;

export const normalizeCode = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
