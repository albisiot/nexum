import { cardMatches, getCard, getContract } from './catalog';
import { isCardPlay, paymentFor } from './powers';
import type { Rng } from './rng';
import { ruleApplies } from './scoring';
import type { CardId, PlayerView } from './types';

/**
 * CPU: punteggio euristico per ogni carta giocabile, più un po' di casualità.
 * Legge le regole del Contratto, quindi capisce anche i Contratti creati nell'Editor.
 * Vede solo la propria PlayerView, quindi non può barare (vale anche quando girerà su un server).
 */
export function chooseCard(view: PlayerView, rng: Rng): CardId {
  if (!view.legal.length) throw new Error('La CPU non ha carte giocabili.');
  const lead = view.leadFaction;
  const rules = getContract(view.contract).rules.filter((r) => ruleApplies(r, view.trickNo));
  const trickPoints = rules.filter((r) => r.per === 'trick').reduce((t, r) => t + r.points, 0);
  const cardRules = rules.filter((r) => r.per === 'card');

  const scored = view.legal.map((id) => {
    const card = getCard(id);
    const v = card.value;
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
    return { id, s };
  });

  scored.sort((a, b) => b.s - a.s);
  return scored[0]!.id;
}

/**
 * Quante volte pagare il potere della carta (Fury, Ashen). La CPU paga solo il minimo che le fa
 * superare la carta che sta vincendo, e solo se vincere la presa le rende più di quanto spende.
 */
export function chooseOption(view: PlayerView, cardId: CardId): number {
  const card = getCard(cardId);
  const payment = paymentFor(view.plays, card);
  const me = view.seat === null ? undefined : view.players[view.seat];
  if (!payment || !me) return 0;
  const lead = view.leadFaction;
  if (lead && card.faction !== lead) return 0; // fuori fazione non può vincere comunque

  const cards = view.plays.filter(isCardPlay);
  const rules = getContract(view.contract).rules.filter((r) => ruleApplies(r, view.trickNo));
  const gain = rules.reduce((t, r) => {
    if (r.per === 'trick') return t + r.points;
    const matching = [...cards.map((pl) => pl.cardId), cardId].filter((id) =>
      cardMatches(r.filter ?? { kind: 'any' }, getCard(id), view.targetFaction),
    );
    return t + r.points * matching.length;
  }, 0);
  const best = Math.max(0, ...cards.filter((pl) => !lead || getCard(pl.cardId).faction === lead).map((pl) => pl.final));
  const base = card.value + me.nextModifier;
  if (base > best) return 0;

  for (let times = 1; times <= payment.maxTimes; times++) {
    const value = payment.power === 'fury' ? 75 : base + 20 * times;
    if (value > best) return gain > times * payment.costPerTime ? times : 0;
  }
  return 0;
}

/** Reversal: la CPU annulla i punti della presa se le costano, o se ne guadagnano solo gli altri. */
export function chooseDecision(view: PlayerView): boolean {
  const d = view.decision;
  if (!d || view.seat === null) return false;
  const mine = d.deltas[view.seat]!;
  return mine < 0 || (mine === 0 && d.deltas.some((x, i) => i !== view.seat && x > 0));
}
