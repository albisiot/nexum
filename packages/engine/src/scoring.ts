import { cardMatches, getCard, getContract } from './catalog';
import { TRICKS_PER_HAND } from './constants';
import type { CardId, GameConfig, ScoringRule } from './types';

/**
 * La regola vale per questa presa? `lastTrick` è l'ultima presa della mano: con Oblivion la mano
 * si accorcia, e le regole che arrivano fino all'ultima presa ("ultime 3", "presa 13") si spostano con lei.
 */
export function ruleApplies(rule: ScoringRule, trickNo: number, lastTrick = TRICKS_PER_HAND): boolean {
  if (!rule.tricks) return true;
  const shift = rule.tricks.to >= TRICKS_PER_HAND ? TRICKS_PER_HAND - lastTrick : 0;
  return trickNo >= rule.tricks.from - shift && trickNo <= rule.tricks.to - shift;
}

/** Punti del Contratto assegnati a chi vince la presa `trickNo` catturando `captured`. */
export function contractDelta(
  config: GameConfig,
  trickNo: number,
  captured: readonly CardId[],
  lastTrick = TRICKS_PER_HAND,
): number {
  const cards = captured.map(getCard);
  let delta = 0;
  for (const rule of getContract(config.contract).rules) {
    if (!ruleApplies(rule, trickNo, lastTrick)) continue;
    if (rule.per === 'trick') {
      delta += rule.points;
    } else {
      const filter = rule.filter ?? { kind: 'any' };
      delta += rule.points * cards.filter((c) => cardMatches(filter, c, config.targetFaction)).length;
    }
  }
  return delta;
}
