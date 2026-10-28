import type { CardId, Catalog, PowerId } from '../types';

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
];

/** Applica gli aggiornamenti a una copia del catalogo; le carte che non esistono più vengono ignorate. */
export function applyCatalogUpdates(catalog: Catalog, updates: readonly CatalogUpdate[]): Catalog {
  const next = JSON.parse(JSON.stringify(catalog)) as Catalog;
  for (const update of updates) {
    for (const card of next.cards) {
      const change = update.cards[card.id];
      if (!change) continue;
      if (change.effect !== undefined) card.effect = change.effect;
      if (change.power === null) delete card.power;
      else if (change.power !== undefined) card.power = change.power;
    }
    next.appliedUpdates = [...new Set([...(next.appliedUpdates ?? []), update.id])];
  }
  return next;
}

/** Aggiornamenti non ancora applicati al catalogo. */
export function pendingCatalogUpdates(catalog: Catalog): CatalogUpdate[] {
  return CATALOG_UPDATES.filter((u) => !catalog.appliedUpdates?.includes(u.id));
}
