// Poteri decisi dall'autore il 28/10/2026: protezione, Shift e Metamorph, scarti e recuperi, informazioni nascoste.
import { describe, expect, it } from 'vitest';
import { IllegalActionError, applyAction, contractDelta, getView, legalCards, playChoice, getCard } from '../src';
import type { CardPlay, GameState } from '../src';
import { config, play, withHands } from './helpers';

const playOf = (s: GameState, cardId: string) =>
  [...s.plays, ...s.history.flatMap((t) => t.plays)].find((p) => !p.skipped && p.cardId === cardId) as CardPlay;
const opt = (s: GameState, cardId: string, option: number) => applyAction(s, { type: 'play', player: s.turn, cardId, option });
const next = (s: GameState) => applyAction(s, { type: 'nextTrick' });

describe('protezione', () => {
  it('Aegiron che vince protegge la tua prossima carta: niente malus avversari, niente punti tolti', () => {
    let s = play(withHands([['Custodes-1', 'Custodes-0'], ['Custodes-8', 'Nullarii-3']]), 'Custodes-1', 'Custodes-8');
    expect(s.players[0]!.protectNext).toBe(true);
    s = next(s);
    s.players[0]!.nextPenalty = -15; // come se un avversario avesse giocato Vesper Null
    s = play(s, 'Custodes-0', 'Nullarii-3'); // Maledict perde: toglierebbe 1 punto a chi vince
    expect([playOf(s, 'Custodes-0').final, playOf(s, 'Custodes-0').protected]).toEqual([91, true]);
    expect(s.players[0]!.score).toBe(2);
    expect(s.history[1]!.notes).toContainEqual({ type: 'shielded', player: 0, cardId: 'Nullarii-3' });
  });

  it('Measure e Axiom non toccano la carta protetta di un avversario', () => {
    const s = withHands([['Custodes-0'], ['Axiomata-7']]);
    s.players[0]!.protectNext = true;
    s.players[0]!.nextModifier = 5; // 96: Measure lo porterebbe a 90
    const after = play(s, 'Custodes-0', 'Axiomata-7');
    expect(playOf(after, 'Custodes-0').final).toBe(96);
  });

  it('Pax: nella presa in cui la giochi, i poteri avversari non ti tolgono punti', () => {
    const s = play(withHands([['Concordia-10'], ['Nullarii-3']]), 'Concordia-10', 'Nullarii-3');
    expect(s.history[0]!.winner).toBe(0);
    expect(s.players[0]!.score).toBe(1);
    expect(s.history[0]!.notes).toContainEqual({ type: 'shielded', player: 0, cardId: 'Nullarii-3' });
  });

  it('Reversal non toglie i punti guadagnati da chi è protetto', () => {
    // Meridian prende (+1); Morrowshade, protetta, è la più bassa (+1 a chi l'ha giocata).
    const s = withHands([['Custodes-7'], ['Nullarii-9'], ['Custodes-0']]);
    s.players[1]!.protectNext = true;
    const after = play(s, 'Custodes-7', 'Nullarii-9', 'Custodes-0');
    expect(after.decision).toMatchObject({ kind: 'reversal', player: 2, deltas: [0, 0, 1] });
  });
});

describe('Shift e Metamorph', () => {
  it('Shift: giocandola scegli +15 o −15', () => {
    expect(playOf(opt(withHands([['Conflux-3'], ['Conflux-0']]), 'Conflux-3', 0), 'Conflux-3').final).toBe(90);
    expect(playOf(opt(withHands([['Conflux-3'], ['Conflux-0']]), 'Conflux-3', 1), 'Conflux-3').final).toBe(60);
    expect(() => opt(withHands([['Conflux-3'], ['Conflux-0']]), 'Conflux-3', 2)).toThrow(IllegalActionError);
  });

  it('Metamorph prende il valore stampato della carta giocata subito prima nella presa', () => {
    const after = play(withHands([['Dominari-0'], ['Conflux-9']]), 'Dominari-0', 'Conflux-9');
    expect(playOf(after, 'Conflux-9').final).toBe(99);
    expect(playOf(play(withHands([['Conflux-9'], ['Conflux-0']]), 'Conflux-9'), 'Conflux-9').final).toBe(27);
  });
});

describe('scarti e recuperi', () => {
  it('Black Echo che perde torna in mano scartando un’altra carta, prima di contare i punti', () => {
    // "Non prendere carte con potere": se Black Echo restasse catturata, chi prende perderebbe 1 punto.
    const s = play(
      withHands([['Dominari-0', 'Dominari-1'], ['Nullarii-4', 'Nullarii-8', 'Reliquiae-10']], 0, { contract: 'special' }),
      'Dominari-0',
      'Nullarii-4',
    );
    expect(s.decision).toEqual({ kind: 'recover', player: 1, cardId: 'Nullarii-4', power: 'black-echo', take: ['Nullarii-4'] });
    expect(() => next(s)).toThrow(IllegalActionError);
    const after = applyAction(s, { type: 'decide', player: 1, accept: true, discard: 'Reliquiae-10' });
    expect(after.players[1]!.hand.sort()).toEqual(['Nullarii-4', 'Nullarii-8']);
    expect(after.players[0]!.captured).toEqual(['Dominari-0']);
    expect(after.players[0]!.score).toBe(0);
    // Unwritten scartata da un potere: 2 punti a chi la possedeva.
    expect(after.players[1]!.score).toBe(2);
    expect(after.discards).toEqual(['Reliquiae-10']);
    expect(after.players[1]!.used).toEqual(['black-echo']);

    // La seconda volta che perde non torna più.
    const again = play(next(after), 'Dominari-1', 'Nullarii-4');
    expect(again.decision).toBeNull();
  });

  it('Echo Prime: dopo averla giocata, una volta per mano, torna in mano anche se ha vinto', () => {
    const s = play(withHands([['Reliquiae-2', 'Reliquiae-12'], ['Reliquiae-8']]), 'Reliquiae-2', 'Reliquiae-8');
    expect(s.decision).toMatchObject({ kind: 'recover', player: 0, power: 'echo-prime' });
    const after = applyAction(s, { type: 'decide', player: 0, accept: true, discard: 'Reliquiae-12' });
    expect(after.players[0]!.hand).toEqual(['Reliquiae-2']);
    expect(after.players[0]!.tricks).toBe(1);
    expect(after.players[0]!.captured).toEqual(['Reliquiae-8']);
  });

  it('Mnemos che vince prende in mano una carta catturata di valore 20 o meno', () => {
    const s = play(withHands([['Reliquiae-3', 'Reliquiae-0'], ['Reliquiae-11']]), 'Reliquiae-3', 'Reliquiae-11');
    expect(s.decision).toMatchObject({ kind: 'recover', power: 'mnemos', take: ['Reliquiae-11'] });
    const after = applyAction(s, { type: 'decide', player: 0, accept: true, take: 'Reliquiae-11', discard: 'Reliquiae-0' });
    expect(after.players[0]!.hand).toEqual(['Reliquiae-11']);
    expect(after.players[0]!.captured).toEqual(['Reliquiae-3']);
  });

  it('si può rinunciare al recupero', () => {
    const s = play(withHands([['Reliquiae-2', 'Reliquiae-12'], ['Reliquiae-8']]), 'Reliquiae-2', 'Reliquiae-8');
    const after = applyAction(s, { type: 'decide', player: 0, accept: false });
    expect(after.players[0]!.captured.sort()).toEqual(['Reliquiae-2', 'Reliquiae-8']);
    expect(after.resolution).toBeNull();
  });

  it('Faded One non si può scartare', () => {
    const s = play(withHands([['Dominari-0'], ['Nullarii-4', 'Reliquiae-11']]), 'Dominari-0', 'Nullarii-4');
    // L'unica altra carta è Faded One: non c'è niente da scartare, quindi niente recupero.
    expect(s.decision).toBeNull();
    const t = play(withHands([['Dominari-0'], ['Nullarii-4', 'Reliquiae-11', 'Nullarii-8']]), 'Dominari-0', 'Nullarii-4');
    expect(() => applyAction(t, { type: 'decide', player: 1, accept: true, discard: 'Reliquiae-11' })).toThrow(IllegalActionError);
  });

  it('Anchor nella presa blocca tutti i recuperi', () => {
    const s = play(
      withHands([['Dominari-0'], ['Nullarii-4', 'Nullarii-8'], ['Custodes-10']]),
      'Dominari-0',
      'Nullarii-4',
      'Custodes-10',
    );
    expect(s.decision).toBeNull();
    expect(s.history[0]!.notes).toContainEqual({ type: 'anchor', cardId: 'Custodes-10' });
  });

  it('Archivist prende il valore stampato di una carta già giocata in questa mano', () => {
    let s = play(withHands([['Dominari-0', 'Reliquiae-5'], ['Dominari-1', 'Reliquiae-12']]), 'Dominari-0', 'Dominari-1');
    s = next(s);
    expect(playChoice(s, getCard('Reliquiae-5'))).toEqual({ kind: 'borrow', power: 'archivist', values: [99, 90] });
    expect(() => opt(s, 'Reliquiae-5', 50)).toThrow(IllegalActionError);
    const after = opt(s, 'Reliquiae-5', 99);
    expect([playOf(after, 'Reliquiae-5').final, playOf(after, 'Reliquiae-5').borrowed]).toEqual([99, 99]);
  });

  it('Oblivion: tutti scartano una carta a inizio turno e la mano ha una presa in meno', () => {
    let s = play(
      withHands([['Nullarii-2', 'Nullarii-0', 'Nullarii-5'], ['Nullarii-8', 'Nullarii-11', 'Reliquiae-10']]),
      'Nullarii-2',
      'Nullarii-8',
    );
    expect(s.tricksInHand).toBe(12);
    expect(s.players.map((p) => p.mustDiscard)).toEqual([1, 1]);
    s = next(s);
    // Prima di giocare, chi ha vinto deve scartare.
    expect(legalCards(s, 0)).toEqual([]);
    expect(getView(s, 0).discardable.sort()).toEqual(['Nullarii-0', 'Nullarii-5']);
    expect(() => play(s, 'Nullarii-0')).toThrow(/Oblivion/);
    s = applyAction(s, { type: 'discard', player: 0, cardId: 'Nullarii-5' });
    s = play(s, 'Nullarii-0');
    s = applyAction(s, { type: 'discard', player: 1, cardId: 'Reliquiae-10' });
    expect(s.players[1]!.score).toBe(2); // Unwritten scartata
    expect(s.discards).toEqual(['Nullarii-5', 'Reliquiae-10']);
  });

  it('con la mano più corta, le regole dell’ultima presa valgono sull’ultima presa vera', () => {
    const cfg = config({ contract: 'last' });
    expect(contractDelta(cfg, 12, ['Custodes-0'], 12)).toBe(-5);
    expect(contractDelta(cfg, 12, ['Custodes-0'])).toBe(0);
  });
});

describe('informazioni nascoste', () => {
  it('Second Sight: vedi una carta a caso della mano di ogni avversario, solo tu', () => {
    const s = play(withHands([['Custodes-9'], ['Custodes-0', 'Custodes-1'], ['Custodes-2', 'Custodes-3']]), 'Custodes-9');
    const seen = getView(s, 0).seen;
    expect(seen.map((x) => x.player)).toEqual([1, 2]);
    expect(seen.every((x) => s.players[x.player]!.hand.includes(x.cardId))).toBe(true);
    expect(getView(s, 1).seen).toEqual([]);
  });

  it('The Witness più bassa della presa: vedi la mano di chi vince', () => {
    const s = play(
      withHands([['Dominari-0', 'Dominari-1', 'Dominari-2'], ['Custodes-11', 'Custodes-0'], ['Dominari-3', 'Dominari-12']]),
      'Dominari-0',
      'Custodes-11',
      'Dominari-3',
    );
    expect(s.history[0]!.winner).toBe(0);
    expect(getView(s, 1).seen.map((x) => x.cardId).sort()).toEqual(['Dominari-1', 'Dominari-2']);
    expect(getView(s, 2).seen).toEqual([]);
  });
});
