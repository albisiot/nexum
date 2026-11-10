// Contratto Domino (dal King): niente prese. Si parte dalla carta centrale di ogni fazione, il 7 nei mazzi da 1 a 13
// e il 13 nelle mani lunghe da 25, e si attaccano le carte vicine della stessa fazione. Chi non può giocare passa.
// Chi finisce per primo chiude la mano: ogni carta rimasta in mano costa −1 a chi la tiene e quei punti vanno a chi ha finito.
import { factionDeck, getCard } from './catalog';
import { CARDS_PER_FACTION } from './constants';
import type { CardId, DominoState, FactionId, GameState } from './types';

/** La posizione della carta di partenza nella fazione, contando dalla più bassa: la centrale, (N + 1) / 2 con N carte. */
const startRank = (cardsPerFaction: number) => Math.floor(cardsPerFaction / 2);

/** Le carte di una fazione dalla più bassa alla più alta, in una mano da `cardsPerFaction` carte per fazione. */
export function dominoCards(faction: FactionId, cardsPerFaction: number = CARDS_PER_FACTION): CardId[] {
  return factionDeck(faction, cardsPerFaction)
    .sort((a, b) => a.value - b.value)
    .map((c) => c.id);
}

/** Le carte di una fazione già attaccate in tavola, dalla più bassa alla più alta. */
export function dominoPlaced(domino: DominoState, faction: FactionId): CardId[] {
  const line = domino.table[faction];
  return line ? dominoCards(faction, domino.cards).slice(line.low, line.high + 1) : [];
}

/** Il valore della carta con cui si apre ogni fazione: 7 nei mazzi da 1 a 13, 13 nelle mani da 25. */
export function dominoStartValue(faction: FactionId, cardsPerFaction: number = CARDS_PER_FACTION): number {
  return getCard(dominoCards(faction, cardsPerFaction)[startRank(cardsPerFaction)]!).value;
}

export function canPlaceDomino(domino: DominoState, cardId: CardId): boolean {
  const { faction } = getCard(cardId);
  const size = domino.cards ?? CARDS_PER_FACTION;
  const rank = dominoCards(faction, size).indexOf(cardId);
  const line = domino.table[faction];
  return line ? rank === line.low - 1 || rank === line.high + 1 : rank === startRank(size);
}

/** Il prossimo giocatore che può attaccare una carta: chi non può, passa. */
function nextPlayable(s: GameState, domino: DominoState, from: number): void {
  const n = s.players.length;
  domino.passed = [];
  for (let i = 0; i < n; i++) {
    const seat = (from + i) % n;
    if (s.players[seat]!.hand.some((id) => canPlaceDomino(domino, id))) {
      s.turn = seat;
      return;
    }
    domino.passed.push(seat);
  }
  throw new Error('Domino: nessuno può giocare.');
}

export function startDomino(s: GameState): void {
  s.domino = { table: {}, passed: [], winner: null };
  if (s.config.cardsPerFaction && s.config.cardsPerFaction !== CARDS_PER_FACTION) s.domino.cards = s.config.cardsPerFaction;
  nextPlayable(s, s.domino, s.leader);
}

export function playDomino(s: GameState, player: number, cardId: CardId): void {
  const domino = s.domino!;
  const p = s.players[player]!;
  const { faction } = getCard(cardId);
  const rank = dominoCards(faction, domino.cards).indexOf(cardId);
  const line = domino.table[faction];
  domino.table[faction] = line ? { low: Math.min(line.low, rank), high: Math.max(line.high, rank) } : { low: rank, high: rank };
  p.hand = p.hand.filter((id) => id !== cardId);
  p.played.push(cardId);

  if (p.hand.length) {
    nextPlayable(s, domino, (player + 1) % s.players.length);
    return;
  }
  domino.winner = player;
  domino.passed = [];
  for (const other of s.players) {
    other.score -= other.hand.length;
    p.score += other.hand.length;
    other.hand = [];
  }
  s.phase = 'handEnd';
}
