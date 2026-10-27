import { cardMatches, getCard, getContract } from './catalog';
import type { CardId, GameConfig, ScoringRule } from './types';

/** La regola vale per questa presa? */
export function ruleApplies(rule: ScoringRule, trickNo: number): boolean {
  return !rule.tricks || (trickNo >= rule.tricks.from && trickNo <= rule.tricks.to);
}

/** Punti del Contratto assegnati a chi vince la presa `trickNo` catturando `captured`. */
export function contractDelta(config: GameConfig, trickNo: number, captured: readonly CardId[]): number {
  const cards = captured.map(getCard);
  let delta = 0;
  for (const rule of getContract(config.contract).rules) {
    if (!ruleApplies(rule, trickNo)) continue;
    if (rule.per === 'trick') {
      delta += rule.points;
    } else {
      const filter = rule.filter ?? { kind: 'any' };
      delta += rule.points * cards.filter((c) => cardMatches(filter, c, config.targetFaction)).length;
    }
  }
  return delta;
}
