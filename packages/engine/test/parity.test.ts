// Confronto mossa per mossa con il simulatore originale (reference/Nexum_Simulatore_v0_9.html).
// Garantisce che il porting non abbia cambiato le regole. Gira sulle carte del v0.9 (ORIGINAL_CATALOG):
// i poteri decisi dopo non esistono nel simulatore. L'unica regola cambiata di proposito su una carta
// del v0.9, il tetto di Gravemind, viene corretta anche nel simulatore prima del confronto.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CATALOG, ORIGINAL_CATALOG, applyAction, createGame, getCard, setCatalog } from '../src';
import type { CardPlay, GameState } from '../src';
import { createRng, randomConfig } from './helpers';

const REFERENCE = fileURLToPath(new URL('../../../reference/Nexum_Simulatore_v0_9.html', import.meta.url));

interface ProtoPlayer {
  hand: { id: string; used: boolean }[];
  score: number;
  tricks: number;
  nextBoost: number;
  nextPenalty: number;
}
interface ProtoApi {
  start(setup: object): void;
  setDeal(hands: string[][], leader: number): void;
  play(player: number, cardId: string): void;
  resolve(): void;
  next(): void;
  state(): {
    turn: number;
    plays: { pi: number; card: { id: string }; final: number }[];
    players: ProtoPlayer[];
    nextLeader: number;
    trickNo: number;
  };
}

/** Carica lo script originale in una sandbox con un DOM finto e ne espone le funzioni interne. */
function loadPrototype(): ProtoApi {
  const html = readFileSync(REFERENCE, 'utf8');
  const original = html.match(/<script>([\s\S]*?)<\/script>/)![1]!;
  // Gravemind: il tetto è passato da +15 a +36 (decisione dell'autore del 28/10/2026).
  const script = original.replace('final+=Math.min(15,used*3)', 'final+=Math.min(36,used*3)');
  if (script === original) throw new Error('Gravemind non trovato nel simulatore originale.');
  const el = (): object => ({
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    addEventListener() {},
    click() {},
  });
  const els: Record<string, object> = {};
  const context = vm.createContext({
    document: {
      getElementById: (id: string) => (els[id] ??= el()),
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: el,
    },
    window: {},
    console: { log() {}, error() {} },
    setTimeout: () => 0, // i timer della CPU originale non partono: le mosse le decide il test
    clearTimeout: () => {},
  });
  const expose = `
    globalThis.api = {
      start: (setup) => startGame(setup),
      setDeal: (hands, leader) => {
        const byId = Object.fromEntries(Object.keys(FACTIONS).flatMap(f => FACTIONS[f].map((c, i) => [f + '-' + i, buildCard(f, c, i)])));
        hands.forEach((h, p) => { state.players[p].hand = h.map(id => byId[id]); });
        state.leader = state.nextLeader = state.turn = leader;
      },
      play: (pi, id) => playCard(pi, state.players[pi].hand.find(c => c.id === id)),
      resolve: () => resolveTrick(),
      next: () => nextTrick(),
      state: () => state,
    };`;
  vm.runInContext(script + expose, context);
  return (context as unknown as { api: ProtoApi }).api;
}

describe('parità con il simulatore v0.9', () => {
  beforeAll(() => setCatalog(ORIGINAL_CATALOG));
  afterAll(() => setCatalog(DEFAULT_CATALOG));

  it('300 mani casuali danno gli stessi valori, vincitori e punteggi', () => {
    const proto = loadPrototype();
    const rng = createRng(909);

    for (let g = 0; g < 300; g++) {
      const cfg = randomConfig(rng);
      let s: GameState = createGame(cfg);
      proto.start({ mode: 'solo', n: cfg.playerNames.length, factions: cfg.factions, contract: cfg.contract, target: cfg.targetFaction });
      proto.setDeal(s.players.map((p) => p.hand), s.leader);

      while (s.phase !== 'handEnd') {
        if (s.phase === 'trickEnd') {
          s = applyAction(s, { type: 'nextTrick' });
          if (s.phase === 'playing') proto.next();
          continue;
        }
        const ps = proto.state();
        expect(ps.turn).toBe(s.turn);
        // mossa casuale tra quelle legali: copre più combinazioni di poteri della CPU
        const legal = s.players[s.turn]!.hand.filter((id) => {
          const lead = s.leadFaction;
          const hand = s.players[s.turn]!.hand;
          return !lead || getCard(id).faction === lead || !hand.some((h) => getCard(h).faction === lead);
        });
        const cardId = legal[Math.floor(rng() * legal.length)]!;
        const player = s.turn;
        s = applyAction(s, { type: 'play', player, cardId });
        proto.play(player, cardId);

        if (s.phase === 'trickEnd') {
          proto.resolve();
          const trick = s.history.at(-1)!;
          const after = proto.state();
          const where = `partita ${g}, presa ${trick.trickNo}, ${cfg.contract}`;
          expect(after.plays.map((pl) => [pl.card.id, pl.final]), where).toEqual(
            trick.plays.map((pl) => [(pl as CardPlay).cardId, (pl as CardPlay).final]),
          );
          expect(after.nextLeader, where).toBe(trick.winner);
          expect(after.players.map((p) => p.score), where).toEqual(s.players.map((p) => p.score));
          expect(after.players.map((p) => p.nextBoost + p.nextPenalty), where).toEqual(s.players.map((p) => p.nextModifier));
        } else {
          const last = proto.state().plays.at(-1)!;
          expect([last.card.id, last.final]).toEqual([cardId, (s.plays.at(-1) as CardPlay).final]);
        }
      }
    }
  }, 30_000);
});
