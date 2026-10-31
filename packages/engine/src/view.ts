import { discardableNow, legalCards } from './game';
import type { GameState, PlayerView } from './types';

/**
 * Proietta lo stato completo su ciò che un giocatore può vedere.
 * La UI disegna solo PlayerView: in locale la calcola il browser,
 * online la invierà il server a ciascun giocatore.
 */
export function getView(state: GameState, seat: number | null): PlayerView {
  const me = seat === null ? undefined : state.players[seat];
  return {
    seat,
    contract: state.config.contract,
    targetFaction: state.config.targetFaction,
    factions: [...state.config.factions],
    trickNo: state.trickNo,
    tricksPerHand: state.tricksInHand,
    leader: state.leader,
    turn: state.turn,
    leadFaction: state.leadFaction,
    plays: state.plays.map((pl) => ({ ...pl })),
    phase: state.phase,
    players: state.players.map((p) => ({
      name: p.name,
      handCount: p.hand.length,
      capturedCount: p.captured.length,
      tricks: p.tricks,
      score: p.score,
      nextModifier: p.nextModifier + p.nextPenalty,
      protectedNext: p.protectNext,
      mustDiscard: p.mustDiscard,
    })),
    hand: me ? [...me.hand] : [],
    legal: seat === null ? [] : legalCards(state, seat),
    lastTrick: state.history.at(-1) ?? null,
    history: [...state.history],
    decision: state.decision,
    discards: [...state.discards],
    // Solo le carte viste che sono ancora in mano all'avversario: quelle giocate non servono più.
    seen: me ? me.seen.filter((x) => state.players[x.player]!.hand.includes(x.cardId)) : [],
    discardable: seat === null ? [] : discardableNow(state, seat),
    trump: state.trump,
    domino: state.domino,
    slam: state.slam,
  };
}
