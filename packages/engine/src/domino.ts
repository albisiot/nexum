// Contratto Domino (dal King): niente prese. Si parte dalla carta centrale di ogni fazione, il 7 nei mazzi da 1 a 13,
// e si attaccano le carte vicine della stessa fazione. Chi non può giocare passa. Chi finisce per primo chiude la mano:
// ogni carta rimasta in mano costa −1 a chi la tiene e quei punti vanno a chi ha finito.
import { factionCards, getCard } from './catalog';
import { CARDS_PER_FACTION } from './constants';
import type { CardId, DominoState, FactionId, GameState } from './types';

/** La posizione della carta di partenza nella fazione, contando dalla più bassa. */
const START_RANK = Math.floor(CARDS_PER_FACTION / 2);

/** Le carte di una fazione dalla più bassa alla più alta. */
export function dominoCards(faction: FactionId): CardId[] {
  return factionCards(faction)
    .sort((a, b) => a.value - b.value)
    .map((c) => c.id);
}

/** Le carte di una fazione già attaccate in tavola, dalla più bassa alla più alta. */
export function dominoPlaced(domino: DominoState, faction: FactionId): CardId[] {
  const line = domino.table[faction];
  return line ? dominoCards(faction).slice(line.low, line.high + 1) : [];
}

/** Il valore della carta con cui si apre ogni fazione: 7 nei mazzi da 1 a 13. */
export function dominoStartValue(faction: FactionId): number {
  return getCard(dominoCards(faction)[START_RANK]!).value;
}

export function canPlaceDomino(domino: DominoState, cardId: CardId): boolean {
  const { faction } = getCard(cardId);
  const rank = dominoCards(faction).indexOf(cardId);
  const line = domino.table[faction];
  return line ? rank === line.low - 1 || rank === line.high + 1 : rank === START_RANK;
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
  nextPlayable(s, s.domino, s.leader);
}

export function playDomino(s: GameState, player: number, cardId: CardId): void {
  const domino = s.domino!;
  const p = s.players[player]!;
  const { faction } = getCard(cardId);
  const rank = dominoCards(faction).indexOf(cardId);
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
