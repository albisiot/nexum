import type { BotLevel, CardId, FactionId, HandPlan, MatchView, PlayerView } from '@nexum/engine';

export type SeatKind = 'human' | 'cpu';

export interface Seat {
  name: string;
  kind: SeatKind;
  /** Online: l'account di chi siede a questo posto. */
  uid?: string;
  /** Il livello della CPU: estratto a caso a ogni partita, non si sceglie e non si mostra. */
  level?: BotLevel;
}

export type GameMode = 'solo' | 'local' | 'online';

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
  /** Online: quando scade il tempo per giocare, se tocca a questo giocatore. */
  turnDeadline?: number | null;
  /** Online: un avviso sullo stato della partita (connessione, arbitro assente). */
  notice?: string;
}

/**
 * Confine tra interfaccia e partita: LocalGameClient ha il motore nel browser, online c'è OnlineHostClient
 * per chi fa da arbitro e OnlineGuestClient per gli altri (online/OnlineClients.ts).
 */
export interface GameClient {
  readonly setup: MatchSetup;
  /** Online: cosa succede se si esce a partita in corso. */
  readonly leaveNote?: string;
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
