import { contractNeedsTarget, contracts, factionCards, factionIds, getCard } from './catalog';
import { MAX_PLAYERS, MIN_PLAYERS, TRICKS_PER_HAND } from './constants';
import {
  applyAfterTrickPowers,
  applyRevealPowers,
  applyTarget,
  copiedPower,
  discardByPower,
  discardableCards,
  effectivePower,
  isCardPlay,
  isValidOption,
  leadPower,
  playChoice,
  recoveryDecisions,
  secondSight,
  shieldedPlayers,
  valueOnPlay,
} from './powers';
import { createRng, shuffle } from './rng';
import { contractDelta } from './scoring';
import type { Action, CardId, CardPlay, GameConfig, GameState, PlayerState, TrickNote, TrickResult } from './types';

export { MAX_PLAYERS, MIN_PLAYERS, TRICKS_PER_HAND };

export class IllegalActionError extends Error {
  override name = 'IllegalActionError';
}

/** Restituisce l'elenco dei problemi della configurazione (vuoto se è valida). */
export function validateConfig(config: GameConfig): string[] {
  const errors: string[] = [];
  const n = config.playerNames.length;
  const known = factionIds();
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) errors.push(`Servono da ${MIN_PLAYERS} a ${MAX_PLAYERS} giocatori.`);
  if (config.factions.length !== n) errors.push(`Servono ${n} fazioni, ne sono state scelte ${config.factions.length}.`);
  if (new Set(config.factions).size !== config.factions.length) errors.push('Una fazione è stata scelta due volte.');
  for (const f of config.factions) {
    if (!known.includes(f)) errors.push(`Fazione sconosciuta: ${f}.`);
  }
  const contract = contracts().find((c) => c.id === config.contract);
  if (!contract) {
    errors.push(`Contratto sconosciuto: ${config.contract}.`);
  } else if (contractNeedsTarget(contract)) {
    if (!config.targetFaction || !config.factions.includes(config.targetFaction)) {
      errors.push('Il Contratto richiede una fazione bersaglio presente nel mazzo.');
    }
  }
  return errors;
}

/** Ordina una mano per fazione (nell'ordine del catalogo) e poi per valore decrescente. */
export function sortHand(hand: readonly CardId[]): CardId[] {
  const order = factionIds();
  return [...hand].sort((a, b) => {
    const ca = getCard(a);
    const cb = getCard(b);
    return order.indexOf(ca.faction) - order.indexOf(cb.faction) || cb.value - ca.value;
  });
}

/** Mescola il mazzo, distribuisce 13 carte a testa e sceglie a caso il primo di mano. */
export function createGame(config: GameConfig): GameState {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join(' '));

  const n = config.playerNames.length;
  const rng = createRng(config.seed);
  const deck = shuffle(config.factions.flatMap((f) => factionCards(f).map((c) => c.id)), rng);

  const players: PlayerState[] = config.playerNames.map((name, p) => ({
    name,
    hand: sortHand(Array.from({ length: TRICKS_PER_HAND }, (_, r) => deck[r * n + p]!)),
    played: [],
    captured: [],
    tricks: 0,
    score: 0,
    nextModifier: 0,
    nextPenalty: 0,
    protectNext: false,
    recentResults: [],
    skipNext: false,
    mustDiscard: 0,
    used: [],
    seen: [],
  }));

  const leader = Math.floor(rng() * n);
  const state: GameState = {
    config: structuredCopy(config),
    players,
    trickNo: 1,
    leader,
    turn: leader,
    leadFaction: null,
    plays: [],
    phase: 'playing',
    history: [],
    tricksInHand: TRICKS_PER_HAND,
    discards: [],
    decision: null,
    resolution: null,
  };
  startTrick(state);
  return state;
}

/** Carte che `player` può giocare adesso (vuoto se non è il suo turno o se prima deve scartare). */
export function legalCards(state: GameState, player: number): CardId[] {
  if (state.phase !== 'playing' || state.turn !== player) return [];
  const p = state.players[player]!;
  if (p.mustDiscard > 0) return [];
  const hand = p.hand;
  if (!state.leadFaction) return [...hand];
  const following = hand.filter((id) => getCard(id).faction === state.leadFaction);
  if (!following.length) return [...hand];
  // Vigil: se ha aperto la presa, chi segue deve giocare la sua carta più alta di quella fazione.
  if (leadPower(state.plays) === 'vigil') {
    const top = Math.max(...following.map((id) => getCard(id).value));
    return following.filter((id) => getCard(id).value === top);
  }
  return following;
}

/** Carte che `player` può scartare adesso per Oblivion (vuoto se non deve scartare). */
export function discardableNow(state: GameState, player: number): CardId[] {
  const p = state.players[player]!;
  if (state.phase !== 'playing' || state.turn !== player || p.mustDiscard <= 0) return [];
  return discardableCards(p.hand);
}

/**
 * Applica un'azione e restituisce il nuovo stato, senza modificare quello passato.
 * Lancia IllegalActionError se l'azione non è consentita: lo stesso controllo
 * servirà al server quando arriverà il multiplayer online.
 */
export function applyAction(state: GameState, action: Action): GameState {
  const s = structuredCopy(state);
  switch (action.type) {
    case 'play': {
      if (s.phase !== 'playing') throw new IllegalActionError('La presa non è in corso.');
      if (action.player !== s.turn) throw new IllegalActionError('Non è il turno di questo giocatore.');
      const p = s.players[action.player]!;
      if (!p.hand.includes(action.cardId)) throw new IllegalActionError('La carta non è nella mano del giocatore.');
      if (p.mustDiscard > 0) throw new IllegalActionError('Prima scarta una carta per Oblivion.');
      if (!legalCards(s, action.player).includes(action.cardId)) {
        throw new IllegalActionError(
          leadPower(s.plays) === 'vigil'
            ? 'Vigil ha aperto la presa: devi giocare la tua carta più alta della fazione d’apertura.'
            : 'Devi seguire la fazione d’apertura.',
        );
      }
      const option = action.option ?? 0;
      if (!isValidOption(playChoice(s, getCard(action.cardId)), option)) {
        throw new IllegalActionError('Questa scelta non è possibile per questa carta.');
      }
      playCard(s, action.player, action.cardId, option);
      advance(s);
      return s;
    }
    case 'discard': {
      if (!discardableNow(s, action.player).includes(action.cardId)) {
        throw new IllegalActionError('Adesso non puoi scartare questa carta.');
      }
      const p = s.players[action.player]!;
      p.mustDiscard--;
      // Lo scarto di Oblivion si annota nella presa che lo ha causato.
      discardByPower(s, action.player, action.cardId, s.history.at(-1)!.notes);
      settleDiscard(s);
      return s;
    }
    case 'decide': {
      const d = s.decision;
      if (!d) throw new IllegalActionError('Non c’è nessuna decisione da prendere.');
      if (action.player !== d.player) throw new IllegalActionError('Questa decisione spetta a un altro giocatore.');
      const r = s.resolution!;
      const trick = s.history.at(-1)!;
      const source = s.plays.find((pl): pl is CardPlay => isCardPlay(pl) && pl.cardId === d.cardId)!;
      if (d.kind === 'reversal') {
        if (action.accept) {
          s.players.forEach((p, i) => (p.score -= d.deltas[i]!));
          trick.contractDelta = 0;
          trick.cancelled = true;
        }
        trick.notes.push({ type: 'reversal', player: d.player, cardId: d.cardId, cancelled: action.accept });
      }
      if (d.kind === 'target') {
        if (action.target === undefined || !d.options.includes(action.target)) {
          throw new IllegalActionError('Scegli uno degli avversari indicati.');
        }
        applyTarget(s, r.shielded, trick.notes, source, d.power, action.target);
      }
      if (d.kind === 'recover' && action.accept) {
        const p = s.players[d.player]!;
        const take = action.take ?? d.take[0]!;
        if (!d.take.includes(take)) throw new IllegalActionError('Questa carta non si può recuperare.');
        if (!action.discard || !discardableCards(p.hand).includes(action.discard)) {
          throw new IllegalActionError('Scegli una carta della tua mano da scartare.');
        }
        discardByPower(s, d.player, action.discard, trick.notes);
        p.hand.push(take);
        r.recovered.push(take);
        if (d.power !== 'mnemos') p.used.push(d.power);
        trick.notes.push({ type: 'recovered', player: d.player, cardId: d.cardId, taken: take, discarded: action.discard });
      }
      s.decision = null;
      continueResolution(s);
      return s;
    }
    case 'nextTrick': {
      if (s.phase !== 'trickEnd') throw new IllegalActionError('La presa non è ancora conclusa.');
      if (s.decision || s.resolution) throw new IllegalActionError('Prima vanno prese le decisioni di questa presa.');
      if (s.trickNo >= s.tricksInHand) {
        s.phase = 'handEnd';
        // Chi ha saltato una presa (Nullchild) ha ancora carte in mano: a fine mano vengono scartate.
        s.players.forEach((p) => (p.hand = []));
        return s;
      }
      s.trickNo++;
      s.leader = s.history.at(-1)!.winner;
      startTrick(s);
      return s;
    }
  }
}

export function isFinished(state: GameState): boolean {
  return state.phase === 'handEnd';
}

/** Posti ordinati per punteggio decrescente (a parità, ordine di posto). */
export function ranking(state: { players: readonly { score: number }[] }): number[] {
  return state.players
    .map((p, i) => ({ score: p.score, i }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
}

function startTrick(s: GameState): void {
  s.plays = [];
  s.leadFaction = null;
  s.turn = s.leader;
  s.phase = 'playing';
  advance(s);
}

/** Salta chi deve saltare la presa e risolve la presa quando tutti hanno giocato. */
function advance(s: GameState): void {
  const n = s.players.length;
  while (s.plays.length < n && s.players[s.turn]!.skipNext) {
    s.players[s.turn]!.skipNext = false;
    s.plays.push({ player: s.turn, skipped: true });
    s.turn = (s.turn + 1) % n;
  }
  if (s.plays.length >= n) resolveTrick(s);
  else settleDiscard(s);
}

/** Chi deve scartare per Oblivion ma ha solo carte che non si scartano (Faded One) non scarta. */
function settleDiscard(s: GameState): void {
  const p = s.players[s.turn]!;
  if (s.phase === 'playing' && p.mustDiscard > 0 && !discardableCards(p.hand).length) p.mustDiscard = 0;
}

function playCard(s: GameState, player: number, cardId: CardId, option: number): void {
  const p = s.players[player]!;
  const card = getCard(cardId);
  const copied = card.power === 'palimpsest' ? copiedPower(s.plays) : undefined;
  const power = copied ?? card.power;
  const choice = playChoice(s, card);
  const final = valueOnPlay(s, player, card, power, option);
  // Fury e Ashen si pagano subito, con i punti Contratto della mano.
  const paid = choice?.kind === 'pay' ? option * choice.costPerTime : 0;
  p.score -= paid;
  const play: CardPlay = { player, skipped: false, cardId, final };
  if (copied) play.copied = copied;
  if (paid) play.paid = paid;
  if (p.protectNext) play.protected = true;
  if (choice?.kind === 'borrow' && option > 0) play.borrowed = option;
  if (power === 'second-sight') p.seen.push(...secondSight(s, player));
  p.nextModifier = 0;
  p.nextPenalty = 0;
  p.protectNext = false;
  p.hand = p.hand.filter((id) => id !== cardId);
  p.played.push(cardId);
  if (!s.leadFaction) s.leadFaction = card.faction;
  s.plays.push(play);
  s.turn = (s.turn + 1) % s.players.length;
}

/** Tutti hanno giocato: si scopre chi vince, poi la presa si chiude a tappe (vedi continueResolution). */
function resolveTrick(s: GameState): void {
  const notes: TrickNote[] = [];
  const before = s.players.map((p) => p.score);
  const shielded = shieldedPlayers(s.plays);
  applyRevealPowers(s.plays, notes);

  const active = s.plays.filter(isCardPlay);
  const eligible = active.filter((pl) => getCard(pl.cardId).faction === s.leadFaction);
  if (!eligible.length || !s.leadFaction) throw new Error('Presa senza carte della fazione d’apertura.');

  const max = Math.max(...eligible.map((pl) => pl.final));
  const tied = eligible.filter((pl) => pl.final === max);
  if (tied.length > 1) notes.push({ type: 'tieBreak' });
  // A parità di valore finale vince la carta con valore stampato più basso (regola del prototipo).
  const winning = tied.sort((a, b) => getCard(a.cardId).value - getCard(b.cardId).value)[0]!;

  for (const pl of active) {
    const p = s.players[pl.player]!;
    p.recentResults = [...p.recentResults.slice(-1), pl.player === winning.player];
  }

  const result: TrickResult = {
    trickNo: s.trickNo,
    leadFaction: s.leadFaction,
    plays: structuredCopy(s.plays),
    winner: winning.player,
    winningCardId: winning.cardId,
    winningValue: winning.final,
    contractDelta: 0,
    notes,
  };
  s.history.push(result);
  s.phase = 'trickEnd';
  // Decisione dell'autore: i recuperi si decidono prima di contare i punti.
  s.resolution = { stage: 'recover', before, shielded, recovered: [], queue: recoveryDecisions(s, winning.player, notes) };
  continueResolution(s);
}

/**
 * Porta avanti la chiusura della presa finché non serve una decisione:
 * recuperi → punti del Contratto e poteri dopo la presa (con i bersagli da scegliere) → Reversal.
 */
function continueResolution(s: GameState): void {
  const r = s.resolution;
  if (!r) return;
  const trick = s.history.at(-1)!;
  while (!s.decision) {
    const next = r.queue.shift();
    if (next) {
      s.decision = next;
      return;
    }
    if (r.stage === 'recover') {
      const captured = s.plays.filter(isCardPlay).map((pl) => pl.cardId).filter((id) => !r.recovered.includes(id));
      const winner = s.players[trick.winner]!;
      winner.tricks++;
      winner.captured.push(...captured);
      trick.contractDelta = contractDelta(s.config, s.trickNo, captured, s.tricksInHand);
      winner.score += trick.contractDelta;
      r.queue = applyAfterTrickPowers(s, trick, r.shielded, trick.notes);
      r.stage = 'effects';
      continue;
    }
    if (r.stage === 'effects') {
      r.stage = 'reversal';
      // Reversal: chi la cattura può annullare i punti nati da questa presa, se ce ne sono.
      // La protezione vale anche qui: non si tolgono i punti guadagnati da chi è protetto.
      const reversal = s.plays.find((pl): pl is CardPlay => isCardPlay(pl) && effectivePower(pl) === 'reversal');
      if (reversal && !r.recovered.includes(reversal.cardId)) {
        const deltas = s.players.map((p, i) => {
          const d = p.score - r.before[i]!;
          return d > 0 && i !== trick.winner && r.shielded.includes(i) ? 0 : d;
        });
        if (deltas.some((d) => d !== 0)) {
          r.queue.push({ kind: 'reversal', player: trick.winner, cardId: reversal.cardId, deltas });
        }
      }
      continue;
    }
    s.resolution = null;
    return;
  }
}

/** Copia profonda: lo stato è JSON puro, quindi può viaggiare anche in rete così com'è. */
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
