// Una partita è una serie di mani: ogni mano ha il suo Contratto e si gioca per 13 prese.
// Con un solo Contratto la serie ha una mano sola. Vince chi ha più punti in totale.
import { contractNeedsTarget, contractPlayableWith, contracts, getContract } from './catalog';
import { IllegalActionError, applyAction, createGame, ranking, validateConfig } from './game';
import { shuffle } from './rng';
import type { Rng } from './rng';
import { getView } from './view';
import type { Action, ContractId, FactionId, GameConfig, GameState, PlayerView } from './types';

export interface HandPlan {
  contract: ContractId;
  targetFaction?: FactionId;
}

export interface MatchConfig {
  playerNames: string[];
  /** Fazioni del mazzo, uguali per tutte le mani (ogni mano si rimescola e si ridistribuisce). */
  factions: FactionId[];
  hands: HandPlan[];
  seed: number;
}

export interface HandSummary {
  contract: ContractId;
  targetFaction?: FactionId;
  scores: number[];
  tricks: number[];
}

/** playing: mano in corso · handEnd: pausa tra due mani · matchEnd: serie conclusa. */
export type MatchPhase = 'playing' | 'handEnd' | 'matchEnd';

export interface MatchState {
  config: MatchConfig;
  handIndex: number;
  game: GameState;
  completed: HandSummary[];
  phase: MatchPhase;
}

export type MatchAction = Action | { type: 'nextHand' };

export interface MatchView {
  game: PlayerView;
  handIndex: number;
  hands: HandPlan[];
  completed: HandSummary[];
  /** Punti totali della serie, compresi quelli della mano in corso. */
  totals: number[];
  phase: MatchPhase;
}

/** Contratti giocabili con queste fazioni (esclude quelli che riguardano fazioni assenti). */
export function playableContracts(factions: readonly FactionId[]): ContractId[] {
  return contracts()
    .filter((c) => contractPlayableWith(c, factions))
    .map((c) => c.id);
}

/** Estrae `count` Contratti diversi a caso; la fazione bersaglio, se serve, è estratta tra quelle del mazzo. */
export function randomHands(count: number, factions: readonly FactionId[], rng: Rng): HandPlan[] {
  return shuffle(playableContracts(factions), rng)
    .slice(0, count)
    .map((contract) =>
      contractNeedsTarget(getContract(contract))
        ? { contract, targetFaction: factions[Math.floor(rng() * factions.length)]! }
        : { contract },
    );
}

export function validateMatchConfig(config: MatchConfig): string[] {
  if (!config.hands.length) return ['Serve almeno un Contratto.'];
  const errors = config.hands.flatMap((_, i) => validateConfig(handConfig(config, i)));
  return [...new Set(errors)];
}

export function createMatch(config: MatchConfig): MatchState {
  const errors = validateMatchConfig(config);
  if (errors.length) throw new Error(errors.join(' '));
  const copy = JSON.parse(JSON.stringify(config)) as MatchConfig;
  return { config: copy, handIndex: 0, game: createGame(handConfig(copy, 0)), completed: [], phase: 'playing' };
}

export function applyMatchAction(state: MatchState, action: MatchAction): MatchState {
  if (action.type === 'nextHand') {
    if (state.phase !== 'handEnd') throw new IllegalActionError('La mano non è ancora conclusa.');
    const handIndex = state.handIndex + 1;
    return { ...state, handIndex, game: createGame(handConfig(state.config, handIndex)), phase: 'playing' };
  }

  if (state.phase !== 'playing') throw new IllegalActionError('Nessuna mano in corso.');
  const game = applyAction(state.game, action);
  if (game.phase !== 'handEnd') return { ...state, game };

  const plan = state.config.hands[state.handIndex]!;
  const summary: HandSummary = {
    ...plan,
    scores: game.players.map((p) => p.score),
    tricks: game.players.map((p) => p.tricks),
  };
  const last = state.handIndex === state.config.hands.length - 1;
  return { ...state, game, completed: [...state.completed, summary], phase: last ? 'matchEnd' : 'handEnd' };
}

export function matchTotals(state: Pick<MatchState, 'completed' | 'phase' | 'game'>): number[] {
  const totals = state.game.players.map(() => 0);
  for (const hand of state.completed) hand.scores.forEach((s, i) => (totals[i]! += s));
  if (state.phase === 'playing') state.game.players.forEach((p, i) => (totals[i]! += p.score));
  return totals;
}

/** Posti ordinati per punteggio totale della serie. */
export function matchRanking(totals: readonly number[]): number[] {
  return ranking({ players: totals.map((score) => ({ score })) });
}

export function getMatchView(state: MatchState, seat: number | null): MatchView {
  return {
    game: getView(state.game, seat),
    handIndex: state.handIndex,
    hands: state.config.hands.map((h) => ({ ...h })),
    completed: state.completed.map((h) => ({ ...h, scores: [...h.scores], tricks: [...h.tricks] })),
    totals: matchTotals(state),
    phase: state.phase,
  };
}

function handConfig(config: MatchConfig, index: number): GameConfig {
  const plan = config.hands[index]!;
  return {
    playerNames: config.playerNames,
    factions: config.factions,
    contract: plan.contract,
    targetFaction: plan.targetFaction,
    // Ogni mano ha il suo mescolamento, ricavato in modo deterministico dal seme della serie.
    seed: (config.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0,
  };
}
