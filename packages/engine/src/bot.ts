import { cardMatches, getCard, getContract } from './catalog';
import type { Rng } from './rng';
import { ruleApplies } from './scoring';
import type { CardId, PlayerView } from './types';

/**
 * CPU: punteggio euristico per ogni carta giocabile, più un po' di casualità.
 * Legge le regole del Contratto, quindi capisce anche i Contratti creati nell'Editor.
 * Vede solo la propria PlayerView, quindi non può barare (vale anche quando girerà su un server).
 */
export function chooseCard(view: PlayerView, rng: Rng): CardId {
  if (!view.legal.length) throw new Error('La CPU non ha carte giocabili.');
  const lead = view.leadFaction;
  const rules = getContract(view.contract).rules.filter((r) => ruleApplies(r, view.trickNo));
  const trickPoints = rules.filter((r) => r.per === 'trick').reduce((t, r) => t + r.points, 0);
  const cardRules = rules.filter((r) => r.per === 'card');

  const scored = view.legal.map((id) => {
    const card = getCard(id);
    const v = card.value;
    let s = rng() * 18;

    // Vincere questa presa conviene? Allora carte alte, altrimenti carte basse.
    if (trickPoints > 0) s += v * 0.7;
    else if (trickPoints < 0) s += (100 - v) * 0.7;
    else s += cardRules.length ? (100 - v) * 0.15 : v * 0.1;

    // Non buttare sul tavolo carte che costano punti a chi le cattura.
    const cardPoints = cardRules
      .filter((r) => cardMatches(r.filter ?? { kind: 'any' }, card, view.targetFaction))
      .reduce((t, r) => t + r.points, 0);
    if (cardPoints < 0) s += 30 * cardPoints;
    else if (cardRules.length) s += 10;

    if (lead && card.faction !== lead) s += 10;
    return { id, s };
  });

  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.id;
}
