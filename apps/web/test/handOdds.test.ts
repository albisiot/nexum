import { describe, expect, it } from 'vitest';
import { missingFactionChance } from '../src/game/handOdds';

describe('mani senza una fazione', () => {
  // Gli stessi numeri della simulazione (docs/simulazione-fazioni.md), che li ha controllati con il calcolo.
  it.each([
    [4, 13, 0.051],
    [5, 13, 0.189],
    [6, 13, 0.405],
    [8, 13, 0.821],
    [5, 19, 0.043],
    [6, 22, 0.072],
    [8, 22, 0.315],
  ])('%i giocatori × %i carte: %f', (players, cards, expected) => {
    expect(missingFactionChance(players, cards)).toBeCloseTo(expected, 2);
  });

  it('con 2 giocatori non manca mai una fazione intera… quasi mai', () => {
    expect(missingFactionChance(2, 13)).toBeLessThan(0.0001);
  });
});
