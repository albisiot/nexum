import { describe, expect, it } from 'vitest';
import {
  contracts,
  IllegalActionError,
  applyMatchAction,
  createMatch,
  getMatchView,
  matchRanking,
  playableContracts,
  randomHands,
} from '../src';
import type { MatchConfig, MatchState } from '../src';
import { cpuAction, createRng } from './helpers';

const config = (overrides: Partial<MatchConfig> = {}): MatchConfig => ({
  playerNames: ['A', 'B', 'C'],
  factions: ['Custodes', 'Nullarii', 'Dominari'],
  hands: [{ contract: 'more' }, { contract: 'less' }, { contract: 'avoidFaction', targetFaction: 'Dominari' }],
  seed: 11,
  ...overrides,
});

/** Gioca la mano in corso fino alla fine, con la CPU a ogni posto. */
function playHand(state: MatchState, rng: () => number): MatchState {
  let s = state;
  while (s.phase === 'playing') s = applyMatchAction(s, cpuAction(s.game, rng));
  return s;
}

describe('serie di Contratti', () => {
  it('gioca le mani in ordine e somma i punti', () => {
    const rng = createRng(5);
    let s = createMatch(config());
    expect(s.game.config.contract).toBe('more');

    s = playHand(s, rng);
    expect(s.phase).toBe('handEnd');
    expect(s.completed).toHaveLength(1);
    expect(() => applyMatchAction(s, { type: 'nextTrick' })).toThrow(IllegalActionError);

    s = applyMatchAction(s, { type: 'nextHand' });
    expect(s.game.config.contract).toBe('less');
    expect(s.game.players.every((p) => p.hand.length === 13 && p.score === 0)).toBe(true);

    s = playHand(applyMatchAction(playHand(s, rng), { type: 'nextHand' }), rng);
    expect(s.phase).toBe('matchEnd');
    expect(s.completed.map((h) => h.contract)).toEqual(['more', 'less', 'avoidFaction']);

    const totals = getMatchView(s, 0).totals;
    const sum = [0, 1, 2].map((i) => s.completed.reduce((t, h) => t + h.scores[i]!, 0));
    expect(totals).toEqual(sum);
    expect(matchRanking(totals)[0]).toBe(totals.indexOf(Math.max(...totals)));
    expect(() => applyMatchAction(s, { type: 'nextHand' })).toThrow(IllegalActionError);
  });

  it('i totali comprendono i punti della mano in corso', () => {
    let s = createMatch(config({ hands: [{ contract: 'more' }] }));
    while (s.game.phase !== 'trickEnd') {
      s = applyMatchAction(s, { type: 'play', player: s.game.turn, cardId: getMatchView(s, s.game.turn).game.legal[0]! });
    }
    expect(getMatchView(s, null).totals).toEqual(s.game.players.map((p) => p.score));
  });

  it('una serie da un solo Contratto finisce dopo una mano', () => {
    const s = playHand(createMatch(config({ hands: [{ contract: 'last' }] })), createRng(3));
    expect(s.phase).toBe('matchEnd');
  });

  it('ogni mano viene rimescolata', () => {
    const start = createMatch(config());
    const second = applyMatchAction(playHand(start, createRng(8)), { type: 'nextHand' });
    expect(second.game.players[0]!.hand).not.toEqual(start.game.players[0]!.hand);
  });

  it('rifiuta serie vuote o con un bersaglio fuori dal mazzo', () => {
    expect(() => createMatch(config({ hands: [] }))).toThrow(/almeno un Contratto/);
    expect(() => createMatch(config({ hands: [{ contract: 'avoidFaction', targetFaction: 'Auguria' }] }))).toThrow(/bersaglio/);
  });
});

describe('Contratti casuali', () => {
  it('senza Nullarii esclude Evita The Unmade', () => {
    expect(playableContracts(['Custodes', 'Auguria'])).not.toContain('unmade');
    expect(playableContracts(['Custodes', 'Nullarii'])).toHaveLength(contracts().length);
  });

  it('estrae Contratti diversi, con bersaglio nel mazzo quando serve', () => {
    const rng = createRng(77);
    for (let i = 0; i < 200; i++) {
      const factions = ['Custodes', 'Auguria', 'Conflux'] as const;
      const hands = randomHands(5, [...factions], rng);
      expect(hands).toHaveLength(5);
      expect(new Set(hands.map((h) => h.contract)).size).toBe(5);
      expect(hands.some((h) => h.contract === 'unmade')).toBe(false);
      for (const h of hands) {
        if (h.contract === 'avoidFaction') expect(factions).toContain(h.targetFaction);
        else expect(h.targetFaction).toBeUndefined();
      }
    }
    expect(randomHands(10, ['Custodes', 'Auguria'], rng)).toHaveLength(9);
  });
});
