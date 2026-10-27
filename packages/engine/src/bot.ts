import { getCard, hasPowerText } from './data/factions';
import type { Rng } from './rng';
import type { CardId, PlayerView } from './types';

/**
 * CPU del prototipo v0.9: punteggio euristico per carta in base al Contratto, più un po' di casualità.
 * Vede solo la propria PlayerView, quindi non può barare (vale anche quando girerà su un server).
 */
export function chooseCard(view: PlayerView, rng: Rng): CardId {
  if (!view.legal.length) throw new Error('La CPU non ha carte giocabili.');
  const lead = view.leadFaction;

  const scored = view.legal.map((id) => {
    const card = getCard(id);
    const v = card.value;
    let s = rng() * 18;
    switch (view.contract) {
      case 'more':
        s += v * 0.7;
        break;
      case 'less':
        s += (100 - v) * 0.7;
        break;
      case 'avoidFaction':
        s += (card.faction === view.targetFaction ? -30 : 10) + (100 - v) * 0.2;
        break;
      case 'avoidHigh':
        s += (v >= 80 ? -35 : 15) + (100 - v) * 0.15;
        break;
      case 'avoidLow':
        s += (v <= 20 ? -25 : 10) + v * 0.15;
        break;
      case 'unmade':
        s += (card.name === 'The Unmade' ? -80 : 5) + (100 - v) * 0.15;
        break;
      case 'last':
      case 'last3':
        s += view.trickNo >= 11 ? (100 - v) * 0.5 : v * 0.1;
        break;
      case 'special':
        s += (hasPowerText(card) ? -20 : 10) + (100 - v) * 0.15;
        break;
      case 'chaos':
        s += (100 - v) * 0.5 + (card.faction === 'Nullarii' ? -15 : 0) + (v >= 80 ? -15 : 0);
        break;
    }
    if (lead && card.faction !== lead) s += 10;
    return { id, s };
  });

  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.id;
}
