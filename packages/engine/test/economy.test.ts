import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOG, PACK_SIZE, duplicateCoins, matchRewards, openPack } from '../src';
import { createRng } from './helpers';

const match = (scores: number[][], totals: number[], phase = 'handEnd', hands = scores.length) => ({
  completed: scores.map((s) => ({ scores: s })),
  hands: Array.from({ length: hands }),
  totals,
  phase,
});

describe('monete', () => {
  it('5 monete per ogni Contratto vinto', () => {
    const m = match([[3, 1], [0, 2], [5, 4]], [8, 7], 'playing', 5);
    expect(matchRewards(m, 0).map((r) => [r.key, r.amount])).toEqual([['contract-0', 5], ['contract-2', 5]]);
    expect(matchRewards(m, 1).map((r) => [r.key, r.amount])).toEqual([['contract-1', 5]]);
  });

  it('vince il Contratto chi ha più punti anche se sono negativi, e a pari punti vincono tutti', () => {
    expect(matchRewards(match([[-2, -5, -2]], [-2, -5, -2], 'playing', 3), 0)).toHaveLength(1);
    expect(matchRewards(match([[-2, -5, -2]], [-2, -5, -2], 'playing', 3), 1)).toHaveLength(0);
    expect(matchRewards(match([[-2, -5, -2]], [-2, -5, -2], 'playing', 3), 2)).toHaveLength(1);
  });

  it('25 monete in più solo a chi vince una partita a più Contratti, a partita finita', () => {
    const end = match([[3, 1], [0, 2]], [3, 3 - 0], 'matchEnd');
    expect(matchRewards(end, 0).map((r) => r.key)).toEqual(['contract-0', 'series']);
    const won = match([[3, 1], [0, 2]], [10, 3], 'matchEnd');
    expect(matchRewards(won, 0).reduce((t, r) => t + r.amount, 0)).toBe(30);
    expect(matchRewards(won, 1).map((r) => r.key)).toEqual(['contract-1']);
    expect(matchRewards(match([[3, 1], [0, 2]], [10, 3], 'handEnd'), 0).some((r) => r.kind === 'series')).toBe(false);
  });

  it('una partita a un solo Contratto vale solo le 5 monete', () => {
    expect(matchRewards(match([[3, 1]], [3, 1], 'matchEnd'), 0).map((r) => [r.key, r.amount])).toEqual([['contract-0', 5]]);
  });
});

describe('pacchetti', () => {
  const pack = DEFAULT_CATALOG.packCards!;

  it('5 carte diverse tra quelle dei pacchetti', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const pulls = openPack({}, rng);
      expect(pulls).toHaveLength(PACK_SIZE);
      expect(new Set(pulls.map((p) => p.cardId)).size).toBe(PACK_SIZE);
      expect(pulls.every((p) => pack.some((c) => c.id === p.cardId) && !p.duplicate)).toBe(true);
    }
  });

  it('nel tempo escono tutte le carte, senza preferenze', () => {
    const rng = createRng(8);
    const seen = new Map<string, number>();
    for (let i = 0; i < 4160; i++) for (const p of openPack({}, rng)) seen.set(p.cardId, (seen.get(p.cardId) ?? 0) + 1);
    expect(seen.size).toBe(pack.length);
    for (const n of seen.values()) expect(n).toBeGreaterThan(120); // in media 200 a testa
  });

  it('una carta già posseduta è un doppione da 5 monete', () => {
    const owned = Object.fromEntries(pack.map((c) => [c.id, true]));
    const pulls = openPack(owned, createRng(1));
    expect(pulls.every((p) => p.duplicate)).toBe(true);
    expect(duplicateCoins(pulls)).toBe(25);
    expect(duplicateCoins(openPack({}, createRng(1)))).toBe(0);
  });
});
