import { describe, expect, it } from 'vitest';
import { IllegalActionError, applyAction, chooseDecision, chooseOption, contractDelta, getView, legalCards } from '../src';
import type { CardPlay, GameConfig, GameState } from '../src';
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

  it('Vesper Null che vince: chi l’ha giocata sceglie l’avversario che avrà −15 sulla prossima carta', () => {
    const s = withHands([['Nullarii-1'], ['Nullarii-12'], ['Nullarii-11']]);
    s.players[2]!.score = 5;
    const after = play(s, 'Nullarii-1', 'Nullarii-12', 'Nullarii-11');
    expect(after.decision).toEqual({ kind: 'target', player: 0, cardId: 'Nullarii-1', power: 'vesper-null', options: [1, 2] });
    expect(() => applyAction(after, { type: 'nextTrick' })).toThrow(IllegalActionError);
    // La CPU sceglie l'avversario in testa.
    expect(chooseDecision(getView(after, 0)).target).toBe(2);
    const chosen = applyAction(after, { type: 'decide', player: 0, accept: true, target: 1 });
    expect(chosen.players[1]!.nextPenalty).toBe(-15);
    expect(chosen.players[2]!.nextPenalty).toBe(0);
    expect(getView(chosen, 0).players[1]!.nextModifier).toBe(-15);
  });

  it('con un solo avversario il bersaglio è automatico', () => {
    const after = play(withHands([['Nullarii-1'], ['Nullarii-12']]), 'Nullarii-1', 'Nullarii-12');
    expect(after.decision).toBeNull();
    expect(after.players[1]!.nextPenalty).toBe(-15);
  });

  it('Ravager: chi l’ha giocata sceglie chi perde 1 punto, ma non chi è protetto da Pax', () => {
    // Ravager prende; Pax protegge il giocatore 1, quindi resta solo il 2 e il bersaglio è automatico.
    const s = play(withHands([['Dominari-3'], ['Concordia-10'], ['Dominari-12']]), 'Dominari-3', 'Concordia-10', 'Dominari-12');
    expect(s.decision).toBeNull();
    expect(s.players.map((p) => p.score)).toEqual([1, 0, -1]);
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

  it('Nullchild che vince fa saltare la presa successiva all’avversario scelto', () => {
    const s = withHands([
      ['Nullarii-6', 'Dominari-0'],
      ['Nullarii-8', 'Dominari-1'],
      ['Nullarii-12', 'Dominari-2'],
    ]);
    let after = play(s, 'Nullarii-6', 'Nullarii-8', 'Nullarii-12');
    expect(after.decision?.kind).toBe('target');
    after = applyAction(after, { type: 'decide', player: 0, accept: true, target: 2 });
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

describe('poteri con una scelta', () => {
  const opt = (s: GameState, cardId: string, option: number) =>
    applyAction(s, { type: 'play', player: s.turn, cardId, option });

  it('Fury: pagando 2 punti vale 75', () => {
    const paid = play(opt(withHands([['Dominari-10'], ['Dominari-5']]), 'Dominari-10', 1), 'Dominari-5');
    expect(finalOf(paid.history[0]!.plays, 'Dominari-10')).toBe(75);
    expect(paid.history[0]!.winner).toBe(0);
    expect(paid.players[0]!.score).toBe(-2 + 1);
    expect(paid.history[0]!.notes).toContainEqual({ type: 'pointsPaid', player: 0, cardId: 'Dominari-10', points: 2 });

    const free = play(withHands([['Dominari-10'], ['Dominari-5']]), 'Dominari-10', 'Dominari-5');
    expect(finalOf(free.history[0]!.plays, 'Dominari-10')).toBe(20);
    expect(free.players[0]!.score).toBe(0);
  });

  it('Ashen: 1 punto per ogni +20, fino a 4 volte', () => {
    const s = opt(withHands([['Nullarii-10'], ['Nullarii-0']]), 'Nullarii-10', 3);
    expect(finalOf(s.plays, 'Nullarii-10')).toBe(17 + 60);
    expect(s.players[0]!.score).toBe(-3);
    expect(finalOf(opt(withHands([['Nullarii-10'], ['Nullarii-0']]), 'Nullarii-10', 4).plays, 'Nullarii-10')).toBe(97);
  });

  it('rifiuta pagamenti fuori misura o su carte che non si pagano', () => {
    expect(() => opt(withHands([['Dominari-10'], ['Dominari-5']]), 'Dominari-10', 2)).toThrow(IllegalActionError);
    expect(() => opt(withHands([['Nullarii-10'], ['Nullarii-0']]), 'Nullarii-10', 5)).toThrow(IllegalActionError);
    expect(() => opt(withHands([['Dominari-0'], ['Dominari-5']]), 'Dominari-0', 1)).toThrow(/non è possibile/);
  });

  it('Palimpsest che copia Fury si può pagare anche lei', () => {
    const s = opt(play(withHands([['Dominari-10'], ['Reliquiae-1']]), 'Dominari-10'), 'Reliquiae-1', 1);
    const copy = s.history[0]!.plays.find((pl) => pl.player === 1) as CardPlay;
    expect([copy.copied, copy.final, copy.paid]).toEqual(['fury', 75, 2]);
  });

  it('Reversal: chi la cattura decide se annullare i punti della presa', () => {
    // Meno prese: chi prende perde 1 punto. Meridian cattura Reversal.
    const s = play(withHands([['Custodes-7'], ['Custodes-0']], 0, { contract: 'less' }), 'Custodes-7', 'Custodes-0');
    expect(s.decision).toEqual({ kind: 'reversal', player: 1, cardId: 'Custodes-7', deltas: [0, -1] });
    expect(() => applyAction(s, { type: 'nextTrick' })).toThrow(/decisioni/);
    expect(() => applyAction(s, { type: 'decide', player: 0, accept: true })).toThrow(IllegalActionError);

    const cancelled = applyAction(s, { type: 'decide', player: 1, accept: true });
    expect(cancelled.players[1]!.score).toBe(0);
    expect(cancelled.history[0]!.contractDelta).toBe(0);
    expect(cancelled.history[0]!.cancelled).toBe(true);
    expect(cancelled.decision).toBeNull();
    expect(applyAction(cancelled, { type: 'nextTrick' }).trickNo).toBe(2);

    const kept = applyAction(s, { type: 'decide', player: 1, accept: false });
    expect(kept.players[1]!.score).toBe(-1);
    expect(kept.history[0]!.notes).toContainEqual({ type: 'reversal', player: 1, cardId: 'Custodes-7', cancelled: false });
  });

  it('Reversal annulla i punti di tutti, poteri compresi', () => {
    // Più prese: Meridian prende (+1), Morrowshade è la più bassa (+1 a chi l'ha giocata).
    const s = play(withHands([['Custodes-7'], ['Custodes-0'], ['Nullarii-9']]), 'Custodes-7', 'Custodes-0', 'Nullarii-9');
    expect(s.decision).toMatchObject({ kind: 'reversal', deltas: [0, 1, 1] });
    const cancelled = applyAction(s, { type: 'decide', player: 1, accept: true });
    expect(cancelled.players.map((p) => p.score)).toEqual([0, 0, 0]);
  });

  it('Reversal senza punti in gioco non chiede niente', () => {
    const s = play(withHands([['Custodes-7'], ['Custodes-0']], 0, { contract: 'last' }), 'Custodes-7', 'Custodes-0');
    expect(s.decision).toBeNull();
  });

  it('la CPU annulla i punti solo quando le conviene', () => {
    const lose = play(withHands([['Custodes-7'], ['Custodes-0']], 0, { contract: 'less' }), 'Custodes-7', 'Custodes-0');
    expect(chooseDecision(getView(lose, 1)).accept).toBe(true);
    const win = play(withHands([['Custodes-7'], ['Custodes-0']]), 'Custodes-7', 'Custodes-0');
    expect(chooseDecision(getView(win, 1)).accept).toBe(false);
  });

  it('la CPU paga solo se vincere le rende più di quanto spende', () => {
    // Più prese vale +1: pagare 2 punti per Fury non conviene mai.
    const fury = play(withHands([['Dominari-5'], ['Dominari-10']]), 'Dominari-5');
    expect(chooseOption(getView(fury, 1), 'Dominari-10')).toBe(0);
    // Ashen: 1 punto per superare Hollow (33) e guadagnarne 1 è un pareggio, quindi non paga.
    const ashen = play(withHands([['Nullarii-8'], ['Nullarii-10']]), 'Nullarii-8');
    expect(chooseOption(getView(ashen, 1), 'Nullarii-10')).toBe(0);
  });
});

describe('punteggio dei Contratti', () => {
  const cfg = (contract: GameConfig['contract']) => config({ contract, targetFaction: 'Nullarii' });
  const trick = ['Nullarii-0', 'Dominari-0', 'Custodes-12', 'Conflux-3'] as const; // Unmade 98, Imperator 99, Origin 3, Shift 75

  it.each([
    ['more', 5, 1],
    ['less', 5, -1],
    ['avoidFaction', 5, -1],
    ['avoidHigh', 5, -3],
    ['avoidLow', 5, -1],
    ['unmade', 5, -5],
    ['last', 12, 0],
    ['last', 13, -5],
    ['last3', 10, 0],
    ['last3', 11, -2],
    ['special', 5, -2],
    ['chaos', 5, -1 - 1 - 3],
    ['chaos', 13, -1 - 1 - 3 - 3],
  ] as const)('%s alla presa %i vale %i', (contract, trickNo, expected) => {
    expect(contractDelta(cfg(contract), trickNo, trick)).toBe(expected);
  });

  it.each([
    ['avoidHigh', ['Custodes-n12', 'Nullarii-n13', 'Dominari-n11', 'Conflux-n1'], -2],
    ['avoidLow', ['Custodes-n3', 'Nullarii-n1', 'Dominari-n4', 'Conflux-n13'], -2],
    ['avoidNine', ['Custodes-n9', 'Nullarii-n9', 'Dominari-n8', 'Conflux-n10'], -2],
    ['avoidNine', ['Custodes-n8', 'Nullarii-n10', 'Dominari-n1', 'Conflux-n13'], 0],
  ] as const)('%s con le carte da 1 a 13: %j vale %i', (contract, cards, expected) => {
    expect(contractDelta(cfg(contract), 5, cards)).toBe(expected);
  });
});
