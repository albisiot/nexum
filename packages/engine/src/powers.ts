// Poteri delle carte, portati 1:1 dal simulatore v0.9.
// I poteri il cui testo non è ancora tradotto in regole sono elencati in docs/questioni-aperte.md.
import { getCard } from './data/factions';
import type { CardDef, CardPlay, GameState, Play, TrickNote } from './types';

/** Nomi delle carte il cui potere è effettivamente applicato dal motore. */
export const IMPLEMENTED_POWERS: ReadonlySet<string> = new Set([
  // al momento della giocata
  'Afterimage',
  'Veritas',
  'Invariant',
  'Ascendant',
  'Challenger',
  'Gravemind',
  // alla rivelazione della presa
  'Axiom',
  'Switch',
  'Equalis',
  'Wildcard',
  'Measure',
  // dopo l'assegnazione della presa
  'Origin',
  'Zero',
  'Praetor',
  'Bloodmark',
  'Vesper Null',
  'Maledict',
  'Rebel',
  'Ravager',
]);

export function isPowerImplemented(card: CardDef): boolean {
  return IMPLEMENTED_POWERS.has(card.name);
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const isCardPlay = (pl: Play): pl is CardPlay => !pl.skipped;

/**
 * Valore finale di una carta nel momento in cui viene giocata.
 * Va chiamata prima di aggiungere la carta a `played` e a `state.plays`.
 */
export function valueOnPlay(state: GameState, player: number, card: CardDef): number {
  const p = state.players[player]!;
  let final = card.value + p.nextModifier;
  const prevId = p.played.at(-1);

  if (card.name === 'Afterimage' && prevId && getCard(prevId).value >= 70) final += 20;
  if (card.name === 'Veritas') final = 80;
  if (card.name === 'Invariant') final = 50;
  if (card.name === 'Ascendant' && p.recentResults.length === 2 && p.recentResults.every((won) => !won)) {
    final = 74;
  }
  if (card.name === 'Challenger' && state.plays.some((pl) => isCardPlay(pl) && getCard(pl.cardId).value > 70)) {
    final = 68;
  }
  if (card.name === 'Gravemind') final += Math.min(15, p.played.length * 3);

  return clamp(final, 0, 100);
}

/** Poteri che si attivano quando tutte le carte della presa sono scoperte. Modifica `plays`. */
export function applyRevealPowers(plays: Play[], notes: TrickNote[]): void {
  const active = plays.filter(isCardPlay);
  const named = (pl: CardPlay) => getCard(pl.cardId).name;

  if (active.some((pl) => named(pl) === 'Axiom')) {
    active.forEach((pl) => (pl.final = getCard(pl.cardId).value));
    notes.push({ type: 'axiom' });
    return;
  }

  const finals = active.map((pl) => pl.final);
  const max = Math.max(...finals);
  const min = Math.min(...finals);

  for (const pl of active) {
    const name = named(pl);
    if (name === 'Switch' && max >= 80 && min <= 20) {
      pl.final = 91;
      notes.push({ type: 'valueChanged', player: pl.player, cardId: pl.cardId, value: 91 });
    }
    if (name === 'Equalis' && max - min <= 20) {
      pl.final = 77;
      notes.push({ type: 'valueChanged', player: pl.player, cardId: pl.cardId, value: 77 });
    }
    if (name === 'Wildcard') {
      const opponents = active.filter((x) => x.player !== pl.player);
      if (opponents.length) {
        pl.final = Math.min(...opponents.map((x) => getCard(x.cardId).value)) + 1;
        notes.push({ type: 'valueChanged', player: pl.player, cardId: pl.cardId, value: pl.final });
      }
    }
  }

  if (active.some((pl) => named(pl) === 'Measure')) {
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
    const { name } = getCard(pl.cardId);
    const score = (target: number, points: number) => {
      state.players[target]!.score += points;
      notes.push({ type: 'scoreChanged', player: pl.player, cardId: pl.cardId, points, target });
    };
    const modify = (target: number, amount: number) => {
      state.players[target]!.nextModifier += amount;
      notes.push({ type: 'nextModifier', player: pl.player, cardId: pl.cardId, amount, target });
    };

    if (name === 'Origin' && won) score(pl.player, 3);
    if (name === 'Zero' && won) score(pl.player, 4);
    if (name === 'Praetor' && won) modify(pl.player, 10);
    if (name === 'Bloodmark' && !won && winning.final >= 75) modify(pl.player, 15);
    if (name === 'Vesper Null' && won) {
      const target = leadingOpponent(state, pl.player);
      if (target !== undefined) modify(target, -15);
    }
    if (name === 'Maledict' && !won) score(winning.player, -1);
    if (name === 'Rebel' && !won && winning.final >= 80) score(winning.player, -1);
    if (name === 'Ravager' && won) {
      const target = leadingOpponent(state, pl.player);
      if (target !== undefined) score(target, -1);
    }
  }
}
