import { describe, expect, it } from 'vitest';
import { NAME_MAX, getSettings, parseSettings } from '../src/game/settings';

describe('impostazioni', () => {
  it('senza nulla di salvato usa i valori iniziali: suoni, vibrazione e presa automatica dopo 4 s', () => {
    const defaults = { sound: true, vibrate: true, autoNext: 4000, name: '' };
    expect(parseSettings({})).toEqual(defaults);
    for (const saved of [null, undefined, 'testo', 42, []]) expect(parseSettings(saved)).toEqual(defaults);
    // Senza localStorage (come qui) l'app parte comunque.
    expect(getSettings()).toEqual(defaults);
  });

  it('tiene le scelte salvate', () => {
    const saved = { sound: false, vibrate: false, autoNext: 2000, name: 'Albi' };
    expect(parseSettings(saved)).toEqual(saved);
    expect(parseSettings({ autoNext: 0 }).autoNext).toBe(0);
  });

  it('legge suoni e vibrazione salvati dalle versioni precedenti', () => {
    expect(parseSettings({ sound: false, vibrate: true })).toEqual({ sound: false, vibrate: true, autoNext: 4000, name: '' });
  });

  it('i valori strani tornano a quelli iniziali e il nome resta corto', () => {
    expect(parseSettings({ sound: 'no', vibrate: 1, autoNext: 3000, name: 7 })).toEqual({
      sound: true,
      vibrate: true,
      autoNext: 4000,
      name: '',
    });
    expect(parseSettings({ name: 'x'.repeat(50) }).name).toHaveLength(NAME_MAX);
  });
});
