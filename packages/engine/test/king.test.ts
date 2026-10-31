// I Contratti presi dal King: punti, Cappotto, Limiti, Briscola e Domino.
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG,
  IllegalActionError,
  applyAction,
  canPlaceDomino,
  chooseDecision,
  contractDelta,
  createGame,
  dominoCards,
  dominoStartValue,
  getCard,
  getContract,
  getView,
  legalCards,
  setCatalog,
} from '../src';
import type { CardId, GameState } from '../src';
import { config, createRng, play, playOut, randomConfig, withHands } from './helpers';

const line = (faction: string, ...values: number[]) => values.map((v) => `${faction}-n${v}`);

describe('Contratti con le carte precise', () => {
  it.each([
    ['avoidElevenThirteen', ['Custodes-n11', 'Nullarii-n13', 'Dominari-n12', 'Conflux-n1'], -4],
    ['avoidTwelve', ['Custodes-n12', 'Nullarii-n12', 'Dominari-n11', 'Conflux-n1'], -6],
    ['avoidTargetThirteen', ['Nullarii-n13', 'Custodes-n13', 'Dominari-n1', 'Conflux-n1'], -8],
    ['avoidTargetThirteen', ['Custodes-n13', 'Dominari-n13', 'Dominari-n1', 'Conflux-n1'], 0],
    ['avoidTargetEight', ['Nullarii-n8', 'Custodes-n8', 'Dominari-n1', 'Conflux-n1'], -8],
    ['moreDouble', ['Custodes-n1', 'Nullarii-n1', 'Dominari-n1', 'Conflux-n1'], 2],
  ] as const)('%s con %j vale %i', (contract, cards, expected) => {
    expect(contractDelta(config({ contract, targetFaction: 'Nullarii' }), 5, cards)).toBe(expected);
  });

  it('Evita le ultime due conta solo le prese 12 e 13', () => {
    const cfg = config({ contract: 'last2' });
    const trick = ['Custodes-n1', 'Nullarii-n1', 'Dominari-n1', 'Conflux-n1'];
    expect([11, 12, 13].map((n) => contractDelta(cfg, n, trick))).toEqual([0, -4, -4]);
  });
});

/** Una mano di due giocatori dove il primo prende tutto: ha sempre la carta più alta della fazione. */
function sweep(contract: string): GameState {
  const a = line('Custodes', 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);
  const b = line('Nullarii', 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);
  let s = withHands([a, b], 0, { contract, factions: ['Custodes', 'Nullarii'], targetFaction: 'Nullarii' });
  while (s.phase !== 'handEnd') {
    if (s.phase === 'trickEnd') s = applyAction(s, { type: 'nextTrick' });
    else s = applyAction(s, { type: 'play', player: s.turn, cardId: getView(s, s.turn).legal[0]! });
  }
  return s;
}

describe('Cappotto', () => {
  it('in Meno prese chi prende tutte le prese fa +13 invece di −13', () => {
    const s = sweep('less');
    expect(s.slam).toBe(0);
    expect(s.players.map((p) => p.score)).toEqual([13, 0]);
  });

  it('in Non prendere una fazione chi cattura tutte le carte del bersaglio fa +13', () => {
    const s = sweep('avoidFaction');
    expect(s.slam).toBe(0);
    expect(s.players.map((p) => p.score)).toEqual([13, 0]);
  });

  it('senza cappotto restano le penalità', () => {
    const a = line('Custodes', 13, 1);
    const b = line('Custodes', 12, 2);
    let s = withHands([a, b], 0, { contract: 'less', factions: ['Custodes', 'Nullarii'] });
    s.tricksInHand = 2;
    s = play(s, 'Custodes-n13', 'Custodes-n12');
    s = applyAction(s, { type: 'nextTrick' });
    s = play(s, 'Custodes-n1', 'Custodes-n2');
    s = applyAction(s, { type: 'nextTrick' });
    expect(s.slam).toBeNull();
    expect(s.players.map((p) => p.score)).toEqual([-1, -1]);
  });

  it('i Contratti senza cappotto non lo assegnano', () => {
    expect(sweep('more').slam).toBeNull();
    expect(sweep('more').players.map((p) => p.score)).toEqual([13, 0]);
  });
});

describe('Limiti del King', () => {
  it('alla prima presa chi non può seguire non scarta carte che fanno penalità', () => {
    const s = play(withHands([['Custodes-n5'], ['Nullarii-n12', 'Nullarii-n3']], 0, { contract: 'avoidTwelve' }), 'Custodes-n5');
    expect(legalCards(s, 1)).toEqual(['Nullarii-n3']);
    expect(() => play(s, 'Nullarii-n12')).toThrow(/prima presa/);
  });

  it('se ha solo carte che fanno penalità può scartarle', () => {
    const s = play(withHands([['Custodes-n5'], ['Nullarii-n12']], 0, { contract: 'avoidTwelve' }), 'Custodes-n5');
    expect(legalCards(s, 1)).toEqual(['Nullarii-n12']);
  });

  it('dalla seconda presa il divieto non vale più', () => {
    const start = withHands([['Custodes-n5', 'Custodes-n6'], ['Custodes-n1', 'Nullarii-n12', 'Nullarii-n3']], 0, { contract: 'avoidTwelve' });
    const second = applyAction(play(start, 'Custodes-n5', 'Custodes-n1'), { type: 'nextTrick' });
    const s = play(second, 'Custodes-n6');
    expect(legalCards(s, 1)).toEqual(['Nullarii-n12', 'Nullarii-n3']);
  });

  it('non si apre con la fazione bersaglio finché non è uscita', () => {
    const hands = [['Nullarii-n5', 'Custodes-n5'], ['Custodes-n1', 'Nullarii-n1']];
    const s = withHands(hands, 0, { contract: 'avoidFaction', targetFaction: 'Nullarii', factions: ['Custodes', 'Nullarii'] });
    expect(legalCards(s, 0)).toEqual(['Custodes-n5']);
    expect(() => play(s, 'Nullarii-n5')).toThrow(IllegalActionError);
    s.players[1]!.played = ['Nullarii-n7'];
    expect(legalCards(s, 0)).toEqual(['Nullarii-n5', 'Custodes-n5']);
  });

  it('chi ha solo la fazione bersaglio può aprire', () => {
    const s = withHands([['Nullarii-n5'], ['Custodes-n1']], 0, { contract: 'avoidFaction', targetFaction: 'Nullarii', factions: ['Custodes', 'Nullarii'] });
    expect(legalCards(s, 0)).toEqual(['Nullarii-n5']);
  });

  it('i Contratti senza limiti non li applicano', () => {
    const s = play(withHands([['Custodes-n5'], ['Nullarii-n12', 'Nullarii-n3']]), 'Custodes-n5');
    expect(legalCards(s, 1)).toEqual(['Nullarii-n12', 'Nullarii-n3']);
    expect(getContract('more').limits).toBeUndefined();
  });
});

describe('Briscola', () => {
  /** Partita con la briscola già scelta dal primo di mano. */
  const trumpGame = (hands: CardId[][], faction = 'Nullarii') => {
    const s = withHands(hands, 0, { contract: 'trump', factions: ['Custodes', 'Nullarii'] });
    s.decision = { kind: 'trump', player: 0, options: ['Custodes', 'Nullarii'] };
    return applyAction(s, { type: 'decide', player: 0, accept: true, faction });
  };

  it('prima si sceglie la briscola: nessuno gioca finché non è scelta', () => {
    const s = createGame(config({ contract: 'trump' }));
    expect(s.decision).toEqual({ kind: 'trump', player: s.leader, options: config().factions });
    expect(legalCards(s, s.turn)).toEqual([]);
    const card = s.players[s.turn]!.hand[0]!;
    expect(() => applyAction(s, { type: 'play', player: s.turn, cardId: card })).toThrow(/decisione/);
    expect(() => applyAction(s, { type: 'decide', player: s.leader, accept: true, faction: 'Auguria' })).toThrow(/fazioni/);
    const chosen = applyAction(s, { type: 'decide', player: s.leader, accept: true, faction: 'Dominari' });
    expect([chosen.trump, chosen.decision]).toEqual(['Dominari', null]);
    expect(legalCards(chosen, chosen.turn).length).toBeGreaterThan(0);
  });

  it('la briscola più bassa batte la fazione d’apertura più alta', () => {
    const s = play(trumpGame([['Custodes-n13'], ['Nullarii-n1']]), 'Custodes-n13', 'Nullarii-n1');
    expect(s.history[0]!.winner).toBe(1);
    expect(s.players[1]!.score).toBe(1);
  });

  it('tra due briscole vince la più alta', () => {
    const s = play(trumpGame([['Nullarii-n3'], ['Nullarii-n9']]), 'Nullarii-n3', 'Nullarii-n9');
    expect(s.history[0]!.winner).toBe(1);
  });

  it('chi ha la fazione d’apertura deve seguirla anche se ha la briscola', () => {
    const s = play(trumpGame([['Custodes-n5'], ['Custodes-n1', 'Nullarii-n1']]), 'Custodes-n5');
    expect(legalCards(s, 1)).toEqual(['Custodes-n1']);
  });

  it('non si apre con la briscola finché qualcuno non l’ha giocata', () => {
    const s = trumpGame([['Nullarii-n5', 'Custodes-n5'], ['Custodes-n1', 'Nullarii-n1']]);
    expect(legalCards(s, 0)).toEqual(['Custodes-n5']);
    expect(legalCards(trumpGame([['Nullarii-n5'], ['Custodes-n1']]), 0)).toEqual(['Nullarii-n5']);
  });

  it('la CPU sceglie la fazione di cui ha più carte', () => {
    const s = withHands([[...line('Custodes', 1, 2), ...line('Nullarii', 1, 2, 3)], line('Custodes', 3)], 0, { contract: 'trump', factions: ['Custodes', 'Nullarii'] });
    s.decision = { kind: 'trump', player: 0, options: ['Custodes', 'Nullarii'] };
    expect(chooseDecision(getView(s, 0)).faction).toBe('Nullarii');
  });
});

describe('Domino', () => {
  afterEach(() => setCatalog(DEFAULT_CATALOG));

  const dominoGame = (hands: CardId[][], leader = 0) => {
    const factions = ['Custodes', 'Nullarii', 'Dominari'].slice(0, hands.length);
    const s = createGame(config({ contract: 'domino', playerNames: hands.map((_, i) => `P${i}`), factions }));
    s.players.forEach((p, i) => (p.hand = [...hands[i]!]));
    s.leader = leader;
    s.turn = leader;
    s.domino = { table: {}, passed: [], winner: null };
    return s;
  };

  it('si apre solo con un 7, poi si attaccano le carte vicine della stessa fazione', () => {
    let s = dominoGame([line('Custodes', 7, 9, 1), line('Custodes', 8, 6, 5)]);
    expect(legalCards(s, 0)).toEqual(['Custodes-n7']);
    expect(() => play(s, 'Custodes-n9')).toThrow(/attaccare/);
    s = play(s, 'Custodes-n7');
    expect(s.turn).toBe(1);
    expect(legalCards(s, 1)).toEqual(['Custodes-n8', 'Custodes-n6']);
    s = play(s, 'Custodes-n8');
    expect(legalCards(s, 0)).toEqual(['Custodes-n9']);
    expect(canPlaceDomino(s.domino!, 'Custodes-n6')).toBe(true);
    expect(canPlaceDomino(s.domino!, 'Custodes-n5')).toBe(false);
  });

  it('chi non può giocare passa da solo', () => {
    let s = dominoGame([line('Custodes', 7, 8), line('Nullarii', 1, 2), line('Custodes', 6, 5)]);
    s = play(s, 'Custodes-n7');
    expect(s.turn).toBe(2);
    expect(s.domino!.passed).toEqual([1]);
  });

  it('chi finisce per primo prende i punti delle carte rimaste agli altri', () => {
    let s = dominoGame([line('Custodes', 7), line('Nullarii', 1, 2), line('Custodes', 6, 5, 4)]);
    s = play(s, 'Custodes-n7');
    expect(s.phase).toBe('handEnd');
    expect(s.domino!.winner).toBe(0);
    expect(s.players.map((p) => p.score)).toEqual([5, -2, -3]);
    expect(s.players.every((p) => p.hand.length === 0)).toBe(true);
  });

  it('funziona anche con mazzi che non vanno da 1 a 13: si parte dalla carta centrale', () => {
    setCatalog({ ...DEFAULT_CATALOG, cards: DEFAULT_CATALOG.packCards!, packCards: DEFAULT_CATALOG.cards });
    const s = createGame(config({ contract: 'domino' }));
    const legal = legalCards(s, s.turn);
    expect(legal.length).toBeGreaterThan(0);
    for (const id of legal) expect(dominoCards(getCard(id).faction)[6]).toBe(id);
    expect(dominoStartValue('Custodes')).toBe(51);
    const end = playOut(s, createRng(3));
    expect(end.players.reduce((t, p) => t + p.score, 0)).toBe(0);
  });

  it('100 mani con la CPU: tutti rispettano le regole e i punti si annullano', () => {
    const rng = createRng(11);
    for (let g = 0; g < 100; g++) {
      const end = playOut(createGame(randomConfig(rng, 'domino')), rng);
      expect(end.domino!.winner).not.toBeNull();
      expect(end.players.reduce((t, p) => t + p.score, 0)).toBe(0);
      expect(end.players[end.domino!.winner!]!.score).toBeGreaterThanOrEqual(0);
      expect(end.history).toEqual([]);
    }
  });
});

describe('simulazioni con i Contratti nuovi', () => {
  it.each(['avoidElevenThirteen', 'avoidTwelve', 'avoidTargetThirteen', 'avoidTargetEight', 'last2', 'moreDouble', 'trump', 'avoidFaction', 'less'])(
    '150 mani complete con %s',
    (contract) => {
      const rng = createRng(77);
      for (let g = 0; g < 150; g++) {
        const end = playOut(createGame(randomConfig(rng, contract)), rng);
        expect(end.history).toHaveLength(13);
        expect(end.decision).toBeNull();
        if (contract === 'trump') {
          expect(end.trump).not.toBeNull();
          for (const trick of end.history) {
            const cards = trick.plays.flatMap((pl) => (pl.skipped ? [] : [getCard(pl.cardId)]));
            const winner = getCard(trick.winningCardId);
            if (cards.some((c) => c.faction === end.trump)) expect(winner.faction).toBe(end.trump);
            else expect(winner.faction).toBe(trick.leadFaction);
          }
        }
      }
    },
  );
});
