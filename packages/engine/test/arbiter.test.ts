import { describe, expect, it } from 'vitest';
import { applyMatchAction, botAction, canRequest, createMatch, getMatchView, pendingSeat } from '../src';
import type { MatchConfig, MatchState } from '../src';
import { createRng } from './helpers';

const config = (overrides: Partial<MatchConfig> = {}): MatchConfig => ({
  playerNames: ['A', 'B', 'C'],
  factions: ['Custodes', 'Nullarii', 'Dominari'],
  hands: [{ contract: 'more' }, { contract: 'trump' }, { contract: 'domino' }],
  seed: 21,
  ...overrides,
});

/** Una serie intera giocata solo con le mosse dell'arbitro, passando dal JSON come in rete. */
function playAll(start: MatchState, rng: () => number): MatchState {
  let s = start;
  while (s.phase !== 'matchEnd') {
    const seat = pendingSeat(s);
    if (seat !== null) s = applyMatchAction(s, botAction(s, seat, rng));
    else s = applyMatchAction(s, s.phase === 'handEnd' ? { type: 'nextHand' } : { type: 'nextTrick' });
    s = JSON.parse(JSON.stringify(s)) as MatchState;
  }
  return s;
}

describe('arbitro', () => {
  it('sa chi deve agire: prima chi decide, poi chi è di turno, nessuno a presa finita', () => {
    const s = createMatch(config({ hands: [{ contract: 'trump' }] }));
    expect(pendingSeat(s)).toBe(s.game.decision!.player);
    let next = applyMatchAction(s, botAction(s, pendingSeat(s)!, createRng(1)));
    expect(pendingSeat(next)).toBe(next.game.turn);
    while (next.game.phase === 'playing') next = applyMatchAction(next, botAction(next, pendingSeat(next)!, createRng(1)));
    expect(pendingSeat(next)).toBeNull();
  });

  it('si gioca solo per il proprio posto, ma tutti possono far proseguire la partita', () => {
    expect(canRequest(1, { type: 'play', player: 1, cardId: 'x' })).toBe(true);
    expect(canRequest(1, { type: 'play', player: 2, cardId: 'x' })).toBe(false);
    expect(canRequest(1, { type: 'discard', player: 0, cardId: 'x' })).toBe(false);
    expect(canRequest(1, { type: 'decide', player: 2, accept: true })).toBe(false);
    expect(canRequest(1, { type: 'nextTrick' })).toBe(true);
    expect(canRequest(1, { type: 'nextHand' })).toBe(true);
  });

  it('una serie intera arriva in fondo anche passando dal JSON a ogni mossa', () => {
    const end = playAll(createMatch(config()), createRng(4));
    expect(end.completed.map((h) => h.contract)).toEqual(['more', 'trump', 'domino']);
    expect(pendingSeat(end)).toBeNull();
  });

  it('una partita ripresa dallo stato salvato finisce come quella originale', () => {
    let s = createMatch(config());
    const rng = createRng(9);
    for (let i = 0; i < 20; i++) {
      const seat = pendingSeat(s);
      s = applyMatchAction(s, seat !== null ? botAction(s, seat, rng) : { type: 'nextTrick' });
    }
    const saved = JSON.stringify(s);
    const a = playAll(s, createRng(5));
    const b = playAll(JSON.parse(saved) as MatchState, createRng(5));
    expect(b).toEqual(a);
  });

  it('nella vista inviata a un giocatore non ci sono le carte degli altri', () => {
    const s = createMatch(config({ hands: [{ contract: 'more' }] }));
    const seen = JSON.stringify(getMatchView(s, 0));
    for (const id of [...s.game.players[1]!.hand, ...s.game.players[2]!.hand]) expect(seen).not.toContain(`"${id}"`);
    for (const id of s.game.players[0]!.hand) expect(seen).toContain(`"${id}"`);
  });
});
