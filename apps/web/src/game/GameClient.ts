import type { CardId, FactionId, HandPlan, MatchView, PlayerView } from '@nexum/engine';

export type SeatKind = 'human' | 'cpu';

export interface Seat {
  name: string;
  kind: SeatKind;
}

export type GameMode = 'solo' | 'local';

export interface MatchSetup {
  mode: GameMode;
  seats: Seat[];
  factions: FactionId[];
  /** Contratti da giocare in ordine: uno solo oppure una serie. */
  hands: HandPlan[];
  seed: number;
}

/** Risposta a una decisione: `accept` (Reversal, recupero), `target` (bersaglio), `take` e `discard` (recupero), `faction` (Briscola). */
export interface DecisionAnswer {
  accept: boolean;
  target?: number;
  take?: CardId;
  discard?: CardId;
  faction?: FactionId;
}

/** Ciò che la UI deve disegnare in un dato momento. */
export interface ClientSnapshot {
  match: MatchView;
  /** Vista della mano in corso dal posto `perspective` (o da spettatore se null). */
  view: PlayerView;
  seats: readonly Seat[];
  /** Posto di cui si vede la mano; null se nessuna mano è visibile. */
  perspective: number | null;
  /** Pass-and-play: la mano di chi è di turno è coperta finché non la rivela. */
  handHidden: boolean;
  canPlay: boolean;
  /** Oblivion: chi è di turno, con la mano visibile, deve prima scartare una carta. */
  canDiscard: boolean;
  /** C'è una decisione in sospeso che spetta a un giocatore umano. */
  canDecide: boolean;
  /** Recupero: le carte che chi decide può scartare (la sua mano: in pass-and-play va mostrata solo a lui). */
  decisionHand: CardId[];
  canContinue: boolean;
}

/**
 * Confine tra interfaccia e partita. Oggi esiste solo LocalGameClient (motore nel browser);
 * per l'online basterà un OnlineGameClient che riceve le MatchView dal server
 * e invia le stesse azioni, senza toccare i componenti React.
 */
export interface GameClient {
  readonly setup: MatchSetup;
  getSnapshot(): ClientSnapshot;
  subscribe(listener: () => void): () => void;
  /** `option`: la scelta del potere della carta (Fury, Ashen, Shift, Archivist). */
  playCard(cardId: CardId, option?: number): void;
  /** Oblivion: scarta una carta prima di giocare. */
  discard(cardId: CardId): void;
  /** Risponde alla decisione in sospeso (Reversal, bersaglio, recupero). */
  decide(answer: DecisionAnswer): void;
  nextTrick(): void;
  nextHand(): void;
  revealHand(): void;
  dispose(): void;
}
