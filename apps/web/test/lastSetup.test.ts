import { DEFAULT_CATALOG, MAX_PLAYERS, factionIds, getCatalog, setCatalog } from '@nexum/engine';
import type { Catalog } from '@nexum/engine';
import { afterEach, describe, expect, it } from 'vitest';
import type { SetupValues } from '../src/components/SetupScreen';
import { lastSetup, parseLastSetup, saveLastSetup } from '../src/game/lastSetup';

const chosen: SetupValues = {
  mode: 'local',
  playerCount: 3,
  names: ['Ana', 'Bea', 'Ciro', ...Array.from({ length: MAX_PLAYERS - 3 }, (_, i) => `Giocatore ${i + 4}`)],
  botNames: Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => `Avversario ${i + 1}`),
  format: 'chosenSeries',
  seriesLength: 3,
  seriesContracts: ['less', 'more', 'last'],
  singleContract: 'more',
  targetFaction: 'Nullarii',
  factions: ['Custodes', 'Nullarii', 'Dominari'],
  factionsPicked: true,
};

afterEach(() => setCatalog(DEFAULT_CATALOG));

describe('ultima preparazione', () => {
  it('senza nulla di salvato usa i valori iniziali, con fazioni a caso', () => {
    const v = parseLastSetup({});
    expect(v).toMatchObject({ mode: 'solo', playerCount: 4, format: 'randomSeries', seriesLength: 5, factionsPicked: false });
    expect(v.factions).toHaveLength(4);
    for (const saved of [null, undefined, 'testo', 42, []]) expect(parseLastSetup(saved).playerCount).toBe(4);
    // Senza localStorage (come qui) non c'è un'ultima preparazione finché non parte una partita.
    expect(lastSetup()).toBeNull();
  });

  it('tiene una preparazione ancora valida', () => {
    expect(parseLastSetup(JSON.parse(JSON.stringify(chosen)))).toEqual(chosen);
  });

  it('le fazioni non scelte a mano si ripescano a caso, quelle scelte restano', () => {
    const v = parseLastSetup({ ...chosen, factionsPicked: false });
    expect(v.factionsPicked).toBe(false);
    expect(v.factions).toHaveLength(3);
    expect(v.factions.every((f) => factionIds().includes(f))).toBe(true);
    expect(parseLastSetup(chosen).factions).toEqual(chosen.factions);
  });

  it('le parti strane tornano ai valori iniziali, il resto resta', () => {
    const v = parseLastSetup({ ...chosen, mode: 'online', playerCount: 99, format: 'boh', seriesLength: 7, names: ['Ana', 5], targetFaction: 'Sparita' });
    expect(v).toMatchObject({ mode: 'solo', playerCount: 4, format: 'randomSeries', seriesLength: 5, targetFaction: null });
    expect(v.names.slice(0, 3)).toEqual(['Ana', 'Giocatore 2', 'Giocatore 3']);
    expect(v.seriesContracts).toEqual(chosen.seriesContracts);
    expect(parseLastSetup({ ...chosen, names: ['x'.repeat(50)] }).names[0]).toHaveLength(20);
  });

  it('fazioni e Contratti che non esistono più si tolgono in silenzio', () => {
    const v = parseLastSetup({ ...chosen, factions: ['Sparita', 'Custodes'], seriesContracts: ['more', 'sparito', 'less'] });
    expect(v.factions).toEqual(['Custodes']);
    expect(v.factionsPicked).toBe(true);
    expect(v.seriesContracts).toEqual(['more', 'less']);
    expect(v.format).toBe('chosenSeries');

    // Nessuna fazione scelta rimasta: si pesca a caso.
    expect(parseLastSetup({ ...chosen, factions: ['Sparita'] })).toMatchObject({ factionsPicked: false, factions: expect.any(Array) });
    // Una serie a scelta rimasta con un solo Contratto, o un Contratto scelto sparito: formato iniziale.
    expect(parseLastSetup({ ...chosen, seriesContracts: ['more', 'sparito'] }).format).toBe('randomSeries');
    expect(parseLastSetup({ ...chosen, format: 'chosenSingle', singleContract: 'sparito' })).toMatchObject({
      format: 'randomSeries',
      singleContract: 'more',
    });
  });

  it('si ricontrolla con il catalogo attivo', () => {
    const single = { ...chosen, format: 'chosenSingle', singleContract: 'less' };
    expect(parseLastSetup(single).format).toBe('chosenSingle');
    const catalog = JSON.parse(JSON.stringify(getCatalog())) as Catalog;
    catalog.contracts = catalog.contracts.filter((c) => c.id !== 'less');
    catalog.version = 99;
    setCatalog(catalog);
    expect(parseLastSetup(single).format).toBe('randomSeries');
  });

  it('si ricorda dopo una partita sul dispositivo, non dopo una online', () => {
    saveLastSetup({ ...chosen, mode: 'online' });
    expect(lastSetup()).toBeNull();
    saveLastSetup(chosen);
    expect(lastSetup()).toEqual(chosen);
  });
});
