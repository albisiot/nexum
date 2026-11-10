// La partita sul dispositivo (contro la CPU o multiplayer) si salva dopo ogni mossa: se la pagina si ricarica o
// il telefono chiude il browser, dal menu si riprende esattamente da lì. Le partite online non si salvano così.
import { CARDS_PER_FACTION, applyMatchAction, createMatch, getCatalog, getContract, matchTotals } from '@nexum/engine';
import type { BotLevel, MatchAction, MatchState } from '@nexum/engine';
import { useMemo, useSyncExternalStore } from 'react';
import type { SetupValues } from '../components/SetupScreen';
import { matchConfig } from './GameClient';
import type { MatchSetup } from './GameClient';

/** Va aumentato quando il salvataggio cambia forma: quelli di un altro formato si scartano. */
export const SAVE_FORMAT = 1;
const SAVE_KEY = 'nexum-partita';
const BOT_LEVELS: readonly BotLevel[] = ['easy', 'normal', 'hard'];

/** A che punto è la partita. Rigiocando le mosse si deve arrivare qui, se no il salvataggio non vale più. */
interface Progress {
  handIndex: number;
  phase: MatchState['phase'];
  trickNo: number;
  turn: number;
  totals: number[];
}

export interface SavedGame {
  format: number;
  setup: MatchSetup;
  /** Le scelte della preparazione, per ritrovarle uscendo dalla partita. */
  values: SetupValues;
  /**
   * Tutte le mosse dall'inizio, anche quelle della CPU. Il motore è deterministico: rigiocarle sul seme della partita
   * riporta mani, prese, punti della serie e fine mano esattamente dov'erano.
   */
  actions: MatchAction[];
  progress: Progress;
}

export interface ResumableGame {
  save: SavedGame;
  /** Lo stato raggiunto rigiocando le mosse. */
  state: MatchState;
}

function progressOf(state: MatchState): Progress {
  return {
    handIndex: state.handIndex,
    phase: state.phase,
    trickNo: state.game.trickNo,
    turn: state.game.turn,
    totals: matchTotals(state),
  };
}

export function encodeSave(setup: MatchSetup, values: SetupValues, actions: readonly MatchAction[], state: MatchState): string {
  const save: SavedGame = { format: SAVE_FORMAT, setup, values, actions: [...actions], progress: progressOf(state) };
  return JSON.stringify(save);
}

/** Contro la CPU c'è un solo posto umano, nel multiplayer sullo stesso dispositivo lo sono tutti. */
function validSetup(setup: unknown): setup is MatchSetup {
  if (!setup || typeof setup !== 'object') return false;
  const { mode, seats, factions, hands, seed, cardsPerFaction } = setup as Partial<MatchSetup>;
  if (mode !== 'solo' && mode !== 'local') return false;
  // I salvataggi di prima delle mani lunghe non hanno le carte per fazione: valgono 13.
  if (cardsPerFaction !== undefined && !Number.isInteger(cardsPerFaction)) return false;
  if (!Number.isInteger(seed) || !Array.isArray(factions) || !Array.isArray(hands) || !Array.isArray(seats)) return false;
  const seatsOk = seats.every(
    (seat) =>
      typeof seat?.name === 'string' &&
      (seat.kind === 'human' || (seat.kind === 'cpu' && seat.level !== undefined && BOT_LEVELS.includes(seat.level))),
  );
  if (!seatsOk) return false;
  const humans = seats.filter((seat) => seat.kind === 'human').length;
  return humans === (mode === 'solo' ? 1 : seats.length);
}

/** Legge il testo salvato: null se è illeggibile o di un altro formato. */
export function parseSave(text: string): SavedGame | null {
  try {
    const save = JSON.parse(text) as Partial<SavedGame> | null;
    if (save?.format !== SAVE_FORMAT || !validSetup(save.setup) || !Array.isArray(save.actions)) return null;
    if (!save.values || typeof save.values !== 'object' || !save.progress || typeof save.progress !== 'object') return null;
    return save as SavedGame;
  } catch {
    return null;
  }
}

/**
 * Rigioca le mosse con il catalogo attivo. null se una non è più possibile o se si arriva in un altro punto:
 * vuol dire che fazioni, carte o Contratti della partita sono cambiati o non esistono più.
 */
export function replaySave(save: SavedGame): MatchState | null {
  try {
    let state = createMatch(matchConfig(save.setup));
    for (const action of save.actions) state = applyMatchAction(state, action);
    if (state.phase === 'matchEnd' || JSON.stringify(progressOf(state)) !== JSON.stringify(save.progress)) return null;
    return state;
  } catch {
    return null;
  }
}

/** Il punto raggiunto, per il menu: "Contro la CPU · Contratto 2 di 5 · Presa 7/13" (o "Presa 7/21" nelle mani lunghe). */
export function describeSave({ save, state }: ResumableGame): string {
  const parts = [save.setup.mode === 'solo' ? 'Contro la CPU' : 'Multiplayer'];
  const hands = state.config.hands;
  const contract = `Contratto ${state.handIndex + 1} di ${hands.length}`;
  if (state.phase === 'handEnd') return [...parts, `${contract} concluso`].join(' · ');
  parts.push(hands.length > 1 ? contract : getContract(hands[0]!.contract).name);
  const g = state.game;
  if (g.domino) {
    const placed = Object.values(g.domino.table).reduce((t, line) => t + line.high - line.low + 1, 0);
    parts.push(`In tavola ${placed}/${g.config.factions.length * (g.config.cardsPerFaction ?? CARDS_PER_FACTION)}`);
  } else {
    parts.push(`Presa ${g.trickNo}/${g.tricksInHand}`);
  }
  return parts.join(' · ');
}

function read(): string | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    // Illeggibile o di un altro formato: si butta, senza dire niente.
    if (text !== null && !parseSave(text)) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
    return text;
  } catch {
    return null;
  }
}

let text = read();
let checked: { text: string | null; catalog: number; game: ResumableGame | null } | null = null;
const listeners = new Set<() => void>();

function write(next: string | null): void {
  text = next;
  try {
    if (next === null) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, next);
  } catch {
    // Senza localStorage (o con lo spazio pieno) la partita non si salva, ma si gioca lo stesso.
  }
  listeners.forEach((l) => l());
}

/** Dopo ogni mossa. A fine serie non resta niente da riprendere. */
export function saveGame(setup: MatchSetup, values: SetupValues, actions: readonly MatchAction[], state: MatchState): void {
  write(state.phase === 'matchEnd' ? null : encodeSave(setup, values, actions, state));
}

export function clearSavedGame(): void {
  if (text !== null) write(null);
}

/**
 * La partita salvata, se si riprende con il catalogo attivo. Se non torna non si cancella: all'avvio il catalogo
 * pubblicato arriva dopo qualche istante, e con quello la partita può tornare a posto.
 */
export function resumableGame(): ResumableGame | null {
  const catalog = getCatalog().version;
  if (checked?.text !== text || checked.catalog !== catalog) {
    const save = text === null ? null : parseSave(text);
    const state = save && replaySave(save);
    checked = { text, catalog, game: save && state ? { save, state } : null };
  }
  return checked.game;
}

/** Per il menu. `catalogVersion` è quella del catalogo attivo: quando ne arriva uno nuovo si ricontrolla. */
export function useSavedGame(catalogVersion: number): ResumableGame | null {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => text,
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => resumableGame(), [current, catalogVersion]);
}
