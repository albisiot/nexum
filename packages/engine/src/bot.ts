import { cardMatches, factionCards, getCard, getContract } from './catalog';
import { dominoCards } from './domino';
import { discardableCards, isCardPlay, leadingAmong, playChoice } from './powers';
import type { Rng } from './rng';
import { ruleApplies } from './scoring';
import type { Action, CardId, PlayerView } from './types';

export type BotLevel = 'easy' | 'normal' | 'hard';

const BOT_LEVELS: readonly BotLevel[] = ['easy', 'normal', 'hard'];

/** Il livello di una CPU: casuale a ogni partita, e non si sceglie. */
export function randomBotLevel(rng: Rng): BotLevel {
  return BOT_LEVELS[Math.floor(rng() * BOT_LEVELS.length)]!;
}

/** La CPU facile a volte gioca una carta qualsiasi. */
const EASY_RANDOM_MOVE = 0.35;
/** Quanto sbaglia a valutare le carte chi non è al livello difficile. */
const NORMAL_NOISE = 1.5;
const HARD_NOISE = 0.05;

/**
 * CPU: punteggio euristico per ogni carta giocabile, più un po' di casualità.
 * Legge le regole del Contratto, quindi capisce anche i Contratti creati nell'Editor.
 * Vede solo la propria PlayerView, quindi non può barare a nessun livello (vale anche quando girerà su un server).
 */
export function chooseCard(view: PlayerView, rng: Rng, level: BotLevel = 'normal'): CardId {
  if (!view.legal.length) throw new Error('La CPU non ha carte giocabili.');
  if (view.domino) return chooseDomino(view, rng, level);
  if (level !== 'easy') return reasonedCard(view, rng, level === 'hard');
  if (rng() < EASY_RANDOM_MOVE) return view.legal[Math.floor(rng() * view.legal.length)]!;
  return roughCard(view, rng);
}

/** CPU facile: guarda solo se la carta è alta o bassa e se costa punti, senza contare cosa c'è sul tavolo. */
function roughCard(view: PlayerView, rng: Rng): CardId {
  const lead = view.leadFaction;
  const rules = activeRules(view);
  const trickPoints = rules.filter((r) => r.per === 'trick').reduce((t, r) => t + r.points, 0);
  const cardRules = rules.filter((r) => r.per === 'card');
  // I ragionamenti sono su una scala da 0 a 100, qualunque sia il valore massimo delle carte in gioco.
  const top = Math.max(...view.factions.flatMap((f) => factionCards(f).map((c) => c.value)));

  const scored = view.legal.map((id) => {
    const card = getCard(id);
    const v = (card.value / top) * 100;
    let s = rng() * 18;

    // Vincere questa presa conviene? Allora carte alte, altrimenti carte basse.
    if (trickPoints > 0) s += v * 0.7;
    else if (trickPoints < 0) s += (100 - v) * 0.7;
    else s += cardRules.length ? (100 - v) * 0.15 : v * 0.1;

    // Non buttare sul tavolo carte che costano punti a chi le cattura.
    const cardPoints = cardRules
      .filter((r) => cardMatches(r.filter ?? { kind: 'any' }, card, view.targetFaction))
      .reduce((t, r) => t + r.points, 0);
    if (cardPoints < 0) s += 30 * cardPoints;
    else if (cardRules.length) s += 10;

    if (lead && card.faction !== lead) s += 10;
    // Briscola: se conviene vincere, tagliare con la briscola è il modo più sicuro.
    if (lead && view.trump === card.faction && card.faction !== lead) s += trickPoints > 0 ? 45 : -45;
    return { id, s };
  });

  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.id;
}

/**
 * CPU normale e difficile: stima se la carta prenderà la presa. Punta a vincere con la carta più bassa che basta,
 * a perdere liberandosi delle carte alte, e a scartare le carte che costano punti quando può.
 * Solo la difficile tiene il conto delle carte già uscite, e sbaglia molto meno a valutare.
 */
function reasonedCard(view: PlayerView, rng: Rng, hard: boolean): CardId {
  const me = view.players[view.seat!]!;
  const table = view.plays.filter(isCardPlay);
  const past = hard ? [...view.history.flatMap((t) => t.plays.filter(isCardPlay).map((pl) => pl.cardId)), ...view.discards] : [];
  const gone = new Set<CardId>([...past, ...table.map((pl) => pl.cardId), ...view.hand]);
  const deck = view.factions.flatMap((f) => factionCards(f));
  const unseen = deck.filter((c) => !gone.has(c.id));
  const later = view.players.length - view.plays.length - 1;
  const seatsAfter = Array.from({ length: later }, (_, i) => view.players[(view.turn + 1 + i) % view.players.length]!);
  const cardsAfter = seatsAfter.reduce((t, p) => t + p.handCount, 0);
  const held = unseen.length ? Math.min(0.9, cardsAfter / unseen.length) : 0;
  const top = Math.max(...deck.map((c) => c.value));
  const rules = activeRules(view);
  const cardRules = rules.filter((r) => r.per === 'card');
  // Le regole delle prese che devono ancora venire: conviene prepararsi (es. tenere le carte basse per le ultime prese).
  const future = getContract(view.contract).rules.filter((r) => r.per === 'trick' && r.tricks && r.tricks.from > view.trickNo);
  const futureTrick = future.reduce((t, r) => t + r.points, 0);
  const pointsOf = (id: CardId) =>
    cardRules.filter((r) => cardMatches(r.filter ?? { kind: 'any' }, getCard(id), view.targetFaction)).reduce((t, r) => t + r.points, 0);
  // In media, quanto vale ogni carta che i giocatori dopo di me aggiungeranno alla presa.
  const unseenPoints = unseen.length ? unseen.reduce((t, c) => t + pointsOf(c.id), 0) / unseen.length : 0;

  /** Chi vuole vincere gioca sopra se può; chi vuole perdere (`avoid`) gioca sotto se può. */
  const chanceToWin = (id: CardId, avoid: boolean): number => {
    const card = getCard(id);
    const value = card.value + me.nextModifier;
    const isTrump = card.faction === view.trump;
    const trumpsOnTable = table.filter((pl) => getCard(pl.cardId).faction === view.trump);
    if (view.leadFaction && !isTrump && card.faction !== view.leadFaction) return 0;
    if (trumpsOnTable.length && !isTrump) return 0;
    const rivals = trumpsOnTable.length ? trumpsOnTable : table.filter((pl) => getCard(pl.cardId).faction === view.leadFaction);
    if (rivals.some((pl) => pl.final >= value)) return 0;
    if (!later) return 1;
    const same = unseen.filter((c) => c.faction === card.faction);
    const higher = same.filter((c) => c.value > value).length;
    if (avoid) return same.length ? ((same.length - higher) / same.length) ** later : 1;
    const trumps = view.trump && !isTrump ? unseen.filter((c) => c.faction === view.trump).length : 0;
    return (1 - held) ** higher * (1 - held / 3) ** trumps;
  };

  const scored = view.legal.map((id) => {
    const height = getCard(id).value / top;
    const gain = winGain(view, [id]) + later * unseenPoints;
    const win = chanceToWin(id, gain < 0);
    let s = win * gain + rng() * (hard ? HARD_NOISE : NORMAL_NOISE);
    if (gain > 0) s -= height * (win > 0.5 ? 0.25 : 0.6); // vincere con il minimo, e non sprecare le carte alte
    else if (gain < 0) {
      // Se perde: lascia agli altri le carte che costano punti e si libera di quelle alte.
      s += (1 - win) * (-pointsOf(id) * 0.8 + height * 0.6);
    } else {
      s += futureTrick < 0 ? height * 0.5 : futureTrick > 0 ? -height * 0.5 : 0;
      s += pointsOf(id) < 0 ? 0.3 : 0;
    }
    return { id, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.id;
}

/** Domino: meglio aprire la strada alle proprie carte, senza liberare quelle degli altri. */
function chooseDomino(view: PlayerView, rng: Rng, level: BotLevel): CardId {
  if (level === 'easy') return view.legal[Math.floor(rng() * view.legal.length)]!;
  const scored = view.legal.map((id) => {
    const { faction } = getCard(id);
    const line = dominoCards(faction);
    const rank = line.indexOf(id);
    const open = view.domino!.table[faction];
    const mine = view.hand.filter((other) => getCard(other).faction === faction).map((other) => line.indexOf(other));
    const freed = !open ? mine.length - 1 : rank < open.low ? mine.filter((r) => r < rank).length : mine.filter((r) => r > rank).length;
    // Aprire una fazione o una strada senza avere carte da attaccare dopo aiuta solo gli altri: la difficile lo evita.
    if (level === 'hard') return { id, s: freed * 3 - (freed === 0 && !open ? 5 : 0) + rng() * 0.1 };
    return { id, s: freed * 3 + rng() * 12 };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.id;
}

/** Le regole del Contratto che valgono per la presa in corso. */
function activeRules(view: PlayerView) {
  return getContract(view.contract).rules.filter((r) => ruleApplies(r, view.trickNo, view.tricksPerHand));
}

/** Quanto renderebbe vincere la presa in corso con queste carte sul tavolo (punti del Contratto). */
function winGain(view: PlayerView, extra: CardId[]): number {
  const cards = [...view.plays.filter(isCardPlay).map((pl) => pl.cardId), ...extra];
  return activeRules(view).reduce((t, r) => {
    if (r.per === 'trick') return t + r.points;
    const matching = cards.filter((id) => cardMatches(r.filter ?? { kind: 'any' }, getCard(id), view.targetFaction));
    return t + r.points * matching.length;
  }, 0);
}

/**
 * La scelta del potere della carta (vedi Action 'play'). Fury e Ashen: la CPU paga solo il minimo che le fa
 * superare la carta che sta vincendo, e solo se vincere le rende più di quanto spende. Shift e Archivist:
 * alza il valore se vincere conviene, lo abbassa se conviene perdere.
 */
export function chooseOption(view: PlayerView, cardId: CardId): number {
  if (view.domino) return 0;
  const card = getCard(cardId);
  const choice = playChoice(view, card);
  const me = view.seat === null ? undefined : view.players[view.seat];
  if (!choice || !me) return 0;
  const lead = view.leadFaction;
  if (lead && card.faction !== lead) return 0; // fuori fazione non può vincere comunque

  const gain = winGain(view, [cardId]);
  const best = Math.max(
    0,
    ...view.plays.filter(isCardPlay).filter((pl) => !lead || getCard(pl.cardId).faction === lead).map((pl) => pl.final),
  );
  const base = card.value + me.nextModifier;

  if (choice.kind === 'shift') return gain < 0 ? 1 : 0;
  if (choice.kind === 'borrow') {
    if (gain > 0) {
      const top = choice.values[0]!;
      return top > base && top > best ? top : 0;
    }
    if (gain < 0) {
      const low = choice.values.at(-1)!;
      return low < base ? low : 0;
    }
    return 0;
  }
  if (base > best) return 0;
  for (let times = 1; times <= choice.maxTimes; times++) {
    const value = choice.power === 'fury' ? 75 : base + 20 * times;
    if (value > best) return gain > times * choice.costPerTime ? times : 0;
  }
  return 0;
}

/** La carta da scartare: Unwritten se c'è (dà 2 punti), altrimenti la più bassa. */
function worstCard(cards: readonly CardId[]): CardId | undefined {
  return (
    cards.find((id) => getCard(id).power === 'unwritten') ??
    [...cards].sort((a, b) => getCard(a).value - getCard(b).value)[0]
  );
}

/** Oblivion: la carta che la CPU scarta a inizio turno. */
export function chooseDiscard(view: PlayerView): CardId {
  const card = worstCard(view.discardable);
  if (!card) throw new Error('La CPU non ha carte da scartare.');
  return card;
}

/** La risposta della CPU alla decisione in sospeso (vedi Action 'decide'). */
export function chooseDecision(view: PlayerView, level: BotLevel = 'normal', rng: Rng = Math.random): Extract<Action, { type: 'decide' }> {
  const d = view.decision;
  const seat = view.seat;
  if (!d || seat === null) throw new Error('Nessuna decisione per la CPU.');
  const answer = { type: 'decide' as const, player: seat };
  switch (d.kind) {
    case 'trump': {
      // La fazione di cui ha più carte; a parità, quella con i valori più alti.
      if (level === 'easy') return { ...answer, accept: true, faction: d.options[Math.floor(rng() * d.options.length)]! };
      const strength = (f: string) => {
        const cards = view.hand.map(getCard).filter((c) => c.faction === f);
        return cards.length * 1000 + cards.reduce((t, c) => t + c.value, 0);
      };
      return { ...answer, accept: true, faction: [...d.options].sort((a, b) => strength(b) - strength(a))[0]! };
    }
    case 'reversal': {
      // Annulla i punti della presa se le costano, o se ne guadagnano solo gli altri.
      const mine = d.deltas[seat]!;
      return { ...answer, accept: mine < 0 || (mine === 0 && d.deltas.some((x, i) => i !== seat && x > 0)) };
    }
    case 'target':
      // Come prima della finestra di scelta: l'avversario in testa.
      return { ...answer, accept: true, target: leadingAmong(view.players.map((p) => p.score), d.options) };
    case 'recover': {
      const discard = worstCard(discardableCards(view.hand));
      if (!discard) return { ...answer, accept: false };
      if (d.power === 'mnemos') {
        // Una carta bassa in più serve solo se la mano punta a perdere le prese.
        const low = [...d.take].sort((a, b) => getCard(a).value - getCard(b).value)[0]!;
        const avoid = activeRules(view).some((r) => r.per === 'trick' && r.points < 0);
        return avoid && getCard(low).value < getCard(discard).value
          ? { ...answer, accept: true, take: low, discard }
          : { ...answer, accept: false };
      }
      // Black Echo, Echo Prime: riprendere una carta alta al posto della più bassa conviene quasi sempre.
      const card = d.take[0]!;
      return getCard(card).value > getCard(discard).value
        ? { ...answer, accept: true, take: card, discard }
        : { ...answer, accept: false };
    }
  }
}
