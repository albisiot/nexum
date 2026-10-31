// Monete e pacchetti: regole decise dall'autore. Le carte dei pacchetti, per ora, servono solo alla collezione.
import { packCards } from './catalog';
import { shuffle } from './rng';
import type { Rng } from './rng';
import type { CardId } from './types';

export const CONTRACT_WIN_COINS = 5;
export const SERIES_WIN_COINS = 25;
export const PACK_PRICE = 150;
export const PACK_SIZE = 5;
export const DUPLICATE_COINS = 5;

export interface CoinReward {
  /** Identifica il premio dentro la partita: ogni premio si incassa una volta sola. */
  key: string;
  amount: number;
  kind: 'contract' | 'series';
  /** Di quale Contratto della serie è il premio (quelli della serie: l'ultimo). */
  handIndex: number;
}

/**
 * I premi di un giocatore finora. Vince un Contratto chi ha più punti in quella mano, e vince la partita chi ne ha
 * di più in totale, se i Contratti sono almeno due. A pari punti vincono tutti quelli in testa.
 */
export function matchRewards(
  match: { completed: readonly { scores: readonly number[] }[]; hands: readonly unknown[]; totals: readonly number[]; phase: string },
  seat: number,
): CoinReward[] {
  const rewards: CoinReward[] = [];
  match.completed.forEach((hand, handIndex) => {
    if (hand.scores[seat] === Math.max(...hand.scores)) {
      rewards.push({ key: `contract-${handIndex}`, amount: CONTRACT_WIN_COINS, kind: 'contract', handIndex });
    }
  });
  if (match.phase === 'matchEnd' && match.hands.length > 1 && match.totals[seat] === Math.max(...match.totals)) {
    rewards.push({ key: 'series', amount: SERIES_WIN_COINS, kind: 'series', handIndex: match.completed.length - 1 });
  }
  return rewards;
}

export interface PackPull {
  cardId: CardId;
  /** Era già nella collezione: non si aggiunge, vale DUPLICATE_COINS monete. */
  duplicate: boolean;
}

/** Cinque carte diverse a caso tra tutte quelle dei pacchetti. */
export function openPack(owned: Readonly<Record<CardId, unknown>>, rng: Rng): PackPull[] {
  return shuffle(packCards().map((c) => c.id), rng)
    .slice(0, PACK_SIZE)
    .map((cardId) => ({ cardId, duplicate: cardId in owned }));
}

/** Le monete restituite dai doppioni di un pacchetto. */
export const duplicateCoins = (pulls: readonly PackPull[]) => pulls.filter((p) => p.duplicate).length * DUPLICATE_COINS;
