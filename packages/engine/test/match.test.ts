import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG,
  contractNeedsTarget,
  contracts,
  getContract,
  setCatalog,
  IllegalActionError,
  applyMatchAction,
  createMatch,
  getMatchView,
  matchRanking,
  playableContracts,
  randomHands,
  trumpForEach,
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
  it('esclude i Contratti che con i mazzi da 1 a 13 non possono assegnare punti', () => {
    const playable = playableContracts(['Custodes', 'Nullarii']);
    expect(playable.sort()).toEqual(
      [
        'avoidElevenThirteen', 'avoidFaction', 'avoidHigh', 'avoidLow', 'avoidNine', 'avoidTargetEight', 'avoidTargetThirteen', 'avoidTwelve',
        'chaos', 'domino', 'last', 'last2', 'last3', 'less', 'more', 'moreDouble', 'trump',
      ].sort(),
    );
    expect(contracts()).toHaveLength(19);
  });

  it('con carte adatte nei mazzi quei Contratti tornano', () => {
    setCatalog({ ...DEFAULT_CATALOG, cards: DEFAULT_CATALOG.packCards!, packCards: DEFAULT_CATALOG.cards });
    expect(playableContracts(['Custodes', 'Nullarii'])).toEqual(expect.arrayContaining(['unmade', 'special']));
    expect(playableContracts(['Custodes', 'Auguria'])).not.toContain('unmade');
    setCatalog(DEFAULT_CATALOG);
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
        if (contractNeedsTarget(getContract(h.contract))) expect(factions).toContain(h.targetFaction);
        else expect(h.targetFaction).toBeUndefined();
      }
    }
    expect(randomHands(19, ['Custodes', 'Auguria'], rng)).toHaveLength(17);
  });
});

describe('Una Briscola a testa', () => {
  it('ogni Briscola diventa una mano per giocatore, a giro da un posto a caso', () => {
    const starts = new Set<number>();
    const rng = createRng(5);
    for (let i = 0; i < 30; i++) {
      const hands = trumpForEach([{ contract: 'more' }, { contract: 'trump' }, { contract: 'less' }], 3, rng);
      expect(hands.map((h) => h.contract)).toEqual(['more', 'trump', 'trump', 'trump', 'less']);
      const leaders = hands.filter((h) => h.contract === 'trump').map((h) => h.leader!);
      expect([...leaders].sort()).toEqual([0, 1, 2]);
      expect(leaders[1]).toBe((leaders[0]! + 1) % 3);
      expect(leaders[2]).toBe((leaders[1]! + 1) % 3);
      starts.add(leaders[0]!);
      expect(hands.filter((h) => h.contract !== 'trump').every((h) => h.leader === undefined)).toBe(true);
    }
    expect(starts.size).toBe(3);
    // Senza Briscola la serie resta com'è.
    expect(trumpForEach([{ contract: 'more' }, { contract: 'less' }], 4, rng)).toEqual([{ contract: 'more' }, { contract: 'less' }]);
  });

  it('il primo di mano indicato apre la mano e sceglie la briscola', () => {
    for (const leader of [0, 1, 2]) {
      const s = createMatch(config({ hands: [{ contract: 'trump', leader }] }));
      expect(s.game.leader).toBe(leader);
      expect(s.game.turn).toBe(leader);
      expect(s.game.decision).toMatchObject({ kind: 'trump', player: leader });
    }
  });

  it('indicare il primo di mano non cambia le carte distribuite', () => {
    const drawn = createMatch(config({ hands: [{ contract: 'trump' }] }));
    const chosen = createMatch(config({ hands: [{ contract: 'trump', leader: (drawn.game.leader + 1) % 3 }] }));
    expect(chosen.game.players.map((p) => p.hand)).toEqual(drawn.game.players.map((p) => p.hand));
  });

  it('rifiuta un primo di mano che non è uno dei giocatori', () => {
    expect(() => createMatch(config({ hands: [{ contract: 'trump', leader: 3 }] }))).toThrow(/primo di mano/);
    expect(() => createMatch(config({ hands: [{ contract: 'more', leader: -1 }] }))).toThrow(/primo di mano/);
    expect(() => createMatch(config({ hands: [{ contract: 'more', leader: 1.5 }] }))).toThrow(/primo di mano/);
  });

  it('in una serie ognuno sceglie la briscola una volta', () => {
    const rng = createRng(9);
    let s = createMatch(config({ hands: trumpForEach([{ contract: 'trump' }, { contract: 'more' }], 3, rng) }));
    const choosers: number[] = [];
    for (;;) {
      const d = s.game.decision;
      if (d?.kind === 'trump') choosers.push(d.player);
      s = playHand(s, rng);
      if (s.phase === 'matchEnd') break;
      s = applyMatchAction(s, { type: 'nextHand' });
    }
    expect(s.completed.map((h) => h.contract)).toEqual(['trump', 'trump', 'trump', 'more']);
    expect([...choosers].sort()).toEqual([0, 1, 2]);
  });
});
