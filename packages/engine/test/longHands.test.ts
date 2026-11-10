// Mani lunghe: da 5 giocatori in su ogni fazione può avere 15, 17, … 25 carte, e la mano altrettante prese.
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG,
  HAND_LENGTHS,
  LONG_HANDS_UPDATE,
  applyAction,
  applyMatchAction,
  botAction,
  contractDelta,
  contracts,
  createGame,
  createMatch,
  dominoCards,
  dominoStartValue,
  factionDeck,
  factionIds,
  getCard,
  getContract,
  getMatchView,
  getView,
  legalCards,
  pendingSeat,
  playableContracts,
  randomHands,
  ruleTricks,
  setCatalog,
  shuffle,
  validateCatalog,
  validateConfig,
} from '../src';
import type { CardId, Catalog, FactionId, GameConfig, GameState, MatchState } from '../src';
import { createRng, playOut } from './helpers';

const LONG = HAND_LENGTHS.filter((n) => n > 13);
const FACTIONS = factionIds();

/** Una mano lunga: `players` giocatori, le prime fazioni del catalogo. */
function longConfig(players: number, cards: number, overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    playerNames: Array.from({ length: players }, (_, i) => `P${i}`),
    factions: FACTIONS.slice(0, players),
    cardsPerFaction: cards,
    contract: 'longMore',
    seed: 7,
    ...overrides,
  };
}

const ids = (faction: FactionId, ...values: number[]) => values.map((v) => `${faction}-n${v}`);

afterEach(() => setCatalog(DEFAULT_CATALOG));

describe('mazzo e distribuzione', () => {
  it.each([
    [5, 15],
    [6, 21],
    [8, 25],
  ])('%i giocatori × %i carte: tutte distribuite, %i a testa', (players, cards) => {
    const s = createGame(longConfig(players, cards));
    expect(s.tricksInHand).toBe(cards);
    expect(s.players.every((p) => p.hand.length === cards)).toBe(true);
    const all = s.players.flatMap((p) => p.hand);
    expect(new Set(all).size).toBe(players * cards);
    for (const f of s.config.factions) {
      const values = all.map(getCard).filter((c) => c.faction === f).map((c) => c.value).sort((a, b) => a - b);
      expect(values).toEqual(Array.from({ length: cards }, (_, i) => i + 1));
    }
    expect(getView(s, 0).cardsPerFaction).toBe(cards);
    expect(getView(s, 0).tricksPerHand).toBe(cards);
  });

  it('le carte dal 14 in su seguono i nomi delle altre e non hanno poteri', () => {
    const deck = factionDeck('Axiomata', 25);
    expect(deck).toHaveLength(25);
    expect(deck.slice(0, 13)).toEqual(DEFAULT_CATALOG.cards.filter((c) => c.faction === 'Axiomata'));
    expect(getCard('Axiomata-n12').name).toBe('Axiomata 12');
    expect(getCard('Axiomata-n14')).toEqual({ id: 'Axiomata-n14', faction: 'Axiomata', name: 'Axiomata 14', value: 14, effect: '' });
    expect(deck.every((c) => c.effect === '' && c.power === undefined)).toBe(true);
    expect(factionDeck('Axiomata', 15).map((c) => c.value).at(-1)).toBe(15);
    // Non entrano nel catalogo: l'Editor continua a vedere 13 carte per fazione.
    expect(DEFAULT_CATALOG.cards.some((c) => c.id === 'Axiomata-n14')).toBe(false);
  });

  it('con 13 carte la mano non cambia: stessa distribuzione di prima', () => {
    const before = createGame({ playerNames: ['A', 'B', 'C', 'D', 'E'], factions: FACTIONS.slice(0, 5), contract: 'more', seed: 3 });
    const same = createGame({ ...before.config, cardsPerFaction: 13 });
    expect(same.players.map((p) => p.hand)).toEqual(before.players.map((p) => p.hand));
    expect(before.config.cardsPerFaction).toBeUndefined();
    expect(getView(before, 0).cardsPerFaction).toBe(13);
  });

  it('controlli: valori ammessi, da 5 giocatori, solo Contratti della sezione giusta', () => {
    expect(validateConfig(longConfig(5, 15))).toEqual([]);
    expect(validateConfig(longConfig(5, 14)).join(' ')).toMatch(/13, 15, 17/);
    expect(validateConfig(longConfig(5, 27)).join(' ')).toMatch(/13, 15, 17/);
    expect(validateConfig(longConfig(4, 15)).join(' ')).toMatch(/da 5 giocatori/);
    expect(validateConfig(longConfig(5, 15, { contract: 'more' })).join(' ')).toMatch(/solo i Contratti per mani lunghe/);
    expect(validateConfig(longConfig(5, 13, { contract: 'longMore' })).join(' ')).toMatch(/solo con più di 13/);
  });
});

describe('Contratti per mani lunghe', () => {
  it('ci sono 13 Contratti della sezione, e si propongono solo con le mani lunghe', () => {
    const long = contracts().filter((c) => c.long);
    expect(long.map((c) => c.id)).toEqual(LONG_HANDS_UPDATE.contracts!.map((c) => c.id));
    expect(long).toHaveLength(13);
    const five = FACTIONS.slice(0, 5);
    expect(playableContracts(five).some((id) => getContract(id).long)).toBe(false);
    expect(playableContracts(five, 21).every((id) => getContract(id).long)).toBe(true);
    expect(playableContracts(five, 21)).toHaveLength(13);
    const hands = randomHands(13, five, createRng(5), 25);
    expect(hands.every((h) => getContract(h.contract).long)).toBe(true);
    expect(hands.filter((h) => h.targetFaction)).toHaveLength(2);
  });

  it('arrivano anche con un catalogo pubblicato prima delle mani lunghe, senza ripubblicarlo', () => {
    const old: Catalog = {
      ...DEFAULT_CATALOG,
      version: 12,
      contracts: DEFAULT_CATALOG.contracts.filter((c) => !c.long),
      appliedUpdates: DEFAULT_CATALOG.appliedUpdates!.filter((id) => id !== LONG_HANDS_UPDATE.id),
    };
    expect(validateCatalog(old)).toEqual([]);
    setCatalog(old);
    expect(contracts().filter((c) => c.long)).toHaveLength(13);
    expect(createGame(longConfig(6, 21, { contract: 'longChaos' })).tricksInHand).toBe(21);

    // Se l'autore ha applicato l'aggiornamento, vale quello che ha pubblicato: anche togliere un Contratto.
    setCatalog({ ...DEFAULT_CATALOG, contracts: DEFAULT_CATALOG.contracts.filter((c) => c.id !== 'longChaos') });
    expect(contracts().some((c) => c.id === 'longChaos')).toBe(false);
    expect(contracts().filter((c) => c.long)).toHaveLength(12);
  });

  it('le più alte sono contate nel mazzo della mano: 23, 24 e 25 con 25 carte, 13, 14 e 15 con 15', () => {
    const at25 = longConfig(8, 25, { contract: 'longTopThree' });
    expect(contractDelta(at25, 3, ids('Custodes', 23, 24, 25, 22))).toBe(-3);
    expect(contractDelta(at25, 3, ids('Custodes', 13, 15, 22, 1))).toBe(0);
    const at15 = longConfig(5, 15, { contract: 'longTopThree' });
    expect(contractDelta(at15, 3, ids('Custodes', 13, 14, 15, 12))).toBe(-3);

    expect(contractDelta(longConfig(8, 25, { contract: 'longTop' }), 1, [...ids('Custodes', 25), ...ids('Nullarii', 25, 24)])).toBe(-6);
    expect(contractDelta(longConfig(5, 15, { contract: 'longTop' }), 1, ids('Custodes', 15, 14))).toBe(-3);

    const target = longConfig(6, 21, { contract: 'longTargetTop', targetFaction: 'Nullarii' });
    expect(contractDelta(target, 1, [...ids('Nullarii', 21), ...ids('Custodes', 21)])).toBe(-8);
    expect(contractDelta(target, 1, [...ids('Nullarii', 20), ...ids('Custodes', 21)])).toBe(0);
  });

  it('le regole sulle ultime prese seguono l’ultima presa vera, anche con Oblivion', () => {
    const trick = (cfg: GameConfig, n: number, last?: number) => contractDelta(cfg, n, ids('Custodes', 1), last);
    const last3 = longConfig(8, 25, { contract: 'longLast3' });
    expect([21, 22, 23, 24, 25].map((n) => trick(last3, n))).toEqual([0, 0, -2, -2, -2]);
    expect([20, 21, 22, 23, 24].map((n) => trick(last3, n, 24))).toEqual([0, 0, -2, -2, -2]);
    const last = longConfig(5, 15, { contract: 'longLast' });
    expect([13, 14, 15].map((n) => trick(last, n))).toEqual([0, 0, -5]);
    const chaos = longConfig(6, 21, { contract: 'longChaos' });
    expect([20, 21].map((n) => trick(chaos, n))).toEqual([-1, -4]);

    // Con 13 carte resta tutto com'era.
    const normal = { ...last3, playerNames: ['A', 'B', 'C', 'D'], factions: FACTIONS.slice(0, 4), cardsPerFaction: undefined, contract: 'last3' };
    expect([10, 11, 12, 13].map((n) => trick(normal, n))).toEqual([0, -2, -2, -2]);
    expect(ruleTricks({ points: 1, per: 'trick', tricks: { from: 1, to: 13 } }, 25)).toEqual({ from: 1, to: 25 });
    expect(ruleTricks({ points: 1, per: 'trick', tricks: { from: 2, to: 5 } }, 25)).toEqual({ from: 2, to: 5 });
  });

  it('una mano completa con le ultime tre: si pagano solo le prese 23, 24 e 25', () => {
    const end = playOut(createGame(longConfig(8, 25, { contract: 'longLast3' })), createRng(9));
    expect(end.history).toHaveLength(25);
    expect(end.history.map((t) => t.contractDelta)).toEqual([...Array<number>(22).fill(0), -2, -2, -2]);
  });
});

/**
 * Una mano dove P0 vince tutte le prese: ha le 3 carte più alte di ogni fazione, gli altri tutte le altre.
 * Si gioca sempre la prima carta giocabile.
 */
function sweep(contract: string, players = 5, cards = 15): GameState {
  const factions = FACTIONS.slice(0, players);
  const top = factions.flatMap((f) => ids(f, cards - 2, cards - 1, cards).slice(0, cards / players));
  const rest = shuffle(
    factions.flatMap((f) => factionDeck(f, cards).map((c) => c.id)).filter((id) => !top.includes(id)),
    createRng(1),
  );
  let s = createGame(longConfig(players, cards, { contract, targetFaction: factions[1] }));
  const hands: CardId[][] = [top, ...Array.from({ length: players - 1 }, (_, i) => rest.slice(i * cards, (i + 1) * cards))];
  s.players.forEach((p, i) => (p.hand = hands[i]!));
  s.leader = 0;
  s.turn = 0;
  while (s.phase !== 'handEnd') {
    if (s.phase === 'trickEnd') s = applyAction(s, { type: 'nextTrick' });
    else s = applyAction(s, { type: 'play', player: s.turn, cardId: getView(s, s.turn).legal[0]! });
  }
  return s;
}

describe('Cappotto nelle mani lunghe', () => {
  it('in Meno prese chi prende tutte e 15 le prese fa +15', () => {
    const s = sweep('longLess');
    expect(s.players[0]!.tricks).toBe(15);
    expect(s.slam).toBe(0);
    expect(s.players.map((p) => p.score)).toEqual([15, 0, 0, 0, 0]);
  });

  it('in Non prendere una fazione chi cattura tutte le carte del bersaglio fa +15', () => {
    const s = sweep('longAvoidFaction');
    expect(s.slam).toBe(0);
    expect(s.players.map((p) => p.score)).toEqual([15, 0, 0, 0, 0]);
  });
});

describe('Domino nelle mani lunghe', () => {
  it.each([
    [15, 8],
    [21, 11],
    [25, 13],
  ])('con %i carte si parte dalla carta centrale, il %i', (cards, start) => {
    expect(dominoStartValue('Custodes', cards)).toBe(start);
    expect(dominoCards('Custodes', cards)).toHaveLength(cards);
    const s = createGame(longConfig(cards === 15 ? 5 : 8, cards, { contract: 'longDomino' }));
    expect(s.domino!.cards).toBe(cards);
    const legal = legalCards(s, s.turn);
    expect(legal.length).toBeGreaterThan(0);
    expect(legal.every((id) => getCard(id).value === start)).toBe(true);
  });

  it('con 13 carte resta il 7', () => {
    expect(dominoStartValue('Custodes')).toBe(7);
    const s = createGame({ ...longConfig(5, 13, { contract: 'domino' }), cardsPerFaction: undefined });
    expect(s.domino!.cards).toBeUndefined();
  });
});

describe('simulazioni delle mani lunghe', () => {
  it.each(LONG_HANDS_UPDATE.contracts!.map((c) => c.id))('30 mani complete con la CPU: %s', (contract) => {
    const rng = createRng(31);
    for (let g = 0; g < 30; g++) {
      const players = 5 + Math.floor(rng() * 4);
      const cards = LONG[Math.floor(rng() * LONG.length)]!;
      const factions = shuffle(FACTIONS, rng).slice(0, players);
      const start = createGame(longConfig(players, cards, { contract, factions, targetFaction: factions[0], seed: Math.floor(rng() * 2 ** 32) }));
      const end = playOut(start, rng);
      expect(end.decision).toBeNull();
      if (getContract(contract).mode === 'domino') {
        expect(end.players.reduce((t, p) => t + p.score, 0)).toBe(0);
        expect(end.history).toEqual([]);
      } else {
        expect(end.history).toHaveLength(cards);
        expect(end.players.reduce((t, p) => t + p.tricks, 0)).toBe(cards);
        expect(end.players.reduce((t, p) => t + p.captured.length, 0)).toBe(players * cards);
      }
    }
  }, 60_000);

  it('una serie da 21 carte con 6 giocatori, tutta con la CPU', () => {
    const rng = createRng(4);
    const factions = FACTIONS.slice(2, 8);
    let s: MatchState = createMatch({
      playerNames: factions.map((_, i) => `P${i}`),
      factions,
      cardsPerFaction: 21,
      hands: randomHands(5, factions, rng, 21),
      seed: 99,
    });
    while (s.phase !== 'matchEnd') {
      if (s.phase === 'handEnd') {
        s = applyMatchAction(s, { type: 'nextHand' });
        continue;
      }
      const who = pendingSeat(s);
      s = applyMatchAction(s, who !== null ? botAction(s, who, rng) : { type: 'nextTrick' });
    }
    expect(s.completed).toHaveLength(5);
    for (const h of s.completed) {
      if (getContract(h.contract).mode !== 'domino') expect(h.tricks.reduce((a, b) => a + b, 0)).toBe(21);
    }
    expect(getMatchView(s, 0).game.cardsPerFaction).toBe(21);
  }, 30_000);
});
