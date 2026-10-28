import { afterEach, describe, expect, it } from 'vitest';
import {
  CATALOG_UPDATES,
  DEFAULT_CATALOG,
  ORIGINAL_CATALOG,
  POWERS,
  applyCatalogUpdates,
  pendingCatalogUpdates,
  contractDelta,
  contractNeedsTarget,
  contractRequiredFactions,
  createGame,
  getCard,
  getContract,
  playableContracts,
  setCatalog,
  validateCatalog,
} from '../src';
import type { Catalog } from '../src';
import { config, createRng, play, playOut, withHands } from './helpers';

const copy = (): Catalog => JSON.parse(JSON.stringify(DEFAULT_CATALOG)) as Catalog;

const VALUES = [97, 89, 81, 73, 65, 57, 50, 42, 34, 26, 18, 10, 2];

function withNewFaction(): Catalog {
  const c = copy();
  c.version = 1;
  c.factions.push({ id: 'Ignis', name: 'Ignis', color: '#ff5500', tagline: 'Rosso fuoco' });
  VALUES.forEach((value, i) => c.cards.push({ id: `Ignis-${i}`, faction: 'Ignis', name: `Fiamma ${i}`, value, effect: '' }));
  return c;
}

afterEach(() => setCatalog(DEFAULT_CATALOG));

describe('catalogo modificabile', () => {
  it('una nuova fazione da 13 carte si può mettere nel mazzo', () => {
    setCatalog(withNewFaction());
    const end = playOut(
      createGame(config({ playerNames: ['A', 'B', 'C'], factions: ['Ignis', 'Custodes', 'Auguria'] })),
      createRng(1),
    );
    expect(end.players.flatMap((p) => p.captured).filter((id) => id.startsWith('Ignis'))).toHaveLength(13);
  });

  it('una carta rinominata conserva il suo potere', () => {
    const c = copy();
    c.cards.find((x) => x.id === 'Axiomata-2')!.name = 'Verità';
    setCatalog(c);
    const s = play(withHands([['Axiomata-2'], ['Axiomata-0']]), 'Axiomata-2');
    expect(getCard('Axiomata-2').name).toBe('Verità');
    expect((s.plays[0] as { final: number }).final).toBe(80);
  });

  it('un potere programmato si può dare a un’altra carta', () => {
    const c = copy();
    c.cards.find((x) => x.id === 'Auguria-0')!.power = 'veritas';
    setCatalog(c);
    const s = play(withHands([['Auguria-0'], ['Auguria-1']]), 'Auguria-0');
    expect((s.plays[0] as { final: number }).final).toBe(80);
  });

  it('un Contratto nuovo segue i suoi mattoncini', () => {
    const c = copy();
    c.contracts.push({
      id: 'ultimaCustodes',
      icon: '🛡️',
      name: 'Custodes alla fine',
      desc: 'Prova',
      rules: [
        { points: 2, per: 'trick', tricks: { from: 12, to: 13 } },
        { points: -3, per: 'card', filter: { kind: 'faction', faction: 'Custodes' } },
      ],
    });
    setCatalog(c);
    const cfg = config({ contract: 'ultimaCustodes' });
    const trick = ['Custodes-0', 'Custodes-1', 'Dominari-0', 'Nullarii-0'];
    expect(contractDelta(cfg, 5, trick)).toBe(-6);
    expect(contractDelta(cfg, 12, trick)).toBe(2 - 6);
    expect(contractRequiredFactions(getContract('ultimaCustodes'))).toEqual(['Custodes']);
    // senza Custodes resta comunque la regola sulle ultime prese
    expect(playableContracts(['Auguria', 'Dominari'])).toContain('ultimaCustodes');
    expect(playableContracts(['Auguria', 'Dominari'])).not.toContain('unmade');
  });

  it('riconosce i Contratti con fazione bersaglio e quelli legati a una fazione', () => {
    expect(contractNeedsTarget(getContract('avoidFaction'))).toBe(true);
    expect(contractNeedsTarget(getContract('more'))).toBe(false);
    expect(contractRequiredFactions(getContract('unmade'))).toEqual(['Nullarii']);
    expect(contractRequiredFactions(getContract('chaos'))).toEqual(['Nullarii']);
  });
});

describe('aggiornamenti delle carte', () => {
  it('ogni aggiornamento nomina carte che esistono e poteri programmati', () => {
    for (const update of CATALOG_UPDATES) {
      for (const [id, change] of Object.entries(update.cards)) {
        expect(ORIGINAL_CATALOG.cards.find((c) => c.id === id)?.name, `${update.id} · ${id}`).toBe(change.name);
        if (change.power) expect(POWERS).toHaveProperty(change.power);
      }
    }
  });

  it('il catalogo predefinito li ha già tutti, quello del v0.9 no', () => {
    expect(pendingCatalogUpdates(DEFAULT_CATALOG)).toEqual([]);
    expect(pendingCatalogUpdates(ORIGINAL_CATALOG)).toHaveLength(CATALOG_UPDATES.length);
  });

  it('applicati a un catalogo pubblicato cambiano solo testo e potere delle carte indicate', () => {
    const published = JSON.parse(JSON.stringify(ORIGINAL_CATALOG)) as Catalog;
    published.version = 1;
    published.cards.find((c) => c.id === 'Custodes-2')!.name = 'Vigile';
    const next = applyCatalogUpdates(published, CATALOG_UPDATES);
    const vigil = next.cards.find((c) => c.id === 'Custodes-2')!;
    expect([vigil.name, vigil.power, vigil.effect]).toEqual(['Vigile', 'vigil', 'Controllo.']);
    const foreseer = next.cards.find((c) => c.id === 'Custodes-4')!;
    expect([foreseer.effect, 'power' in foreseer]).toEqual(['', false]);
    expect(next.version).toBe(1);
    expect(pendingCatalogUpdates(next)).toEqual([]);
    expect(validateCatalog(next)).toEqual([]);
    expect(published.cards.find((c) => c.id === 'Custodes-2')!.power).toBeUndefined();
  });
});

describe('controlli del catalogo', () => {
  it('rifiuta un catalogo non valido e lascia attivo quello di prima', () => {
    const c = copy();
    c.cards = c.cards.filter((x) => x.id !== 'Custodes-0');
    expect(() => setCatalog(c)).toThrow(/12 carte invece di 13/);
    expect(getCard('Custodes-0').name).toBe('Meridian');
  });

  it('segnala i problemi in italiano', () => {
    const c = withNewFaction();
    c.cards.find((x) => x.id === 'Ignis-1')!.value = 97;
    c.cards.find((x) => x.id === 'Ignis-2')!.power = 'inventato';
    c.factions.find((f) => f.id === 'Ignis')!.color = 'rosso';
    c.contracts[0]!.rules = [];
    c.contracts[1]!.rules[0]!.points = 0;
    c.contracts.push({ ...c.contracts[2]!, rules: [{ points: -1, per: 'card', filter: { kind: 'card', cardId: 'X-9' } }] });
    const errors = validateCatalog(c);
    expect(errors).toEqual(
      expect.arrayContaining([
        'Nella fazione “Ignis” il valore 97 è usato due volte.',
        'La carta “Fiamma 2” ha un potere sconosciuto.',
        'La fazione “Ignis” ha un colore non valido.',
        'Il Contratto “Più prese” non ha regole di punteggio.',
        'Nel Contratto “Meno prese” i punti di una regola devono essere un intero tra −50 e 50, diverso da 0.',
        'Il codice di Contratto “avoidFaction” è usato due volte.',
        'Nel Contratto “Non prendere una fazione” una regola usa una carta che non esiste.',
      ]),
    );
  });

  it('servono almeno 8 fazioni', () => {
    const c = copy();
    c.cards = c.cards.filter((x) => x.faction !== 'Conflux');
    c.factions = c.factions.filter((f) => f.id !== 'Conflux');
    expect(validateCatalog(c)).toContain('Servono almeno 8 fazioni, perché si può giocare fino in 8.');
  });
});
