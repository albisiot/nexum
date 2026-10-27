import { CONTRACTS, CONTRACT_IDS } from './data/contracts';
import { FACTION_IDS, factionCards, getCard } from './data/factions';
import { applyAfterTrickPowers, applyRevealPowers, isCardPlay, valueOnPlay } from './powers';
import { createRng, shuffle } from './rng';
import { contractDelta } from './scoring';
import type { Action, CardId, GameConfig, GameState, PlayerState, TrickNote, TrickResult } from './types';

export const TRICKS_PER_HAND = 13;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export class IllegalActionError extends Error {
  override name = 'IllegalActionError';
}

/** Restituisce l'elenco dei problemi della configurazione (vuoto se è valida). */
export function validateConfig(config: GameConfig): string[] {
  const errors: string[] = [];
  const n = config.playerNames.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) errors.push(`Servono da ${MIN_PLAYERS} a ${MAX_PLAYERS} giocatori.`);
  if (config.factions.length !== n) errors.push(`Servono ${n} fazioni, ne sono state scelte ${config.factions.length}.`);
  if (new Set(config.factions).size !== config.factions.length) errors.push('Una fazione è stata scelta due volte.');
  for (const f of config.factions) {
    if (!(FACTION_IDS as readonly string[]).includes(f)) errors.push(`Fazione sconosciuta: ${f}.`);
  }
  if (!(CONTRACT_IDS as readonly string[]).includes(config.contract)) {
    errors.push(`Contratto sconosciuto: ${config.contract}.`);
  } else if (CONTRACTS[config.contract].needsTarget) {
    if (!config.targetFaction || !config.factions.includes(config.targetFaction)) {
      errors.push('Il Contratto richiede una fazione bersaglio presente nel mazzo.');
    }
  }
  return errors;
}

/** Ordina una mano per fazione (ordine canonico) e poi per valore decrescente. */
export function sortHand(hand: readonly CardId[]): CardId[] {
  return [...hand].sort((a, b) => {
    const ca = getCard(a);
    const cb = getCard(b);
    return FACTION_IDS.indexOf(ca.faction) - FACTION_IDS.indexOf(cb.faction) || cb.value - ca.value;
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
    recentResults: [],
    skipNext: false,
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
  };
  startTrick(state);
  return state;
}

/** Carte che `player` può giocare adesso (vuoto se non è il suo turno). */
export function legalCards(state: GameState, player: number): CardId[] {
  if (state.phase !== 'playing' || state.turn !== player) return [];
  const hand = state.players[player]!.hand;
  if (!state.leadFaction) return [...hand];
  const following = hand.filter((id) => getCard(id).faction === state.leadFaction);
  return following.length ? following : [...hand];
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
      if (!s.players[action.player]!.hand.includes(action.cardId)) {
        throw new IllegalActionError('La carta non è nella mano del giocatore.');
      }
      if (!legalCards(s, action.player).includes(action.cardId)) {
        throw new IllegalActionError('Devi seguire la fazione d’apertura.');
      }
      playCard(s, action.player, action.cardId);
      advance(s);
      return s;
    }
    case 'nextTrick': {
      if (s.phase !== 'trickEnd') throw new IllegalActionError('La presa non è ancora conclusa.');
      if (s.trickNo >= TRICKS_PER_HAND) {
        s.phase = 'handEnd';
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
}

function playCard(s: GameState, player: number, cardId: CardId): void {
  const p = s.players[player]!;
  const card = getCard(cardId);
  const final = valueOnPlay(s, player, card);
  p.nextModifier = 0;
  p.hand = p.hand.filter((id) => id !== cardId);
  p.played.push(cardId);
  if (!s.leadFaction) s.leadFaction = card.faction;
  s.plays.push({ player, skipped: false, cardId, final });
  s.turn = (s.turn + 1) % s.players.length;
}

function resolveTrick(s: GameState): void {
  const notes: TrickNote[] = [];
  applyRevealPowers(s.plays, notes);

  const active = s.plays.filter(isCardPlay);
  const eligible = active.filter((pl) => getCard(pl.cardId).faction === s.leadFaction);
  if (!eligible.length || !s.leadFaction) throw new Error('Presa senza carte della fazione d’apertura.');

  const max = Math.max(...eligible.map((pl) => pl.final));
  const tied = eligible.filter((pl) => pl.final === max);
  if (tied.length > 1) notes.push({ type: 'tieBreak' });
  // A parità di valore finale vince la carta con valore stampato più basso (regola del prototipo).
  const winning = tied.sort((a, b) => getCard(a.cardId).value - getCard(b.cardId).value)[0]!;

  const winner = s.players[winning.player]!;
  const captured = active.map((pl) => pl.cardId);
  winner.tricks++;
  winner.captured.push(...captured);
  const delta = contractDelta(s.config, s.trickNo, captured);
  winner.score += delta;

  for (const pl of active) {
    const p = s.players[pl.player]!;
    p.recentResults = [...p.recentResults.slice(-1), pl.player === winning.player];
  }

  applyAfterTrickPowers(s, winning, notes);

  const result: TrickResult = {
    trickNo: s.trickNo,
    leadFaction: s.leadFaction,
    plays: structuredCopy(s.plays),
    winner: winning.player,
    winningCardId: winning.cardId,
    winningValue: winning.final,
    contractDelta: delta,
    notes,
  };
  s.history.push(result);
  s.phase = 'trickEnd';
}

/** Copia profonda: lo stato è JSON puro, quindi può viaggiare anche in rete così com'è. */
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
