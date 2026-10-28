// Poteri delle carte: quelli del simulatore v0.9 portati 1:1, più quelli decisi dall'autore dopo
// (docs/poteri.md, file NEXUM_poteri.xlsx).
// Ogni potere ha una chiave fissa (CardDef.power), così rinominare una carta nell'Editor non lo rompe.
import { getCard } from './catalog';
import { POWERS } from './powerList';
import { createRng } from './rng';
import type { CardDef, CardId, CardPlay, Decision, GameState, Play, PowerId, TrickNote, TrickResult } from './types';

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

/** Il potere della carta che ha aperto la presa (Vigil cambia le carte giocabili). */
export function leadPower(plays: readonly Play[]): PowerId | undefined {
  const lead = plays.find(isCardPlay);
  return lead && effectivePower(lead);
}

/** Poteri che si pagano con punti Contratto quando giochi la carta: quanto costa ogni volta e quante volte al massimo. */
export const PAID_POWERS: Readonly<Record<PowerId, { costPerTime: number; maxTimes: number }>> = {
  fury: { costPerTime: 2, maxTimes: 1 },
  ashen: { costPerTime: 1, maxTimes: 4 },
};

/** Le scelte che una carta offre quando la giochi (decisione generale 4: si sceglie giocandola). */
export type PlayChoice =
  /** Fury, Ashen: quante volte pagare. */
  | { kind: 'pay'; power: PowerId; costPerTime: number; maxTimes: number }
  /** Shift: 0 = +15, 1 = −15. */
  | { kind: 'shift'; power: PowerId }
  /** Archivist: il valore stampato di una carta già giocata in questa mano o scartata. */
  | { kind: 'borrow'; power: PowerId; values: number[] };

/** Quello che serve per sapere le scelte: è uguale nello stato completo e nella vista di un giocatore. */
interface ChoiceContext {
  plays: readonly Play[];
  history: readonly TrickResult[];
  discards: readonly CardId[];
}

/** Le scelte che offre questa carta se viene giocata adesso (anche col potere copiato da Palimpsest). */
export function playChoice(ctx: ChoiceContext, card: CardDef): PlayChoice | null {
  const power = card.power === 'palimpsest' ? copiedPower(ctx.plays) : card.power;
  if (!power) return null;
  const pay = PAID_POWERS[power];
  if (pay) return { kind: 'pay', power, ...pay };
  if (power === 'shift') return { kind: 'shift', power };
  if (power === 'archivist') {
    const ids = [
      ...ctx.history.flatMap((t) => t.plays.filter(isCardPlay).map((pl) => pl.cardId)),
      ...ctx.plays.filter(isCardPlay).map((pl) => pl.cardId),
      ...ctx.discards,
    ];
    const values = [...new Set(ids.map((id) => getCard(id).value))].sort((a, b) => b - a);
    return values.length ? { kind: 'borrow', power, values } : null;
  }
  return null;
}

/** L'opzione è ammessa per questa scelta? (0 = nessuna scelta particolare) */
export function isValidOption(choice: PlayChoice | null, option: number): boolean {
  if (!Number.isInteger(option) || option < 0) return false;
  if (option === 0) return true;
  if (!choice) return false;
  if (choice.kind === 'pay') return option <= choice.maxTimes;
  if (choice.kind === 'shift') return option === 1;
  return choice.values.includes(option);
}

/**
 * Valore finale di una carta nel momento in cui viene giocata.
 * Va chiamata prima di aggiungere la carta a `played` e a `state.plays`.
 * `power` è il potere con cui agisce (per Palimpsest, quello copiato); `option` la scelta fatta giocandola.
 */
export function valueOnPlay(state: GameState, player: number, card: CardDef, power = card.power, option = 0): number {
  const p = state.players[player]!;
  // Una carta protetta (Aegiron) ignora i malus degli avversari, non i bonus propri.
  let final = card.value + p.nextModifier + (p.protectNext ? 0 : p.nextPenalty);
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
  if (power === 'metamorph') {
    // Prende il valore stampato della carta giocata subito prima nella presa; se apre, resta com'è.
    const prev = state.plays.filter(isCardPlay).at(-1);
    if (prev) final = getCard(prev.cardId).value;
  }
  if (power === 'fury' && option > 0) final = 75;
  if (power === 'ashen') final += 20 * option;
  if (power === 'shift') final += option === 1 ? -15 : 15;
  if (power === 'archivist' && option > 0) final = option;

  return clamp(final, 0, 100);
}

/** Second Sight: una carta a caso dalla mano di ogni avversario. Il caso dipende dal seme, così la partita resta riproducibile. */
export function secondSight(state: GameState, player: number): { player: number; cardId: CardId }[] {
  const rng = createRng((state.config.seed ^ Math.imul(state.trickNo, 0x9e3779b1) ^ Math.imul(player + 1, 0x85ebca6b)) >>> 0);
  return state.players.flatMap((p, i) =>
    i === player || !p.hand.length ? [] : [{ player: i, cardId: p.hand[Math.floor(rng() * p.hand.length)]! }],
  );
}

/** Poteri che si attivano quando tutte le carte della presa sono scoperte. Modifica `plays`. */
export function applyRevealPowers(plays: Play[], notes: TrickNote[]): void {
  const active = plays.filter(isCardPlay);

  for (const pl of active) {
    if (pl.copied) notes.push({ type: 'powerCopied', player: pl.player, cardId: pl.cardId, power: pl.copied });
    if (pl.paid) notes.push({ type: 'pointsPaid', player: pl.player, cardId: pl.cardId, points: pl.paid });
    if (pl.borrowed) notes.push({ type: 'borrowed', player: pl.player, cardId: pl.cardId, value: pl.borrowed });
    if (effectivePower(pl) === 'second-sight') notes.push({ type: 'seen', player: pl.player, cardId: pl.cardId, target: null });
  }

  // Axiom e Measure non toccano le carte protette degli avversari.
  const spared = (pl: CardPlay, by: CardPlay[]) => pl.protected === true && !by.some((x) => x.player === pl.player);

  const axioms = active.filter((pl) => effectivePower(pl) === 'axiom');
  if (axioms.length) {
    active.forEach((pl) => {
      if (!spared(pl, axioms)) pl.final = getCard(pl.cardId).value;
    });
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

  const measures = active.filter((pl) => effectivePower(pl) === 'measure');
  if (measures.length) {
    active.forEach((pl) => {
      if (!spared(pl, measures)) pl.final = clamp(pl.final, 10, 90);
    });
    notes.push({ type: 'measure' });
  }
}

/** Giocatori che in questa presa non perdono punti per i poteri avversari: carta protetta (Aegiron) o Pax. */
export function shieldedPlayers(plays: readonly Play[]): number[] {
  return [
    ...new Set(
      plays.filter(isCardPlay).filter((pl) => pl.protected || effectivePower(pl) === 'pax').map((pl) => pl.player),
    ),
  ];
}

/** L'avversario con più punti tra `options` (a parità, il primo in ordine di posto): la scelta della CPU. */
export function leadingAmong(scores: readonly number[], options: readonly number[]): number | undefined {
  return [...options].sort((a, b) => scores[b]! - scores[a]! || a - b)[0];
}

/** Carte che un potere può far scartare: Faded One non si scarta. */
export function discardableCards(hand: readonly CardId[]): CardId[] {
  return hand.filter((id) => getCard(id).power !== 'faded-one');
}

/** Toglie punti o li dà, rispettando la protezione: un potere avversario non toglie punti a chi è protetto. */
export function scorePower(
  state: GameState,
  shielded: readonly number[],
  notes: TrickNote[],
  source: CardPlay,
  target: number,
  points: number,
): void {
  if (points < 0 && target !== source.player && shielded.includes(target)) {
    notes.push({ type: 'shielded', player: target, cardId: source.cardId });
    return;
  }
  state.players[target]!.score += points;
  notes.push({ type: 'scoreChanged', player: source.player, cardId: source.cardId, points, target });
}

/** Una carta esce dal gioco per un potere: va negli scarti; se è Unwritten, chi la possedeva prende 2 punti. */
export function discardByPower(state: GameState, owner: number, cardId: CardId, notes: TrickNote[]): void {
  const p = state.players[owner]!;
  p.hand = p.hand.filter((id) => id !== cardId);
  state.discards.push(cardId);
  if (getCard(cardId).power === 'unwritten') {
    p.score += 2;
    notes.push({ type: 'scoreChanged', player: owner, cardId, points: 2, target: owner });
  }
}

/**
 * Poteri che si attivano dopo che la presa è stata assegnata e il Contratto conteggiato.
 * Restituisce le decisioni da chiedere: l'avversario scelto da chi gioca Vesper Null, Ravager e Nullchild.
 */
export function applyAfterTrickPowers(
  state: GameState,
  trick: TrickResult,
  shielded: readonly number[],
  notes: TrickNote[],
): Decision[] {
  const decisions: Decision[] = [];
  const active = state.plays.filter(isCardPlay);
  const notLast = state.trickNo < state.tricksInHand;
  const winner = trick.winner;
  for (const pl of active) {
    const won = pl.player === winner;
    const power = effectivePower(pl);
    const score = (target: number, points: number) => scorePower(state, shielded, notes, pl, target, points);
    const modify = (target: number, amount: number) => {
      state.players[target]!.nextModifier += amount;
      notes.push({ type: 'nextModifier', player: pl.player, cardId: pl.cardId, amount, target });
    };
    const opponents = state.players.map((_, i) => i).filter((i) => i !== pl.player);
    // Decisione generale 6: l'avversario lo sceglie chi gioca la carta (con un solo avversario non c'è scelta).
    const target = (options: number[]) => {
      if (options.length > 1) decisions.push({ kind: 'target', player: pl.player, cardId: pl.cardId, power: power!, options });
      else if (options.length === 1) applyTarget(state, shielded, notes, pl, power!, options[0]!);
    };

    if (power === 'origin' && won) score(pl.player, 3);
    if (power === 'zero' && won) score(pl.player, 4);
    if (power === 'praetor' && won) modify(pl.player, 10);
    if (power === 'bloodmark' && !won && trick.winningValue >= 75) modify(pl.player, 15);
    if (power === 'vesper-null' && won) target(opponents);
    if (power === 'maledict' && !won) score(winner, -1);
    if (power === 'rebel' && !won && trick.winningValue >= 80) score(winner, -1);
    // Ravager: inutile puntare chi in questa presa è protetto.
    if (power === 'ravager' && won) target(opponents.filter((i) => !shielded.includes(i)));
    // Più bassa della presa: nessun'altra carta ha un valore finale minore (a pari merito vale).
    if (power === 'morrowshade' && active.every((x) => x.final >= pl.final)) score(pl.player, 1);
    if (power === 'nullchild' && won && notLast) target(opponents);
    if (power === 'aegiron' && won && notLast) {
      state.players[pl.player]!.protectNext = true;
      notes.push({ type: 'protectNext', player: pl.player, cardId: pl.cardId });
    }
    // The Witness più bassa della presa: chi l'ha giocata vede la mano di chi ha vinto.
    if (power === 'the-witness' && !won && active.every((x) => x.final >= pl.final)) {
      const seen = state.players[pl.player]!.seen;
      for (const cardId of state.players[winner]!.hand) seen.push({ player: winner, cardId });
      notes.push({ type: 'seen', player: pl.player, cardId: pl.cardId, target: winner });
    }
    // Oblivion: tutti scartano una carta a inizio turno e la mano ha una presa in meno.
    if (power === 'oblivion' && won && notLast) {
      state.tricksInHand--;
      for (const p of state.players) if (p.hand.length) p.mustDiscard++;
      notes.push({ type: 'oblivion', player: pl.player, cardId: pl.cardId });
    }
  }
  return decisions;
}

/** Applica l'effetto del potere sull'avversario scelto. */
export function applyTarget(
  state: GameState,
  shielded: readonly number[],
  notes: TrickNote[],
  source: CardPlay,
  power: PowerId,
  target: number,
): void {
  if (power === 'vesper-null') {
    state.players[target]!.nextPenalty -= 15;
    notes.push({ type: 'nextModifier', player: source.player, cardId: source.cardId, amount: -15, target });
  }
  if (power === 'ravager') scorePower(state, shielded, notes, source, target, -1);
  if (power === 'nullchild') {
    state.players[target]!.skipNext = true;
    notes.push({ type: 'skipNext', player: source.player, cardId: source.cardId, target });
  }
}

/**
 * Recuperi possibili a fine presa, prima di contare i punti (Black Echo, Echo Prime, Mnemos).
 * Anchor nella presa li blocca tutti.
 */
export function recoveryDecisions(state: GameState, winner: number, notes: TrickNote[]): Decision[] {
  const active = state.plays.filter(isCardPlay);
  const anchor = active.find((pl) => effectivePower(pl) === 'anchor');
  const decisions: Decision[] = [];
  for (const pl of active) {
    const power = effectivePower(pl);
    const p = state.players[pl.player]!;
    if (!discardableCards(p.hand).length) continue;
    const base = { kind: 'recover' as const, player: pl.player, cardId: pl.cardId, power: power! };
    if (power === 'black-echo' && pl.player !== winner && !p.used.includes(power)) decisions.push({ ...base, take: [pl.cardId] });
    if (power === 'echo-prime' && !p.used.includes(power)) decisions.push({ ...base, take: [pl.cardId] });
    if (power === 'mnemos' && pl.player === winner) {
      const take = active.filter((x) => x.player !== pl.player && getCard(x.cardId).value <= 20).map((x) => x.cardId);
      if (take.length) decisions.push({ ...base, take });
    }
  }
  if (anchor && decisions.length) {
    notes.push({ type: 'anchor', cardId: anchor.cardId });
    return [];
  }
  return decisions;
}
