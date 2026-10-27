import { getCard, hasPowerText } from './data/factions';
import type { CardId, GameConfig } from './types';

/** Punti del Contratto assegnati a chi vince la presa `trickNo` catturando `captured`. */
export function contractDelta(config: GameConfig, trickNo: number, captured: readonly CardId[]): number {
  const cards = captured.map(getCard);
  const count = (pred: (c: (typeof cards)[number]) => boolean) => cards.filter(pred).length;

  switch (config.contract) {
    case 'more':
      return 1;
    case 'less':
      return -1;
    case 'avoidFaction':
      return -count((c) => c.faction === config.targetFaction);
    case 'avoidHigh':
      return -count((c) => c.value >= 80);
    case 'avoidLow':
      return -count((c) => c.value <= 20);
    case 'unmade':
      return cards.some((c) => c.name === 'The Unmade') ? -5 : 0;
    case 'last':
      return trickNo === 13 ? -5 : 0;
    case 'last3':
      return trickNo >= 11 ? -2 : 0;
    case 'special':
      return -count(hasPowerText);
    case 'chaos':
      return -1 - count((c) => c.faction === 'Nullarii') - count((c) => c.value >= 80) - (trickNo === 13 ? 3 : 0);
  }
}
