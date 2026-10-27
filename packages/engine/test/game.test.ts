import { describe, expect, it } from 'vitest';
import {
  CARDS,
  FACTION_IDS,
  IMPLEMENTED_POWERS,
  IllegalActionError,
  applyAction,
  createGame,
  factionCards,
  getCard,
  getView,
  hasPowerText,
  ranking,
} from '../src';
import { config, createRng, playOut, randomConfig, withHands } from './helpers';

describe('carte', () => {
  it('8 fazioni da 13 carte con valori unici', () => {
    expect(Object.keys(CARDS)).toHaveLength(104);
    for (const f of FACTION_IDS) {
      const values = factionCards(f).map((c) => c.value);
      expect(new Set(values).size).toBe(13);
    }
  });

  it('51 carte hanno un potere scritto, 19 sono implementati', () => {
    const withText = Object.values(CARDS).filter(hasPowerText);
    expect(withText).toHaveLength(51);
    expect(IMPLEMENTED_POWERS.size).toBe(19);
    for (const name of IMPLEMENTED_POWERS) {
      expect(withText.some((c) => c.name === name), name).toBe(true);
    }
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
  it('500 mani complete con la CPU a ogni posto rispettano tutte le regole', () => {
    const rng = createRng(2026);
    for (let g = 0; g < 500; g++) {
      const cfg = randomConfig(rng);
      const end = playOut(createGame(cfg), rng);
      const n = cfg.playerNames.length;
      expect(end.history).toHaveLength(13);
      expect(end.players.every((p) => p.hand.length === 0 && p.played.length === 13)).toBe(true);
      const captured = end.players.flatMap((p) => p.captured);
      expect(new Set(captured).size).toBe(n * 13);
      expect(end.players.reduce((t, p) => t + p.tricks, 0)).toBe(13);
      for (const trick of end.history) {
        // il vincitore ha sempre giocato la fazione d'apertura
        const win = trick.plays.find((pl) => pl.player === trick.winner);
        expect(win && !win.skipped && getCard(win.cardId).faction).toBe(trick.leadFaction);
      }
      expect(ranking(end)).toHaveLength(n);
    }
  }, 30_000);
});
