import type { CardId, ContractId, FactionId, PlayerView } from '@nexum/engine';

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
  contract: ContractId;
  targetFaction?: FactionId;
  seed: number;
}

/** Ciò che la UI deve disegnare in un dato momento. */
export interface ClientSnapshot {
  /** Vista dal posto `perspective` (o da spettatore se null). */
  view: PlayerView;
  seats: readonly Seat[];
  /** Posto di cui si vede la mano; null se nessuna mano è visibile. */
  perspective: number | null;
  /** Pass-and-play: la mano di chi è di turno è coperta finché non la rivela. */
  handHidden: boolean;
  canPlay: boolean;
  canContinue: boolean;
}

/**
 * Confine tra interfaccia e partita. Oggi esiste solo LocalGameClient (motore nel browser);
 * per l'online basterà un OnlineGameClient che riceve le PlayerView dal server
 * e invia le stesse azioni, senza toccare i componenti React.
 */
export interface GameClient {
  readonly setup: MatchSetup;
  getSnapshot(): ClientSnapshot;
  subscribe(listener: () => void): () => void;
  playCard(cardId: CardId): void;
  nextTrick(): void;
  revealHand(): void;
  dispose(): void;
}
