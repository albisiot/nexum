// Poteri delle carte: quelli del simulatore v0.9 portati 1:1, più quelli decisi dall'autore dopo
// (docs/poteri.md, file NEXUM_poteri.xlsx).
// Ogni potere ha una chiave fissa (CardDef.power), così rinominare una carta nell'Editor non lo rompe.
import { getCard } from './catalog';
import { TRICKS_PER_HAND } from './constants';
import { POWERS } from './powerList';
import type { CardDef, CardPlay, GameState, Play, PowerId, TrickNote } from './types';

export function isPowerImplemented(card: CardDef): boolean {
  return card.power !== undefined && card.power in POWERS;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const isCardPlay = (pl: Play): pl is CardPlay => !pl.skipped;

/** Il potere con cui una carta giocata agisce: quello copiato da Palimpsest, altrimenti il suo. */
export function effectivePower(pl: CardPlay): PowerId | undefined {
  return pl.copied ?? getCard(pl.cardId).power;
}

/** Palimpsest copia il potere programmato dell'ultima carta con potere giocata prima di lei nella presa. */
export function copiedPower(plays: readonly Play[]): PowerId | undefined {
  for (const pl of [...plays].reverse()) {
    if (!isCardPlay(pl)) continue;
    const power = effectivePower(pl);
    if (power && power !== 'palimpsest' && power in POWERS) return power;
  }
  return undefined;
}

/** Poteri che si pagano con punti Contratto quando giochi la carta: quanto costa ogni volta e quante volte al massimo. */
export const PAID_POWERS: Readonly<Record<PowerId, { costPerTime: number; maxTimes: number }>> = {
  fury: { costPerTime: 2, maxTimes: 1 },
  ashen: { costPerTime: 1, maxTimes: 4 },
};

/** Se giocando questa carta adesso si può pagare il suo potere (anche copiato da Palimpsest), come e quanto. */
export function paymentFor(plays: readonly Play[], card: CardDef) {
  const power = card.power === 'palimpsest' ? copiedPower(plays) : card.power;
  const rule = power ? PAID_POWERS[power] : undefined;
  return power && rule ? { power, ...rule } : null;
}

/** Il potere della carta che ha aperto la presa (Vigil cambia le carte giocabili). */
export function leadPower(plays: readonly Play[]): PowerId | undefined {
  const lead = plays.find(isCardPlay);
  return lead && effectivePower(lead);
}

/**
 * Valore finale di una carta nel momento in cui viene giocata.
 * Va chiamata prima di aggiungere la carta a `played` e a `state.plays`.
 * `power` è il potere con cui agisce (per Palimpsest, quello copiato); `times` quante volte è stato pagato.
 */
export function valueOnPlay(state: GameState, player: number, card: CardDef, power = card.power, times = 0): number {
  const p = state.players[player]!;
  let final = card.value + p.nextModifier;
  const prevId = p.played.at(-1);

  if (power === 'afterimage' && prevId && getCard(prevId).value >= 70) final += 20;
  if (power === 'veritas') final = 80;
  if (power === 'invariant') final = 50;
  if (power === 'ascendant' && p.recentResults.length === 2 && p.recentResults.every((won) => !won)) {
    final = 74;
  }
  if (power === 'challenger' && state.plays.some((pl) => isCardPlay(pl) && getCard(pl.cardId).value > 70)) {
    final = 68;
  }
  if (power === 'gravemind') final += Math.min(36, p.played.length * 3);
  if (power === 'balancer' || power === 'evenhand') {
    // "Ultimo" nei punti della mano in corso.
    const scores = state.players.map((x) => x.score);
    const min = Math.min(...scores);
    const tiedLast = scores.filter((x) => x === min).length;
    if (p.score === min && (power === 'balancer' ? tiedLast === 1 : tiedLast > 1)) final += 15;
  }
  if (power === 'fury' && times > 0) final = 75;
  if (power === 'ashen') final += 20 * times;

  return clamp(final, 0, 100);
}

/** Poteri che si attivano quando tutte le carte della presa sono scoperte. Modifica `plays`. */
export function applyRevealPowers(plays: Play[], notes: TrickNote[]): void {
  const active = plays.filter(isCardPlay);

  for (const pl of active) {
    if (pl.copied) notes.push({ type: 'powerCopied', player: pl.player, cardId: pl.cardId, power: pl.copied });
    if (pl.paid) notes.push({ type: 'pointsPaid', player: pl.player, cardId: pl.cardId, points: pl.paid });
  }

  if (active.some((pl) => effectivePower(pl) === 'axiom')) {
    active.forEach((pl) => (pl.final = getCard(pl.cardId).value));
    notes.push({ type: 'axiom' });
    return;
  }

  const finals = active.map((pl) => pl.final);
  const max = Math.max(...finals);
  const min = Math.min(...finals);
  const set = (pl: CardPlay, value: number) => {
    pl.final = value;
    notes.push({ type: 'valueChanged', player: pl.player, cardId: pl.cardId, value });
  };

  for (const pl of active) {
    const power = effectivePower(pl);
    if (power === 'switch' && max >= 80 && min <= 20) set(pl, 91);
    if (power === 'equalis' && max - min <= 20) set(pl, 77);
    if (power === 'symmetra' && max - min >= 40) set(pl, 69);
    if (power === 'wildcard') {
      const opponents = active.filter((x) => x.player !== pl.player);
      if (opponents.length) set(pl, Math.min(...opponents.map((x) => getCard(x.cardId).value)) + 1);
    }
  }

  // Paradox guarda i valori finali dopo gli altri poteri, contando anche sé stessa.
  const values = active.map((pl) => pl.final);
  if (new Set(values).size < values.length) {
    for (const pl of active) if (effectivePower(pl) === 'paradox') set(pl, 99);
  }

  if (active.some((pl) => effectivePower(pl) === 'measure')) {
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
  const active = state.plays.filter(isCardPlay);
  for (const pl of active) {
    const won = pl.player === winning.player;
    const power = effectivePower(pl);
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
    // Più bassa della presa: nessun'altra carta ha un valore finale minore (a pari merito vale).
    if (power === 'morrowshade' && active.every((x) => x.final >= pl.final)) score(pl.player, 1);
    // Nell'ultima presa non c'è una presa successiva da saltare.
    if (power === 'nullchild' && won && state.trickNo < TRICKS_PER_HAND) {
      const target = leadingOpponent(state, pl.player);
      if (target !== undefined) {
        state.players[target]!.skipNext = true;
        notes.push({ type: 'skipNext', player: pl.player, cardId: pl.cardId, target });
      }
    }
  }
}
