import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG,
  IllegalActionError,
  POWERS,
  applyAction,
  chooseCard,
  createGame,
  factionCards,
  factionIds,
  getCard,
  getView,
  hasPowerText,
  isPowerImplemented,
  ranking,
  setCatalog,
  validateCatalog,
} from '../src';
import type { Catalog } from '../src';
import { config, createRng, playOut, randomConfig, withHands } from './helpers';

describe('carte', () => {
  it('8 fazioni da 13 carte con valori unici', () => {
    expect(DEFAULT_CATALOG.cards).toHaveLength(104);
    expect(factionIds()).toHaveLength(8);
    for (const f of factionIds()) {
      const values = factionCards(f).map((c) => c.value);
      expect(new Set(values).size).toBe(13);
    }
  });

  it('tra le carte dei pacchetti 44 hanno un potere scritto e sono tutte implementate', () => {
    const pack = DEFAULT_CATALOG.packCards!;
    expect(pack).toHaveLength(104);
    const withText = pack.filter(hasPowerText);
    expect(withText).toHaveLength(44);
    const implemented = pack.filter(isPowerImplemented);
    expect(implemented).toHaveLength(44);
    expect(new Set(implemented.map((c) => c.power))).toEqual(new Set(Object.keys(POWERS)));
    expect(implemented.every(hasPowerText)).toBe(true);
  });

  it('il catalogo predefinito è valido', () => {
    expect(validateCatalog(DEFAULT_CATALOG)).toEqual([]);
  });
});

describe('preparazione', () => {
  it('distribuisce 13 carte diverse a testa usando solo le fazioni scelte', () => {
    const s = createGame(config());
    const all = s.players.flatMap((p) => p.hand);
    expect(s.players.every((p) => p.hand.length === 13)).toBe(true);
    expect(new Set(all).size).toBe(52);
    expect(all.every((id) => config().factions.includes(getCard(id).faction))).toBe(true);
  });

  it('stesso seme, stessa partita', () => {
    expect(createGame(config({ seed: 7 }))).toEqual(createGame(config({ seed: 7 })));
    expect(createGame(config({ seed: 7 }))).not.toEqual(createGame(config({ seed: 8 })));
  });

  it('rifiuta configurazioni non valide', () => {
    expect(() => createGame(config({ factions: ['Custodes', 'Nullarii'] }))).toThrow(/4 fazioni/);
    expect(() => createGame(config({ contract: 'avoidFaction', targetFaction: 'Auguria' }))).toThrow(/bersaglio/);
    expect(() => createGame(config({ playerNames: ['solo'], factions: ['Custodes'] }))).toThrow(/da 2 a 8/);
  });
});

describe('regole della presa', () => {
  it('bisogna seguire la fazione d’apertura se la si ha', () => {
    const s = withHands([['Dominari-0'], ['Dominari-12', 'Custodes-0']]);
    const after = applyAction(s, { type: 'play', player: 0, cardId: 'Dominari-0' });
    expect(() => applyAction(after, { type: 'play', player: 1, cardId: 'Custodes-0' })).toThrow(IllegalActionError);
  });

  it('senza la fazione d’apertura si gioca qualsiasi carta, ma vince solo la fazione d’apertura', () => {
    let s = withHands([['Dominari-12'], ['Custodes-0']]);
    s = applyAction(s, { type: 'play', player: 0, cardId: 'Dominari-12' }); // Ascendant 4
    s = applyAction(s, { type: 'play', player: 1, cardId: 'Custodes-0' }); // Meridian 91
    expect(s.phase).toBe('trickEnd');
    expect(s.history[0]!.winner).toBe(0);
  });

  it('rifiuta mosse fuori turno o con carte non possedute', () => {
    const s = withHands([['Dominari-0'], ['Dominari-1']]);
    expect(() => applyAction(s, { type: 'play', player: 1, cardId: 'Dominari-1' })).toThrow(/turno/);
    expect(() => applyAction(s, { type: 'play', player: 0, cardId: 'Dominari-1' })).toThrow(/mano/);
    expect(() => applyAction(s, { type: 'nextTrick' })).toThrow(/conclusa/);
  });

  it('chi vince apre la presa successiva', () => {
    let s = withHands([['Dominari-5', 'Dominari-6'], ['Dominari-0', 'Dominari-7']]);
    s = applyAction(s, { type: 'play', player: 0, cardId: 'Dominari-5' });
    s = applyAction(s, { type: 'play', player: 1, cardId: 'Dominari-0' });
    s = applyAction(s, { type: 'nextTrick' });
    expect(s.leader).toBe(1);
    expect(s.turn).toBe(1);
  });

  it('applyAction non modifica lo stato di partenza', () => {
    const s = createGame(config());
    const copy = JSON.parse(JSON.stringify(s));
    applyAction(s, { type: 'play', player: s.turn, cardId: s.players[s.turn]!.hand[0]! });
    expect(s).toEqual(copy);
  });
});

describe('vista del giocatore', () => {
  it('mostra solo la propria mano', () => {
    const s = createGame(config());
    const v = getView(s, 2);
    expect(v.hand).toEqual(s.players[2]!.hand);
    expect(JSON.stringify(v)).not.toContain(s.players[0]!.hand[0]!);
    expect(v.players[0]!.handCount).toBe(13);
    expect(getView(s, null).hand).toEqual([]);
  });

  it('le carte giocabili sono vuote se non è il tuo turno', () => {
    const s = createGame(config());
    const other = (s.turn + 1) % 4;
    expect(getView(s, other).legal).toEqual([]);
    expect(getView(s, s.turn).legal.length).toBeGreaterThan(0);
  });
});

describe('simulazione', () => {
  // Con i mazzi da 1 a 13 e con le carte dei pacchetti nei mazzi, così tutti i poteri restano provati.
  const decks: [string, Catalog][] = [
    ['i mazzi da 1 a 13', DEFAULT_CATALOG],
    ['le carte dei pacchetti', { ...DEFAULT_CATALOG, cards: DEFAULT_CATALOG.packCards!, packCards: DEFAULT_CATALOG.cards }],
  ];
  afterEach(() => setCatalog(DEFAULT_CATALOG));

  it('con i mazzi da 1 a 13 la CPU preferisce le carte alte quando vuole vincere', () => {
    const rng = createRng(5);
    const s = withHands([['Custodes-n1', 'Custodes-n13'], ['Custodes-n2']]);
    const count = (level: 'normal' | 'hard') =>
      Array.from({ length: 200 }, () => chooseCard(getView(s, 0), rng, level)).filter((id) => id === 'Custodes-n13').length;
    expect(count('hard')).toBeGreaterThan(190);
    expect(count('normal')).toBeGreaterThan(100); // la normale sbaglia di più, ma resta sulla strada giusta
  });

  it('100 mani complete con il Contratto sul numero esatto rispettano le regole', () => {
    const rng = createRng(9);
    for (let g = 0; g < 100; g++) {
      const end = playOut(createGame(randomConfig(rng, 'avoidNine')), rng);
      expect(end.players.every((p) => p.score <= 0)).toBe(true);
      // Ogni 9 catturato vale −1, e non c'è altro modo di perdere punti con questi mazzi.
      const nines = end.players.map((p) => p.captured.filter((id) => getCard(id).value === 9).length);
      expect(end.players.map((p) => Math.abs(p.score))).toEqual(nines);
    }
  });

  it.each(decks)('500 mani complete con la CPU a ogni posto rispettano tutte le regole, con %s', (_, catalog) => {
    setCatalog(catalog);
    const rng = createRng(2026);
    for (let g = 0; g < 500; g++) {
      const cfg = randomConfig(rng);
      const end = playOut(createGame(cfg), rng);
      const n = cfg.playerNames.length;
      // Oblivion accorcia la mano di una presa; non si scende mai sotto le prese già giocate.
      expect(end.history).toHaveLength(end.tricksInHand);
      expect(end.tricksInHand).toBeLessThanOrEqual(13);
      expect(end.players.reduce((t, p) => t + p.tricks, 0)).toBe(end.tricksInHand);
      // A fine mano non resta niente in mano (le carte avanzate si scartano).
      expect(end.players.every((p) => p.hand.length === 0 && p.mustDiscard >= 0)).toBe(true);
      // Ogni carta è catturata o scartata al massimo una volta, mai entrambe.
      const captured = end.players.flatMap((p) => p.captured);
      expect(new Set(captured).size).toBe(captured.length);
      expect(new Set(end.discards).size).toBe(end.discards.length);
      expect(captured.some((id) => end.discards.includes(id))).toBe(false);
      expect(captured.length + end.discards.length).toBeLessThanOrEqual(n * 13);
      expect(end.decision).toBeNull();
      expect(end.resolution).toBeNull();
      for (const trick of end.history) {
        // il vincitore ha sempre giocato la fazione d'apertura
        const win = trick.plays.find((pl) => pl.player === trick.winner);
        expect(win && !win.skipped && getCard(win.cardId).faction).toBe(trick.leadFaction);
      }
      expect(ranking(end)).toHaveLength(n);
    }
  }, 30_000);
});
