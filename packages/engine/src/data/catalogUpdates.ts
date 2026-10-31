import { CARDS_PER_FACTION } from '../constants';
import type { CardDef, CardId, Catalog, FactionDef, PowerId } from '../types';

/** Modifica di una carta: testo nuovo, potere assegnato, oppure `power: null` per togliere il potere. */
export interface CardUpdate {
  effect?: string;
  power?: PowerId | null;
}

/**
 * Un gruppo di modifiche alle carte deciso dall'autore. Il catalogo predefinito le contiene già;
 * nell'Editor si applicano alla bozza con un pulsante e poi si pubblicano.
 */
export interface CatalogUpdate {
  id: string;
  date: string;
  title: string;
  /** Spiegazione per l'autore, quando la modifica non riguarda singole carte. */
  note?: string;
  /** Tutte le carte dei mazzi passano ai pacchetti e ogni fazione riceve le carte da 1 a 13 senza effetti. */
  moveToPacks?: boolean;
  /** Per id di carta; il nome serve solo a chi legge. */
  cards: Record<CardId, CardUpdate & { name: string }>;
}

export const CATALOG_UPDATES: readonly CatalogUpdate[] = [
  {
    id: 'poteri-2026-10-28',
    date: '2026-10-28',
    title: 'Decisioni sui poteri dal file Excel (prima parte)',
    cards: {
      'Custodes-2': { name: 'Vigil', power: 'vigil' },
      'Custodes-4': { name: 'Foreseer', effect: '', power: null },
      'Custodes-5': { name: 'Locke', effect: '', power: null },
      'Custodes-7': { name: 'Reversal', effect: 'Può annullare effetti di presa.' },
      'Nullarii-4': {
        name: 'Black Echo',
        effect: "La prima volta che perde può tornare in mano, scartando un'altra carta non giocata a tua scelta.",
      },
      'Nullarii-6': { name: 'Nullchild', power: 'nullchild' },
      'Nullarii-7': { name: 'Gravemind', effect: 'Cresce di +3 con le tue carte già giocate.' },
      'Nullarii-9': { name: 'Morrowshade', power: 'morrowshade' },
      'Nullarii-11': { name: 'Paradox', power: 'paradox' },
      'Auguria-2': { name: 'Sibyl', effect: '', power: null },
      'Auguria-3': { name: 'Decima', effect: '', power: null },
      'Reliquiae-1': { name: 'Palimpsest', power: 'palimpsest' },
      'Dominari-7': { name: 'Usurper', effect: '', power: null },
      'Concordia-3': { name: 'Balancer', power: 'balancer' },
      'Concordia-6': { name: 'Evenhand', power: 'evenhand' },
      'Concordia-7': { name: 'Symmetra', power: 'symmetra' },
    },
  },
  {
    id: 'poteri-2026-10-28-b',
    date: '2026-10-28',
    title: 'Poteri con una scelta: Fury, Ashen e Reversal',
    cards: {
      'Custodes-7': { name: 'Reversal', power: 'reversal' },
      'Nullarii-10': { name: 'Ashen', power: 'ashen' },
      'Dominari-10': { name: 'Fury', power: 'fury' },
    },
  },
  {
    id: 'poteri-2026-10-28-c',
    date: '2026-10-28',
    title: 'Tutte le altre decisioni: protezione, scelte, scarti e recuperi, informazioni nascoste',
    cards: {
      'Custodes-1': { name: 'Aegiron', power: 'aegiron' },
      'Custodes-9': { name: 'Second Sight', power: 'second-sight' },
      'Custodes-10': { name: 'Anchor', power: 'anchor' },
      'Custodes-11': { name: 'The Witness', power: 'the-witness' },
      'Nullarii-2': { name: 'Oblivion', power: 'oblivion' },
      'Nullarii-4': { name: 'Black Echo', power: 'black-echo' },
      'Reliquiae-2': { name: 'Echo Prime', power: 'echo-prime' },
      'Reliquiae-3': { name: 'Mnemos', power: 'mnemos' },
      'Reliquiae-5': {
        name: 'Archivist',
        effect: 'Può usare il valore di una carta già giocata o scartata.',
        power: 'archivist',
      },
      'Reliquiae-10': { name: 'Unwritten', power: 'unwritten' },
      'Reliquiae-11': { name: 'Faded One', power: 'faded-one' },
      'Concordia-10': {
        name: 'Pax',
        effect: 'Nella presa in cui la giochi, i poteri avversari non possono toglierti punti.',
        power: 'pax',
      },
      'Conflux-2': { name: 'Janus', effect: '', power: null },
      'Conflux-3': { name: 'Shift', power: 'shift' },
      'Conflux-9': { name: 'Metamorph', power: 'metamorph' },
      'Conflux-10': { name: 'Split', effect: '', power: null },
    },
  },
  {
    id: 'mazzi-base-2026-10-31',
    date: '2026-10-31',
    title: 'Mazzi da 1 a 13 e carte per i pacchetti',
    note: 'Tutte le carte attuali escono dalle fazioni e vengono conservate come carte dei pacchetti, con nomi, testi e poteri. Ogni fazione riceve 13 carte nuove, da 1 a 13, senza effetti.',
    moveToPacks: true,
    cards: {},
  },
];

/** Le 13 carte di base di una fazione: valori da 1 a 13, senza effetti. */
function baseCards(faction: FactionDef): CardDef[] {
  return Array.from({ length: CARDS_PER_FACTION }, (_, i) => ({
    id: `${faction.id}-n${i + 1}`,
    faction: faction.id,
    name: `${faction.name} ${i + 1}`,
    value: i + 1,
    effect: '',
  }));
}

/** Applica gli aggiornamenti a una copia del catalogo; le carte che non esistono più vengono ignorate. */
export function applyCatalogUpdates(catalog: Catalog, updates: readonly CatalogUpdate[]): Catalog {
  const next = JSON.parse(JSON.stringify(catalog)) as Catalog;
  for (const update of updates) {
    for (const card of [...next.cards, ...(next.packCards ?? [])]) {
      const change = update.cards[card.id];
      if (!change) continue;
      if (change.effect !== undefined) card.effect = change.effect;
      if (change.power === null) delete card.power;
      else if (change.power !== undefined) card.power = change.power;
    }
    if (update.moveToPacks) {
      next.packCards = [...(next.packCards ?? []), ...next.cards];
      next.cards = next.factions.flatMap(baseCards);
    }
    next.appliedUpdates = [...new Set([...(next.appliedUpdates ?? []), update.id])];
  }
  return next;
}

/** Aggiornamenti non ancora applicati al catalogo. */
export function pendingCatalogUpdates(catalog: Catalog): CatalogUpdate[] {
  return CATALOG_UPDATES.filter((u) => !catalog.appliedUpdates?.includes(u.id));
}
