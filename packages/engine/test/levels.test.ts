import { describe, expect, it } from 'vitest';
import { applyMatchAction, botAction, contractNeedsTarget, createMatch, getContract, pendingSeat, randomBotLevel } from '../src';
import type { BotLevel, MatchState } from '../src';
import { createRng } from './helpers';

const factions = ['Custodes', 'Nullarii', 'Dominari', 'Conflux'];

/** Una mano a 4: un posto al livello indicato, gli altri normali. Restituisce i punti e il posto. */
function hand(contract: string, level: BotLevel, g: number) {
  const seat = g % 4;
  const rng = createRng(g * 7 + 1);
  const plan = contractNeedsTarget(getContract(contract)) ? { contract, targetFaction: factions[g % 4]! } : { contract };
  let s: MatchState = createMatch({ playerNames: ['A', 'B', 'C', 'D'], factions, hands: [plan], seed: g + 1 });
  while (s.phase === 'playing') {
    const who = pendingSeat(s);
    s = applyMatchAction(s, who !== null ? botAction(s, who, rng, who === seat ? level : 'normal') : { type: 'nextTrick' });
  }
  return { scores: s.completed[0]!.scores, seat };
}

/** Quante mani su `n` vince quel livello contro tre CPU normali (a pari forza, circa il 25%). */
function winRate(contract: string, level: BotLevel, n = 500): number {
  let wins = 0;
  for (let g = 1000; g < 1000 + n; g++) {
    const { scores, seat } = hand(contract, level, g);
    const top = Math.max(...scores);
    if (scores[seat] === top) wins += 1 / scores.filter((x) => x === top).length;
  }
  return wins / n;
}

describe('livelli della CPU', () => {
  it('la difficile batte le normali e la facile ci perde', () => {
    for (const contract of ['more', 'less', 'domino']) {
      expect(winRate(contract, 'hard'), `${contract} difficile`).toBeGreaterThan(0.27);
      expect(winRate(contract, 'easy'), `${contract} facile`).toBeLessThan(0.23);
    }
  }, 180_000);

  it('a ogni livello tutte le mosse sono legali, in tutti i tipi di Contratto', () => {
    for (const contract of ['more', 'less', 'avoidFaction', 'avoidTwelve', 'avoidTargetEight', 'trump', 'domino', 'chaos']) {
      for (const level of ['easy', 'normal', 'hard'] as BotLevel[]) {
        for (let g = 0; g < 15; g++) expect(hand(contract, level, g).scores).toHaveLength(4);
      }
    }
  }, 60_000);

  it('il livello si estrae a caso e tutti e tre possono uscire', () => {
    const rng = createRng(5);
    const levels = new Set(Array.from({ length: 60 }, () => randomBotLevel(rng)));
    expect(levels).toEqual(new Set(['easy', 'normal', 'hard']));
  });
});
