import { applyAction, chooseCard, chooseDecision, chooseOption, createGame, createRng, factionIds, getView, shuffle } from '../src';
import type { Action, CardId, ContractId, FactionId, GameConfig, GameState } from '../src';

export function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    playerNames: ['A', 'B', 'C', 'D'],
    factions: ['Custodes', 'Nullarii', 'Dominari', 'Conflux'],
    contract: 'more',
    seed: 42,
    ...overrides,
  };
}

/** Crea una partita e sostituisce le mani con quelle indicate (per testare situazioni precise). */
export function withHands(hands: CardId[][], leader = 0, overrides: Partial<GameConfig> = {}): GameState {
  const factions = [...new Set(hands.flat().map((id) => id.split('-')[0] as FactionId))];
  while (factions.length < hands.length) factions.push(factionIds().find((f) => !factions.includes(f))!);
  const state = createGame(
    config({ playerNames: hands.map((_, i) => `P${i}`), factions: factions.slice(0, hands.length), ...overrides }),
  );
  state.players.forEach((p, i) => (p.hand = [...hands[i]!]));
  state.leader = leader;
  state.turn = leader;
  return state;
}

export function play(state: GameState, ...cards: CardId[]): GameState {
  return cards.reduce((s, cardId) => applyAction(s, { type: 'play', player: s.turn, cardId }), state);
}

export function randomConfig(rng: () => number, contract?: ContractId): GameConfig {
  const n = 2 + Math.floor(rng() * 7);
  const factions = shuffle(factionIds(), rng).slice(0, n);
  return {
    playerNames: Array.from({ length: n }, (_, i) => `P${i}`),
    factions,
    contract: contract ?? (['more', 'less', 'avoidFaction', 'avoidHigh', 'avoidLow', 'unmade', 'last', 'last3', 'special', 'chaos'] as const)[Math.floor(rng() * 10)]!,
    targetFaction: factions[0],
    seed: Math.floor(rng() * 2 ** 32),
  };
}

/** Gioca una mano intera facendo decidere la CPU a ogni posto, scelte dei poteri comprese. */
export function playOut(state: GameState, rng: () => number): GameState {
  let s = state;
  while (s.phase !== 'handEnd') s = applyAction(s, cpuAction(s, rng));
  return s;
}

/** La prossima azione della CPU: decisione in sospeso, presa successiva o carta da giocare. */
export function cpuAction(s: GameState, rng: () => number): Action {
  if (s.decision) {
    const player = s.decision.player;
    return { type: 'decide', player, accept: chooseDecision(getView(s, player)) };
  }
  if (s.phase === 'trickEnd') return { type: 'nextTrick' };
  const view = getView(s, s.turn);
  const cardId = chooseCard(view, rng);
  return { type: 'play', player: s.turn, cardId, option: chooseOption(view, cardId) };
}

export { createRng };
