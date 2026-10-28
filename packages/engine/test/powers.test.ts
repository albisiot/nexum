import { describe, expect, it } from 'vitest';
import { applyAction, contractDelta, legalCards } from '../src';
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

  it('Gravemind cresce di 3 per ogni carta già giocata, fino a +36', () => {
    const s = withHands([['Nullarii-7'], ['Nullarii-0']]);
    s.players[0]!.played = ['Custodes-0', 'Custodes-1', 'Custodes-2'];
    expect(finalOf(play(s, 'Nullarii-7').plays, 'Nullarii-7')).toBe(41 + 9);
    s.players[0]!.played = Array.from({ length: 12 }, (_, i) => `Custodes-${i}`);
    expect(finalOf(play(s, 'Nullarii-7').plays, 'Nullarii-7')).toBe(41 + 36);
  });

  it('Balancer prende +15 solo se sei l’unico ultimo nei punti della mano', () => {
    const s = withHands([['Concordia-3'], ['Concordia-0'], ['Concordia-1']]);
    expect(finalOf(play(s, 'Concordia-3').plays, 'Concordia-3')).toBe(71); // tutti a 0: pari merito
    s.players[0]!.score = -1;
    expect(finalOf(play(s, 'Concordia-3').plays, 'Concordia-3')).toBe(86);
  });

  it('Evenhand prende +15 se sei ultimo a pari merito con altri', () => {
    const s = withHands([['Concordia-6'], ['Concordia-0'], ['Concordia-1']]);
    expect(finalOf(play(s, 'Concordia-6').plays, 'Concordia-6')).toBe(62); // tutti a 0
    s.players[1]!.score = 2;
    s.players[2]!.score = 2;
    expect(finalOf(play(s, 'Concordia-6').plays, 'Concordia-6')).toBe(47); // ultimo da solo
  });

  it('Palimpsest copia il potere dell’ultima carta con potere giocata prima di lei', () => {
    // Veritas si applica subito: Palimpsest vale 80.
    const veritas = play(withHands([['Axiomata-2'], ['Reliquiae-1']]), 'Axiomata-2', 'Reliquiae-1');
    const copy = veritas.history[0]!.plays.find((pl) => pl.player === 1) as CardPlay;
    expect([copy.final, copy.copied]).toEqual([80, 'veritas']);
    expect(veritas.history[0]!.notes).toContainEqual({ type: 'powerCopied', player: 1, cardId: 'Reliquiae-1', power: 'veritas' });

    // Zero si applica a fine presa: Palimpsest vince e prende i 4 punti di Zero.
    const zero = play(withHands([['Reliquiae-12'], ['Nullarii-12'], ['Reliquiae-1']]), 'Reliquiae-12', 'Nullarii-12', 'Reliquiae-1');
    expect(zero.history[0]!.winner).toBe(2);
    expect(zero.players[2]!.score).toBe(1 + 4);
    expect(zero.players[1]!.score).toBe(0);
  });

  it('Palimpsest senza carte con potere prima di lei non copia niente', () => {
    const s = play(withHands([['Dominari-0'], ['Reliquiae-1']]), 'Dominari-0', 'Reliquiae-1');
    const pl = s.history[0]!.plays.find((x) => x.player === 1) as CardPlay;
    expect([pl.final, pl.copied]).toEqual([84, undefined]);
  });
});

describe('Vigil', () => {
  it('se apre la presa, chi segue deve giocare la sua carta più alta di quella fazione', () => {
    const s = play(withHands([['Custodes-2'], ['Custodes-12', 'Custodes-0', 'Dominari-0']]), 'Custodes-2');
    expect(legalCards(s, 1)).toEqual(['Custodes-0']);
    expect(() => play(s, 'Custodes-12')).toThrow(/Vigil/);
  });

  it('chi non ha la fazione d’apertura gioca quello che vuole', () => {
    const s = play(withHands([['Custodes-2'], ['Dominari-12', 'Dominari-0']]), 'Custodes-2');
    expect(legalCards(s, 1)).toEqual(['Dominari-12', 'Dominari-0']);
  });

  it('se non apre la presa non cambia niente', () => {
    const s = play(withHands([['Custodes-6'], ['Custodes-2'], ['Custodes-12', 'Custodes-0']]), 'Custodes-6', 'Custodes-2');
    expect(legalCards(s, 2)).toEqual(['Custodes-12', 'Custodes-0']);
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

  it('Symmetra diventa 69 se i valori in presa differiscono di 40 o più', () => {
    const wide = play(withHands([['Concordia-7'], ['Dominari-0']]), 'Concordia-7', 'Dominari-0');
    expect(finalOf(wide.history[0]!.plays, 'Concordia-7')).toBe(69);
    const narrow = play(withHands([['Concordia-7'], ['Concordia-5']]), 'Concordia-7', 'Concordia-5');
    expect(finalOf(narrow.history[0]!.plays, 'Concordia-7')).toBe(39);
  });

  it('Paradox diventa 99 se due carte della presa hanno lo stesso valore finale', () => {
    // Kin e Notary valgono entrambe 31.
    const tie = play(withHands([['Nullarii-11'], ['Concordia-8'], ['Axiomata-8']]), 'Nullarii-11', 'Concordia-8', 'Axiomata-8');
    expect(finalOf(tie.history[0]!.plays, 'Nullarii-11')).toBe(99);
    expect(tie.history[0]!.winner).toBe(0);
    // Conta anche il suo valore: Faded One vale 9 come Paradox.
    const self = play(withHands([['Nullarii-11'], ['Reliquiae-11']]), 'Nullarii-11', 'Reliquiae-11');
    expect(finalOf(self.history[0]!.plays, 'Nullarii-11')).toBe(99);
    const none = play(withHands([['Nullarii-11'], ['Concordia-8']]), 'Nullarii-11', 'Concordia-8');
    expect(finalOf(none.history[0]!.plays, 'Nullarii-11')).toBe(9);
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

  it('Morrowshade più bassa della presa dà +1 punto a chi l’ha giocata', () => {
    const low = play(withHands([['Nullarii-9'], ['Nullarii-0']]), 'Nullarii-9', 'Nullarii-0');
    expect(low.players[0]!.score).toBe(1);
    expect(low.history[0]!.notes).toContainEqual({ type: 'scoreChanged', player: 0, cardId: 'Nullarii-9', points: 1, target: 0 });
    // Con Zero sul tavolo non è la più bassa: prende la presa e basta.
    const notLow = play(withHands([['Nullarii-9'], ['Nullarii-12']]), 'Nullarii-9', 'Nullarii-12');
    expect(notLow.players[0]!.score).toBe(1);
    expect(notLow.history[0]!.notes.some((n) => n.type === 'scoreChanged' && n.cardId === 'Nullarii-9')).toBe(false);
  });

  it('Nullchild che vince fa saltare la presa successiva all’avversario in testa', () => {
    const s = withHands([
      ['Nullarii-6', 'Dominari-0'],
      ['Nullarii-8', 'Dominari-1'],
      ['Nullarii-12', 'Dominari-2'],
    ]);
    s.players[2]!.score = 3;
    let after = play(s, 'Nullarii-6', 'Nullarii-8', 'Nullarii-12');
    expect(after.players[2]!.skipNext).toBe(true);
    expect(after.history[0]!.notes).toContainEqual({ type: 'skipNext', player: 0, cardId: 'Nullarii-6', target: 2 });

    after = play(applyAction(after, { type: 'nextTrick' }), 'Dominari-0', 'Dominari-1');
    expect(after.phase).toBe('trickEnd');
    expect(after.history[1]!.plays).toContainEqual({ player: 2, skipped: true });
    expect(after.players[2]!.hand).toEqual(['Dominari-2']);
  });

  it('Nullchild nell’ultima presa non fa saltare niente; a fine mano le carte avanzate si scartano', () => {
    const s = withHands([['Nullarii-6'], ['Nullarii-8'], ['Nullarii-12', 'Dominari-2']]);
    s.trickNo = 13;
    const after = play(s, 'Nullarii-6', 'Nullarii-8', 'Nullarii-12');
    expect(after.players[2]!.skipNext).toBe(false);
    const end = applyAction(after, { type: 'nextTrick' });
    expect(end.phase).toBe('handEnd');
    expect(end.players.every((p) => p.hand.length === 0)).toBe(true);
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
