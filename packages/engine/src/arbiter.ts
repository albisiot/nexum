// Ciò che serve a chi fa da arbitro della partita: oggi il browser di chi crea la stanza online,
// domani eventualmente un server.
import { chooseCard, chooseDecision, chooseDiscard, chooseOption } from './bot';
import type { BotLevel } from './bot';
import type { MatchAction, MatchState } from './match';
import type { Rng } from './rng';
import type { Action } from './types';
import { getView } from './view';

/** Il posto da cui si aspetta una mossa: chi deve decidere, altrimenti chi è di turno. */
export function pendingSeat(state: MatchState): number | null {
  if (state.phase !== 'playing') return null;
  const g = state.game;
  if (g.decision) return g.decision.player;
  return g.phase === 'playing' ? g.turn : null;
}

/**
 * Può chi siede a `seat` chiedere questa azione? Si gioca e si decide solo per il proprio posto;
 * passare alla presa o alla mano successiva può chiederlo chiunque. Se poi l'azione è legale lo dice il motore.
 */
export function canRequest(seat: number, action: MatchAction): boolean {
  return action.type === 'nextTrick' || action.type === 'nextHand' || action.player === seat;
}

/** La mossa della CPU per il posto che deve agire (vede solo la vista di quel posto). */
export function botAction(state: MatchState, seat: number, rng: Rng, level: BotLevel = 'normal'): Action {
  const view = getView(state.game, seat);
  if (view.decision) return chooseDecision(view, level, rng);
  if (view.discardable.length) return { type: 'discard', player: seat, cardId: chooseDiscard(view) };
  const cardId = chooseCard(view, rng, level);
  return { type: 'play', player: seat, cardId, option: chooseOption(view, cardId) };
}
