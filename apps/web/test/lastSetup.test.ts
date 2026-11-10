import { DEFAULT_CATALOG, MAX_PLAYERS, factionIds, getCatalog, getContract, setCatalog } from '@nexum/engine';
import type { Catalog } from '@nexum/engine';
import { afterEach, describe, expect, it } from 'vitest';
import { chosenContracts, describeSetup, handSize, toMatchSetup } from '../src/components/SetupScreen';
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
  trumpEach: false,
  targetFaction: 'Nullarii',
  factions: ['Custodes', 'Nullarii', 'Dominari'],
  factionsPicked: true,
  cardsPerFaction: 13,
};

afterEach(() => setCatalog(DEFAULT_CATALOG));

describe('ultima preparazione', () => {
  it('senza nulla di salvato usa i valori iniziali, con fazioni a caso', () => {
    const v = parseLastSetup({});
    expect(v).toMatchObject({ mode: 'solo', playerCount: 4, format: 'randomSeries', seriesLength: 5, trumpEach: true, factionsPicked: false });
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
    const v = parseLastSetup({ ...chosen, mode: 'online', playerCount: 99, format: 'boh', seriesLength: 7, names: ['Ana', 5], targetFaction: 'Sparita', trumpEach: 'sì' });
    expect(v).toMatchObject({ mode: 'solo', playerCount: 4, format: 'randomSeries', seriesLength: 5, targetFaction: null, trumpEach: true });
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

  it('le carte per fazione: le configurazioni vecchie valgono 13, quelle strane pure', () => {
    const { cardsPerFaction: _, ...old } = chosen;
    expect(parseLastSetup(old).cardsPerFaction).toBe(13);
    for (const cards of [14, 27, '21', null]) expect(parseLastSetup({ ...chosen, cardsPerFaction: cards }).cardsPerFaction).toBe(13);
  });

  it('le mani lunghe: la scelta resta anche sotto i 5 giocatori, ma si gioca con 13', () => {
    const long = { ...chosen, playerCount: 6, factionsPicked: false, cardsPerFaction: 21 };
    const v = parseLastSetup(long);
    expect(v.cardsPerFaction).toBe(21);
    expect(handSize(v)).toBe(21);
    expect(handSize({ ...v, playerCount: 4 })).toBe(13);
    // Con 21 carte la serie a scelta di Contratti normali non vale: formato iniziale.
    expect(v.format).toBe('randomSeries');
    const series = parseLastSetup({ ...long, format: 'chosenSeries', seriesContracts: ['more', 'longMore', 'longLast3', 'less'] });
    expect(series.format).toBe('chosenSeries');
    expect(series.seriesContracts).toEqual(['more', 'longMore', 'longLast3', 'less']);
    expect(chosenContracts(series)).toEqual(['longMore', 'longLast3']);
    expect(chosenContracts({ ...series, playerCount: 4 })).toEqual(['more', 'less']);
    expect(describeSetup(series)).toBe('Multiplayer · 6 giocatori · 21 carte · Serie a scelta di 2 Contratti');
  });

  it('Partita veloce e Rigioca l’ultima con le mani lunghe: la partita ha le carte scelte e solo Contratti per mani lunghe', () => {
    const v = parseLastSetup({ ...chosen, mode: 'solo', playerCount: 8, factionsPicked: false, format: 'randomSeries', seriesLength: 10, cardsPerFaction: 25 });
    const setup = toMatchSetup(v);
    expect(setup.cardsPerFaction).toBe(25);
    expect(setup.hands.every((h) => getContract(h.contract).long)).toBe(true);
    expect(toMatchSetup({ ...v, playerCount: 4, factions: [] }).cardsPerFaction).toBeUndefined();
    expect(toMatchSetup({ ...v, cardsPerFaction: 13 }).hands.some((h) => getContract(h.contract).long)).toBe(false);
  });

  it('si ricorda dopo una partita sul dispositivo, non dopo una online', () => {
    saveLastSetup({ ...chosen, mode: 'online' });
    expect(lastSetup()).toBeNull();
    saveLastSetup(chosen);
    expect(lastSetup()).toEqual(chosen);
  });
});
