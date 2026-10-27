import type { FACTION_IDS } from './data/factions';
import type { CONTRACT_IDS } from './data/contracts';

export type FactionId = (typeof FACTION_IDS)[number];
export type ContractId = (typeof CONTRACT_IDS)[number];
export type CardId = string;

export interface FactionDef {
  id: FactionId;
  name: string;
  color: string;
  tagline: string;
}

export interface CardDef {
  id: CardId;
  faction: FactionId;
  name: string;
  /** Valore stampato (1–99). */
  value: number;
  /** Testo del potere; stringa vuota se la carta non ha poteri. */
  effect: string;
}

export interface ContractDef {
  id: ContractId;
  name: string;
  icon: string;
  desc: string;
  score: string;
  /** Il Contratto richiede di scegliere una fazione bersaglio. */
  needsTarget?: boolean;
  /** Fazioni senza le quali il Contratto perde senso. */
  requiresFactions?: FactionId[];
}

/** Configurazione di una mano (= un Contratto giocato per 13 prese). */
export interface GameConfig {
  playerNames: string[];
  factions: FactionId[];
  contract: ContractId;
  targetFaction?: FactionId;
  /** Seme del generatore casuale: stessa config + stesso seme = stessa partita. */
  seed: number;
}

export type Play =
  | { player: number; skipped: false; cardId: CardId; final: number }
  | { player: number; skipped: true };

export type CardPlay = Extract<Play, { skipped: false }>;

export interface PlayerState {
  name: string;
  hand: CardId[];
  /** Carte già giocate in questa mano, in ordine. */
  played: CardId[];
  captured: CardId[];
  tricks: number;
  score: number;
  /** Modificatore da applicare alla prossima carta giocata (Praetor, Bloodmark, Vesper Null). */
  nextModifier: number;
  /** Esito delle ultime due prese giocate: true = vinta (Ascendant). */
  recentResults: boolean[];
  /** Salta la prossima presa (predisposto per Nullchild). */
  skipNext: boolean;
}

export type Phase = 'playing' | 'trickEnd' | 'handEnd';

/** Note strutturate su ciò che è successo in una presa: la UI le traduce in testo. */
export type TrickNote =
  | { type: 'axiom' }
  | { type: 'valueChanged'; player: number; cardId: CardId; value: number }
  | { type: 'measure' }
  | { type: 'tieBreak' }
  | { type: 'scoreChanged'; player: number; cardId: CardId; points: number; target: number }
  | { type: 'nextModifier'; player: number; cardId: CardId; amount: number; target: number };

export interface TrickResult {
  trickNo: number;
  leadFaction: FactionId;
  plays: Play[];
  winner: number;
  winningCardId: CardId;
  winningValue: number;
  /** Punti assegnati dal Contratto al vincitore. */
  contractDelta: number;
  notes: TrickNote[];
}

export interface GameState {
  config: GameConfig;
  players: PlayerState[];
  /** Numero della presa corrente (1–13). */
  trickNo: number;
  leader: number;
  turn: number;
  leadFaction: FactionId | null;
  plays: Play[];
  phase: Phase;
  history: TrickResult[];
}

export type Action =
  | { type: 'play'; player: number; cardId: CardId }
  | { type: 'nextTrick' };

/** Ciò che un singolo giocatore può vedere: nessuna mano altrui, nessun dato nascosto. */
export interface PlayerView {
  /** Posto del giocatore che guarda, null per uno spettatore. */
  seat: number | null;
  contract: ContractId;
  targetFaction?: FactionId;
  factions: FactionId[];
  trickNo: number;
  tricksPerHand: number;
  leader: number;
  turn: number;
  leadFaction: FactionId | null;
  plays: Play[];
  phase: Phase;
  players: PublicPlayer[];
  /** Carte in mano al giocatore che guarda (vuoto per uno spettatore). */
  hand: CardId[];
  /** Carte che il giocatore che guarda può giocare adesso. */
  legal: CardId[];
  lastTrick: TrickResult | null;
  history: TrickResult[];
}

export interface PublicPlayer {
  name: string;
  handCount: number;
  capturedCount: number;
  tricks: number;
  score: number;
  nextModifier: number;
}
