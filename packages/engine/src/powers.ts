// Poteri delle carte, portati 1:1 dal simulatore v0.9.
// Ogni potere ha una chiave fissa (CardDef.power), così rinominare una carta nell'Editor non lo rompe.
// I poteri il cui testo non è ancora tradotto in regole sono elencati in docs/questioni-aperte.md.
import { getCard } from './catalog';
import { POWERS } from './powerList';
import type { CardDef, CardPlay, GameState, Play, TrickNote } from './types';

export function isPowerImplemented(card: CardDef): boolean {
  return card.power !== undefined && card.power in POWERS;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const isCardPlay = (pl: Play): pl is CardPlay => !pl.skipped;

const powerOf = (cardId: string) => getCard(cardId).power;

/**
 * Valore finale di una carta nel momento in cui viene giocata.
 * Va chiamata prima di aggiungere la carta a `played` e a `state.plays`.
 */
export function valueOnPlay(state: GameState, player: number, card: CardDef): number {
  const p = state.players[player]!;
  let final = card.value + p.nextModifier;
  const prevId = p.played.at(-1);

  if (card.power === 'afterimage' && prevId && getCard(prevId).value >= 70) final += 20;
  if (card.power === 'veritas') final = 80;
  if (card.power === 'invariant') final = 50;
  if (card.power === 'ascendant' && p.recentResults.length === 2 && p.recentResults.every((won) => !won)) {
    final = 74;
  }
  if (card.power === 'challenger' && state.plays.some((pl) => isCardPlay(pl) && getCard(pl.cardId).value > 70)) {
    final = 68;
  }
  if (card.power === 'gravemind') final += Math.min(15, p.played.length * 3);

  return clamp(final, 0, 100);
}

/** Poteri che si attivano quando tutte le carte della presa sono scoperte. Modifica `plays`. */
export function applyRevealPowers(plays: Play[], notes: TrickNote[]): void {
  const active = plays.filter(isCardPlay);

  if (active.some((pl) => powerOf(pl.cardId) === 'axiom')) {
    active.forEach((pl) => (pl.final = getCard(pl.cardId).value));
    notes.push({ type: 'axiom' });
    return;
  }

  const finals = active.map((pl) => pl.final);
  const max = Math.max(...finals);
  const min = Math.min(...finals);

  for (const pl of active) {
    const power = powerOf(pl.cardId);
    if (power === 'switch' && max >= 80 && min <= 20) {
      pl.final = 91;
      notes.push({ type: 'valueChanged', player: pl.player, cardId: pl.cardId, value: 91 });
    }
    if (power === 'equalis' && max - min <= 20) {
      pl.final = 77;
      notes.push({ type: 'valueChanged', player: pl.player, cardId: pl.cardId, value: 77 });
    }
    if (power === 'wildcard') {
      const opponents = active.filter((x) => x.player !== pl.player);
      if (opponents.length) {
        pl.final = Math.min(...opponents.map((x) => getCard(x.cardId).value)) + 1;
        notes.push({ type: 'valueChanged', player: pl.player, cardId: pl.cardId, value: pl.final });
      }
    }
  }

  if (active.some((pl) => powerOf(pl.cardId) === 'measure')) {
    active.forEach((pl) => (pl.final = clamp(pl.final, 10, 90)));
    notes.push({ type: 'measure' });
  }
}

/** L'avversario con più punti (a parità, il primo in ordine di posto). */
function leadingOpponent(state: GameState, of: number): number | undefined {
  return state.players
    .map((p, i) => ({ score: p.score, i }))
    .filter((x) => x.i !== of)
    .sort((a, b) => b.score - a.score)[0]?.i;
}

/** Poteri che si attivano dopo che la presa è stata assegnata e il Contratto conteggiato. */
export function applyAfterTrickPowers(state: GameState, winning: CardPlay, notes: TrickNote[]): void {
  for (const pl of state.plays.filter(isCardPlay)) {
    const won = pl.player === winning.player;
    const power = powerOf(pl.cardId);
    const score = (target: number, points: number) => {
      state.players[target]!.score += points;
      notes.push({ type: 'scoreChanged', player: pl.player, cardId: pl.cardId, points, target });
    };
    const modify = (target: number, amount: number) => {
      state.players[target]!.nextModifier += amount;
      notes.push({ type: 'nextModifier', player: pl.player, cardId: pl.cardId, amount, target });
    };

    if (power === 'origin' && won) score(pl.player, 3);
    if (power === 'zero' && won) score(pl.player, 4);
    if (power === 'praetor' && won) modify(pl.player, 10);
    if (power === 'bloodmark' && !won && winning.final >= 75) modify(pl.player, 15);
    if (power === 'vesper-null' && won) {
      const target = leadingOpponent(state, pl.player);
      if (target !== undefined) modify(target, -15);
    }
    if (power === 'maledict' && !won) score(winning.player, -1);
    if (power === 'rebel' && !won && winning.final >= 80) score(winning.player, -1);
    if (power === 'ravager' && won) {
      const target = leadingOpponent(state, pl.player);
      if (target !== undefined) score(target, -1);
    }
  }
}
