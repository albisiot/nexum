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
  | { kind: 'exactValue'; value: number }
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
  /** Le carte dei mazzi: 13 per ogni fazione. */
  cards: CardDef[];
  /** Carte fuori dai mazzi delle fazioni: si troveranno nei pacchetti. Conservano la fazione d'origine. */
  packCards?: CardDef[];
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
  | {
      player: number;
      skipped: false;
      cardId: CardId;
      final: number;
      /** Il potere che Palimpsest ha copiato giocando. */
      copied?: PowerId;
      /** Punti Contratto pagati giocandola (Fury, Ashen). */
      paid?: number;
      /** Carta protetta da Aegiron: i poteri avversari non ne cambiano il valore. */
      protected?: boolean;
      /** Archivist: il valore stampato che ha preso in prestito. */
      borrowed?: number;
    }
  | { player: number; skipped: true };

export type CardPlay = Extract<Play, { skipped: false }>;

/** Una carta avversaria vista con Second Sight o The Witness: la conosce solo chi l'ha vista. */
export interface SeenCard {
  player: number;
  cardId: CardId;
}

export interface PlayerState {
  name: string;
  hand: CardId[];
  /** Carte già giocate in questa mano, in ordine. */
  played: CardId[];
  captured: CardId[];
  tricks: number;
  score: number;
  /** Bonus o malus propri per la prossima carta giocata (Praetor, Bloodmark). */
  nextModifier: number;
  /** Malus degli avversari per la prossima carta (Vesper Null): una carta protetta lo ignora. */
  nextPenalty: number;
  /** Aegiron: la prossima carta giocata è protetta. */
  protectNext: boolean;
  /** Esito delle ultime due prese giocate: true = vinta (Ascendant). */
  recentResults: boolean[];
  /** Salta la prossima presa (Nullchild). */
  skipNext: boolean;
  /** Oblivion: carte da scartare all'inizio del prossimo turno. */
  mustDiscard: number;
  /** Recuperi da una volta per mano già usati (Black Echo, Echo Prime). */
  used: PowerId[];
  /** Carte avversarie viste: informazione privata. */
  seen: SeenCard[];
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
  | { type: 'reversal'; player: number; cardId: CardId; cancelled: boolean }
  /** La protezione (Aegiron, Pax) ha impedito al potere di `cardId` di togliere punti a `player`. */
  | { type: 'shielded'; player: number; cardId: CardId }
  | { type: 'protectNext'; player: number; cardId: CardId }
  | { type: 'borrowed'; player: number; cardId: CardId; value: number }
  /** Black Echo, Echo Prime, Mnemos: `taken` torna in mano a `player`, che scarta `discarded`. */
  | { type: 'recovered'; player: number; cardId: CardId; taken: CardId; discarded: CardId }
  | { type: 'anchor'; cardId: CardId }
  | { type: 'oblivion'; player: number; cardId: CardId }
  /** Second Sight, The Witness: `player` ha visto delle carte di altri (cosa, lo sa solo lui). */
  | { type: 'seen'; player: number; cardId: CardId; target: number | null };

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

/** Una decisione che blocca la partita finché il giocatore non la prende. Sono pubbliche. */
export type Decision =
  /** Reversal: chi la cattura può annullare i punti nati dalla presa (`deltas`, per posto). */
  | { kind: 'reversal'; player: number; cardId: CardId; deltas: number[] }
  /** Vesper Null, Ravager, Nullchild: chi l'ha giocata sceglie l'avversario tra `options`. */
  | { kind: 'target'; player: number; cardId: CardId; power: PowerId; options: number[] }
  /**
   * Black Echo, Echo Prime: riprendere in mano `cardId` scartando un'altra carta.
   * Mnemos: prendere in mano una delle carte `take`, scartando una carta.
   */
  | { kind: 'recover'; player: number; cardId: CardId; power: PowerId; take: CardId[] };

/** Fine presa a tappe: recuperi, poi punti e poteri, poi Reversal. */
export interface Resolution {
  stage: 'recover' | 'effects' | 'reversal';
  /** Punteggi prima della presa, per sapere cosa annulla Reversal. */
  before: number[];
  /** Giocatori che in questa presa non perdono punti per i poteri avversari (Aegiron, Pax). */
  shielded: number[];
  /** Carte tornate in mano: non contano tra le catturate. */
  recovered: CardId[];
  /** Decisioni di questa tappa ancora da proporre. */
  queue: Decision[];
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
  /** Prese di questa mano: 13, una in meno per ogni Oblivion. */
  tricksInHand: number;
  /** Carte uscite dal gioco per un potere (scambi dei recuperi, Oblivion), in ordine. */
  discards: CardId[];
  /** Decisione in sospeso a fine presa, altrimenti null. */
  decision: Decision | null;
  /** Presa conclusa ma non ancora chiusa; null quando si può passare alla successiva. */
  resolution: Resolution | null;
}

export type Action =
  /**
   * `option`: la scelta del potere della carta. Fury 0–1 e Ashen 0–4 = quante volte pagare,
   * Shift 0 = +15 e 1 = −15, Archivist = il valore stampato preso in prestito (0 = nessuno).
   */
  | { type: 'play'; player: number; cardId: CardId; option?: number }
  | { type: 'nextTrick' }
  /**
   * Risponde alla decisione in sospeso. Reversal: `accept` = annulla i punti. Bersaglio: `target`.
   * Recupero: `accept` = recupera, `discard` = la carta da scartare, `take` = la carta presa (Mnemos).
   */
  | { type: 'decide'; player: number; accept: boolean; target?: number; discard?: CardId; take?: CardId }
  /** Oblivion: la carta scartata all'inizio del turno. */
  | { type: 'discard'; player: number; cardId: CardId };

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
  /** Carte uscite dal gioco per un potere. */
  discards: CardId[];
  /** Carte avversarie viste da chi guarda e ancora in mano a quegli avversari. */
  seen: SeenCard[];
  /** Carte che chi guarda può scartare adesso per Oblivion (vuoto se non deve scartare). */
  discardable: CardId[];
}

export interface PublicPlayer {
  name: string;
  handCount: number;
  capturedCount: number;
  tricks: number;
  score: number;
  /** Bonus e malus sulla prossima carta, sommati. */
  nextModifier: number;
  /** Aegiron: la prossima carta è protetta. */
  protectedNext: boolean;
  /** Oblivion: carte che deve ancora scartare. */
  mustDiscard: number;
}
