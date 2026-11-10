import { cardMatches, getCard, getContract } from './catalog';
import { CARDS_PER_FACTION, TRICKS_PER_HAND } from './constants';
import type { CardId, GameConfig, ScoringRule } from './types';

/** Carte per fazione della mano, e quindi carte in mano e prese: 13 se la configurazione non lo dice. */
export function cardsPerFactionOf(config: Pick<GameConfig, 'cardsPerFaction'>): number {
  return config.cardsPerFaction ?? CARDS_PER_FACTION;
}

/**
 * Le prese in cui vale la regola, nella mano che finisce alla presa `lastTrick` (null = in tutte).
 * Gli intervalli si scrivono su 13 prese. Quelli che arrivano alla 13 valgono per le ultime prese della mano, con lo
 * stesso numero di prese: con Oblivion la mano si accorcia e con le mani lunghe si allunga, e "ultime 3" o
 * "presa 13" seguono l'ultima presa vera. Se partono dalla prima valgono per tutta la mano.
 */
export function ruleTricks(rule: ScoringRule, lastTrick = TRICKS_PER_HAND): { from: number; to: number } | null {
  if (!rule.tricks) return null;
  const { from, to } = rule.tricks;
  if (to < TRICKS_PER_HAND) return { from, to };
  return { from: from <= 1 ? 1 : lastTrick - (to - from), to: lastTrick };
}

/** La regola vale per questa presa? `lastTrick` è l'ultima presa della mano (vedi ruleTricks). */
export function ruleApplies(rule: ScoringRule, trickNo: number, lastTrick = TRICKS_PER_HAND): boolean {
  const range = ruleTricks(rule, lastTrick);
  return !range || (trickNo >= range.from && trickNo <= range.to);
}

/** Punti del Contratto assegnati a chi vince la presa `trickNo` catturando `captured`. */
export function contractDelta(
  config: GameConfig,
  trickNo: number,
  captured: readonly CardId[],
  lastTrick = cardsPerFactionOf(config),
): number {
  const cards = captured.map(getCard);
  const size = cardsPerFactionOf(config);
  let delta = 0;
  for (const rule of getContract(config.contract).rules) {
    if (!ruleApplies(rule, trickNo, lastTrick)) continue;
    if (rule.per === 'trick') {
      delta += rule.points;
    } else {
      const filter = rule.filter ?? { kind: 'any' };
      delta += rule.points * cards.filter((c) => cardMatches(filter, c, config.targetFaction, size)).length;
    }
  }
  return delta;
}
