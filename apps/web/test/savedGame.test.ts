import { DEFAULT_CATALOG, applyMatchAction, botAction, createMatch, createRng, getCatalog, pendingSeat, setCatalog } from '@nexum/engine';
import type { Catalog, MatchAction, MatchState } from '@nexum/engine';
import { afterEach, describe, expect, it } from 'vitest';
import type { SetupValues } from '../src/components/SetupScreen';
import { matchConfig } from '../src/game/GameClient';
import type { MatchSetup } from '../src/game/GameClient';
import { SAVE_FORMAT, describeSave, encodeSave, parseSave, replaySave } from '../src/game/savedGame';

const setup: MatchSetup = {
  mode: 'solo',
  seats: [
    { name: 'Tu', kind: 'human' },
    { name: 'Avversario 1', kind: 'cpu', level: 'easy' },
    { name: 'Avversario 2', kind: 'cpu', level: 'normal' },
    { name: 'Avversario 3', kind: 'cpu', level: 'hard' },
  ],
  factions: ['Custodes', 'Nullarii', 'Dominari', 'Conflux'],
  hands: [{ contract: 'more' }, { contract: 'less' }, { contract: 'last' }],
  seed: 1234,
};
const values = { mode: 'solo', seriesLength: 3 } as SetupValues;

/** Fa avanzare la partita come farebbero la CPU e chi preme "Presa successiva", fino a `until`. */
function playUntil(until: (state: MatchState, moves: number) => boolean, from = setup) {
  const rng = createRng(7);
  let state = createMatch(matchConfig(from));
  const actions: MatchAction[] = [];
  while (!until(state, actions.length) && state.phase !== 'matchEnd') {
    const seat = pendingSeat(state);
    const action: MatchAction =
      seat !== null ? botAction(state, seat, rng) : state.phase === 'handEnd' ? { type: 'nextHand' } : { type: 'nextTrick' };
    state = applyMatchAction(state, action);
    actions.push(action);
  }
  return { state, actions };
}

const roundTrip = (state: MatchState, actions: MatchAction[], from = setup) => {
  const save = parseSave(encodeSave(from, values, actions, state));
  return save && replaySave(save);
};

afterEach(() => setCatalog(DEFAULT_CATALOG));

describe('partita salvata', () => {
  it('rigiocando le mosse torna esattamente allo stesso punto, mani comprese', () => {
    const { state, actions } = playUntil((_, moves) => moves === 30);
    expect(state.phase).toBe('playing');
    expect(roundTrip(state, actions)).toEqual(state);
  });

  it('conserva le scelte della preparazione', () => {
    const { state, actions } = playUntil((_, moves) => moves === 5);
    expect(parseSave(encodeSave(setup, values, actions, state))?.values).toEqual(values);
  });

  it('riprende dalla fine di un Contratto, con i punti della serie', () => {
    const { state, actions } = playUntil((s) => s.phase === 'handEnd');
    const restored = roundTrip(state, actions);
    expect(restored).toEqual(state);
    expect(restored?.completed).toHaveLength(1);
  });

  it('a fine serie non resta niente da riprendere', () => {
    const { state, actions } = playUntil(() => false);
    expect(state.phase).toBe('matchEnd');
    expect(roundTrip(state, actions)).toBeNull();
  });

  it('descrive il punto raggiunto per il menu', () => {
    const mid = playUntil((s) => s.game.trickNo === 7 && s.game.phase === 'playing');
    expect(describeSave({ save: parseSave(encodeSave(setup, values, mid.actions, mid.state))!, state: mid.state })).toBe(
      'Contro la CPU · Contratto 1 di 3 · Presa 7/13',
    );

    const end = playUntil((s) => s.phase === 'handEnd');
    expect(describeSave({ save: parseSave(encodeSave(setup, values, end.actions, end.state))!, state: end.state })).toBe(
      'Contro la CPU · Contratto 1 di 3 concluso',
    );

    const single: MatchSetup = { ...setup, mode: 'local', seats: setup.seats.map((s) => ({ name: s.name, kind: 'human' })), hands: [{ contract: 'more' }] };
    const one = playUntil(() => true, single);
    expect(describeSave({ save: parseSave(encodeSave(single, values, one.actions, one.state))!, state: one.state })).toBe(
      'Multiplayer · Più prese · Presa 1/13',
    );
  });

  it('scarta in silenzio i salvataggi illeggibili o di un altro formato', () => {
    const { state, actions } = playUntil((_, moves) => moves === 10);
    const good = JSON.parse(encodeSave(setup, values, actions, state)) as Record<string, unknown>;
    const variant = (change: Record<string, unknown>) => JSON.stringify({ ...good, ...change });

    for (const text of ['', '{', 'null', '42', '"testo"', '[]']) expect(parseSave(text)).toBeNull();
    expect(parseSave(variant({ format: SAVE_FORMAT + 1 }))).toBeNull();
    expect(parseSave(variant({ format: undefined }))).toBeNull();
    expect(parseSave(variant({ actions: 'nessuna' }))).toBeNull();
    expect(parseSave(variant({ values: null }))).toBeNull();
    expect(parseSave(variant({ setup: { ...setup, mode: 'online' } }))).toBeNull();
    expect(parseSave(variant({ setup: { ...setup, seats: [null, ...setup.seats.slice(1)] } }))).toBeNull();
    expect(parseSave(variant({ setup: { ...setup, seats: setup.seats.map((s) => ({ ...s, kind: 'human' })) } }))).toBeNull();
    expect(parseSave(variant({ setup: { ...setup, seats: setup.seats.map((s, i) => (i ? { ...s, level: 'fortissimo' } : s)) } }))).toBeNull();
    expect(parseSave(variant({}))).not.toBeNull();
  });

  it('scarta il salvataggio se rigiocando si arriva in un altro punto', () => {
    const { state, actions } = playUntil((_, moves) => moves === 20);
    const save = parseSave(encodeSave(setup, values, actions, state))!;
    expect(replaySave({ ...save, progress: { ...save.progress, totals: save.progress.totals.map((t) => t + 1) } })).toBeNull();
    expect(replaySave({ ...save, actions: [...save.actions, { type: 'nextHand' }] })).toBeNull();
    expect(replaySave({ ...save, actions: save.actions.slice(0, -1) })).toBeNull();
  });

  it('scarta il salvataggio se una fazione o una carta della partita non esiste più', () => {
    const { state, actions } = playUntil((_, moves) => moves === 20);
    const save = parseSave(encodeSave(setup, values, actions, state))!;
    expect(replaySave({ ...save, setup: { ...save.setup, factions: ['Custodes', 'Nullarii', 'Dominari', 'Sparita'] } })).toBeNull();

    // Una carta già giocata cambia codice nel catalogo pubblicato: le mosse salvate non si possono più rigiocare.
    const played = actions.find((a): a is Extract<MatchAction, { type: 'play' }> => a.type === 'play')!.cardId;
    const catalog = JSON.parse(JSON.stringify(getCatalog())) as Catalog;
    catalog.cards.find((c) => c.id === played)!.id = `${played}-nuova`;
    catalog.version = 99;
    setCatalog(catalog);
    expect(replaySave(save)).toBeNull();

    setCatalog(DEFAULT_CATALOG);
    expect(replaySave(save)).toEqual(state);
  });
});
