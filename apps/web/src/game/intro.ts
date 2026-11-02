import type { PlayerView } from '@nexum/engine';

/** All'inizio di ogni Contratto: la presentazione, poi le carte distribuite. Solo dopo si gioca. */
export const INTRO_SHOW_MS = 3_500;
export const INTRO_DEAL_MS = 1_500;
export const INTRO_MS = INTRO_SHOW_MS + INTRO_DEAL_MS;

/** Nessuno ha ancora fatto niente in questa mano: è il momento di presentare il Contratto. */
export function handFresh(g: Pick<PlayerView, 'plays' | 'history' | 'discards' | 'domino'>): boolean {
  if (g.plays.length || g.history.length || g.discards.length) return false;
  return !g.domino || (Object.keys(g.domino.table).length === 0 && g.domino.passed.length === 0);
}
