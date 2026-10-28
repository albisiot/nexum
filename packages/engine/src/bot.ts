import { cardMatches, getCard, getContract } from './catalog';
import { discardableCards, isCardPlay, leadingAmong, playChoice } from './powers';
import type { Rng } from './rng';
import { ruleApplies } from './scoring';
import type { Action, CardId, PlayerView } from './types';

/**
 * CPU: punteggio euristico per ogni carta giocabile, più un po' di casualità.
 * Legge le regole del Contratto, quindi capisce anche i Contratti creati nell'Editor.
 * Vede solo la propria PlayerView, quindi non può barare (vale anche quando girerà su un server).
 */
export function chooseCard(view: PlayerView, rng: Rng): CardId {
  if (!view.legal.length) throw new Error('La CPU non ha carte giocabili.');
  const lead = view.leadFaction;
  const rules = activeRules(view);
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
export function chooseDecision(view: PlayerView): Extract<Action, { type: 'decide' }> {
  const d = view.decision;
  const seat = view.seat;
  if (!d || seat === null) throw new Error('Nessuna decisione per la CPU.');
  const answer = { type: 'decide' as const, player: seat };
  switch (d.kind) {
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
