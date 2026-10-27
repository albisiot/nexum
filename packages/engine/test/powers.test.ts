import { describe, expect, it } from 'vitest';
import { applyAction, contractDelta } from '../src';
import type { CardPlay, GameConfig } from '../src';
import { config, play, withHands } from './helpers';

const finalOf = (plays: unknown[], cardId: string) => (plays as CardPlay[]).find((p) => p.cardId === cardId)!.final;

describe('poteri al momento della giocata', () => {
  it('Veritas vale sempre 80, anche con un bonus in sospeso', () => {
    const s = withHands([['Axiomata-2'], ['Axiomata-0']]);
    s.players[0]!.nextModifier = 10;
    const after = play(s, 'Axiomata-2');
    expect(finalOf(after.plays, 'Axiomata-2')).toBe(80);
    expect(after.players[0]!.nextModifier).toBe(0);
  });

  it('Gravemind cresce di 3 per ogni carta già giocata, fino a +15', () => {
    const s = withHands([['Nullarii-7'], ['Nullarii-0']]);
    s.players[0]!.played = ['Custodes-0', 'Custodes-1', 'Custodes-2'];
    expect(finalOf(play(s, 'Nullarii-7').plays, 'Nullarii-7')).toBe(41 + 9);
    s.players[0]!.played = Array.from({ length: 8 }, (_, i) => `Custodes-${i}`);
    expect(finalOf(play(s, 'Nullarii-7').plays, 'Nullarii-7')).toBe(41 + 15);
  });

  it('Challenger diventa 68 se prima di lui è stata giocata una carta oltre 70', () => {
    const s = withHands([['Dominari-1'], ['Dominari-9']]);
    expect(finalOf(play(s, 'Dominari-1', 'Dominari-9').plays, 'Dominari-9')).toBe(68);
  });

  it('Afterimage prende +20 se la tua carta precedente era 70+', () => {
    const s = withHands([['Reliquiae-6'], ['Reliquiae-0']]);
    s.players[0]!.played = ['Custodes-0'];
    expect(finalOf(play(s, 'Reliquiae-6').plays, 'Reliquiae-6')).toBe(66);
  });

  it('Ascendant diventa 74 dopo due prese perse', () => {
    const s = withHands([['Dominari-12'], ['Dominari-0']]);
    s.players[0]!.recentResults = [false, false];
    expect(finalOf(play(s, 'Dominari-12').plays, 'Dominari-12')).toBe(74);
  });
});

describe('poteri alla rivelazione', () => {
  it('Invariant vale 50; Axiom annulla gli altri effetti', () => {
    const plain = play(withHands([['Axiomata-11'], ['Axiomata-6']]), 'Axiomata-11', 'Axiomata-6');
    expect(plain.history[0]!.winningCardId).toBe('Axiomata-11');

    const axiom = play(withHands([['Axiomata-11'], ['Axiomata-5']]), 'Axiomata-11', 'Axiomata-5');
    expect(finalOf(axiom.history[0]!.plays, 'Axiomata-11')).toBe(8);
    expect(axiom.history[0]!.winningCardId).toBe('Axiomata-5');
    expect(axiom.history[0]!.notes).toContainEqual({ type: 'axiom' });
  });

  it('Switch diventa 91 se in presa ci sono un 80+ e un ≤20', () => {
    const s = play(withHands([['Conflux-6'], ['Conflux-0'], ['Custodes-12']]), 'Conflux-6', 'Conflux-0', 'Custodes-12');
    expect(finalOf(s.history[0]!.plays, 'Conflux-6')).toBe(91);
  });

  it('Measure limita i valori finali tra 10 e 90', () => {
    const s = play(withHands([['Axiomata-7'], ['Axiomata-0']]), 'Axiomata-7', 'Axiomata-0');
    expect(finalOf(s.history[0]!.plays, 'Axiomata-0')).toBe(90);
  });

  it('a parità di valore finale vince il valore stampato più basso', () => {
    const s = withHands([['Axiomata-11'], ['Axiomata-6']]);
    s.players[1]!.nextModifier = 3; // Clause 47 + 3 = 50, come Invariant
    const after = play(s, 'Axiomata-11', 'Axiomata-6');
    expect(after.history[0]!.winningCardId).toBe('Axiomata-11');
    expect(after.history[0]!.notes).toContainEqual({ type: 'tieBreak' });
  });
});

describe('poteri dopo la presa', () => {
  it('Origin che vince la presa dà +3 oltre al Contratto', () => {
    const s = play(withHands([['Custodes-12'], ['Dominari-0']]), 'Custodes-12', 'Dominari-0');
    expect(s.history[0]!.winner).toBe(0);
    expect(s.players[0]!.score).toBe(1 + 3);
  });

  it('Maledict che perde toglie 1 punto al vincitore', () => {
    const s = play(withHands([['Dominari-0'], ['Nullarii-3']]), 'Dominari-0', 'Nullarii-3');
    expect(s.players[0]!.score).toBe(1 - 1);
  });

  it('Praetor che vince dà +10 alla prossima carta', () => {
    let s = play(withHands([['Dominari-2', 'Dominari-6'], ['Dominari-5', 'Dominari-7']]), 'Dominari-2', 'Dominari-5');
    expect(s.players[0]!.nextModifier).toBe(10);
    s = applyAction(s, { type: 'nextTrick' });
    s = play(s, 'Dominari-6');
    expect(finalOf(s.plays, 'Dominari-6')).toBe(51 + 10);
  });

  it('Vesper Null che vince dà −15 alla prossima carta dell’avversario in testa', () => {
    const s = withHands([['Nullarii-1'], ['Nullarii-12'], ['Nullarii-11']]);
    s.players[2]!.score = 5;
    const after = play(s, 'Nullarii-1', 'Nullarii-12', 'Nullarii-11');
    expect(after.players[2]!.nextModifier).toBe(-15);
    expect(after.players[1]!.nextModifier).toBe(0);
  });
});

describe('punteggio dei Contratti', () => {
  const cfg = (contract: GameConfig['contract']) => config({ contract, targetFaction: 'Nullarii' });
  const trick = ['Nullarii-0', 'Dominari-0', 'Custodes-12', 'Conflux-3'] as const; // Unmade 98, Imperator 99, Origin 3, Shift 75

  it.each([
    ['more', 5, 1],
    ['less', 5, -1],
    ['avoidFaction', 5, -1],
    ['avoidHigh', 5, -2],
    ['avoidLow', 5, -1],
    ['unmade', 5, -5],
    ['last', 12, 0],
    ['last', 13, -5],
    ['last3', 10, 0],
    ['last3', 11, -2],
    ['special', 5, -2],
    ['chaos', 5, -1 - 1 - 2],
    ['chaos', 13, -1 - 1 - 2 - 3],
  ] as const)('%s alla presa %i vale %i', (contract, trickNo, expected) => {
    expect(contractDelta(cfg(contract), trickNo, trick)).toBe(expected);
  });
});
