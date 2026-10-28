export type FactionId = string;
export type ContractId = string;
export type CardId = string;
/** Chiave di un potere programmato nel motore (vedi POWERS in powers.ts). */
export type PowerId = string;

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
  /** Valore stampato (1–99), unico all'interno della fazione. */
  value: number;
  /** Testo del potere; stringa vuota se la carta non ha poteri. */
  effect: string;
  /** Potere programmato applicato dal motore; assente se il testo non è ancora tradotto in regole. */
  power?: PowerId;
}

/** Quali carte catturate conta una regola di punteggio. */
export type CardFilter =
  | { kind: 'any' }
  /** 'target' = la fazione bersaglio scelta per la mano. */
  | { kind: 'faction'; faction: FactionId | 'target' }
  | { kind: 'minValue'; value: number }
  | { kind: 'maxValue'; value: number }
  | { kind: 'hasPower' }
  | { kind: 'card'; cardId: CardId };

/**
 * Un "mattoncino" di punteggio, assegnato a chi vince la presa:
 * `points` per la presa stessa, oppure per ogni carta catturata che rispetta `filter`.
 * Con `tricks` vale solo per le prese in quell'intervallo (es. 11–13).
 */
export interface ScoringRule {
  points: number;
  per: 'trick' | 'card';
  filter?: CardFilter;
  tricks?: { from: number; to: number };
}

export interface ContractDef {
  id: ContractId;
  name: string;
  icon: string;
  desc: string;
  rules: ScoringRule[];
}

/** Tutte le fazioni, carte e Contratti del gioco: i dati che l'Editor modifica. */
export interface Catalog {
  /** Numero della versione pubblicata (0 = dati predefiniti del gioco). */
  version: number;
  factions: FactionDef[];
  cards: CardDef[];
  contracts: ContractDef[];
  /** Aggiornamenti delle carte già applicati (vedi CATALOG_UPDATES), così l'Editor non li ripropone. */
  appliedUpdates?: string[];
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
  /** `copied`: il potere che Palimpsest ha copiato giocando. `paid`: punti Contratto pagati giocandola (Fury, Ashen). */
  | { player: number; skipped: false; cardId: CardId; final: number; copied?: PowerId; paid?: number }
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
  /** Salta la prossima presa (Nullchild). */
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
  | { type: 'nextModifier'; player: number; cardId: CardId; amount: number; target: number }
  | { type: 'powerCopied'; player: number; cardId: CardId; power: PowerId }
  | { type: 'skipNext'; player: number; cardId: CardId; target: number }
  | { type: 'pointsPaid'; player: number; cardId: CardId; points: number }
  | { type: 'reversal'; player: number; cardId: CardId; cancelled: boolean };

export interface TrickResult {
  trickNo: number;
  leadFaction: FactionId;
  plays: Play[];
  winner: number;
  winningCardId: CardId;
  winningValue: number;
  /** Punti assegnati dal Contratto al vincitore (0 se Reversal li ha annullati). */
  contractDelta: number;
  notes: TrickNote[];
  /** Reversal: chi l'ha catturata ha annullato i punti di questa presa. */
  cancelled?: boolean;
}

/**
 * Una decisione che blocca la partita finché il giocatore non la prende.
 * Reversal: chi la cattura può annullare i punti nati dalla presa (`deltas`, per posto).
 */
export interface Decision {
  kind: 'reversal';
  player: number;
  cardId: CardId;
  deltas: number[];
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
  /** Decisione in sospeso a fine presa (Reversal), altrimenti null. */
  decision: Decision | null;
}

export type Action =
  /** `option`: quante volte pagare il potere della carta (Fury 0–1, Ashen 0–4); assente = 0. */
  | { type: 'play'; player: number; cardId: CardId; option?: number }
  | { type: 'nextTrick' }
  /** Risponde alla decisione in sospeso: `accept` = sì (Reversal: annulla i punti). */
  | { type: 'decide'; player: number; accept: boolean };

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
  /** Decisione in sospeso: è pubblica, la vedono tutti. */
  decision: Decision | null;
}

export interface PublicPlayer {
  name: string;
  handCount: number;
  capturedCount: number;
  tricks: number;
  score: number;
  nextModifier: number;
}
