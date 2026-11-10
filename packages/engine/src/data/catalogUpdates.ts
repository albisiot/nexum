import { CARDS_PER_FACTION } from '../constants';
import type { CardDef, CardId, Catalog, ContractDef, FactionDef, PowerId } from '../types';

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
  /** Contratti da riscrivere (stesso id) o da aggiungere. */
  contracts?: ContractDef[];
  /** Regole da aggiungere a Contratti esistenti, per id, senza toccare nome, testo e punti. */
  contractFlags?: Record<string, Pick<ContractDef, 'slam' | 'limits'>>;
  /** Per id di carta; il nome serve solo a chi legge. */
  cards: Record<CardId, CardUpdate & { name: string }>;
}

/** I Contratti della sezione «Mani lunghe»: valgono con qualsiasi lunghezza, perché non nominano valori né prese precise. */
const LONG_CONTRACT_LIST: ContractDef[] = [
  {
    id: 'longMore',
    icon: '🏆',
    name: 'Più prese',
    desc: 'Cerca di vincere più prese possibile.',
    rules: [{ points: 1, per: 'trick' }],
  },
  {
    id: 'longLess',
    icon: '🪶',
    name: 'Meno prese',
    desc: 'Ogni presa vinta è una penalità. Liberati delle carte senza vincere.',
    slam: 13,
    rules: [{ points: -1, per: 'trick' }],
  },
  {
    id: 'longAvoidFaction',
    icon: '🎨',
    name: 'Non prendere una fazione',
    desc: 'Le carte della fazione bersaglio raccolte nelle tue prese valgono penalità.',
    slam: 13,
    limits: true,
    rules: [{ points: -1, per: 'card', filter: { kind: 'faction', faction: 'target' } }],
  },
  {
    id: 'longTopThree',
    icon: '⬆️',
    name: 'Non prendere le tre più alte',
    desc: 'Evita di catturare le 3 carte più alte di ogni fazione.',
    limits: true,
    rules: [{ points: -1, per: 'card', filter: { kind: 'top', count: 3 } }],
  },
  {
    id: 'longAvoidLow',
    icon: '⬇️',
    name: 'Non prendere 3 o meno',
    desc: 'Evita di catturare carte di valore 3 o meno.',
    limits: true,
    rules: [{ points: -1, per: 'card', filter: { kind: 'maxValue', value: 3 } }],
  },
  {
    id: 'longTop',
    icon: '👑',
    name: 'Non prendere la più alta',
    desc: 'Evita di catturare la carta più alta di ogni fazione.',
    limits: true,
    rules: [{ points: -3, per: 'card', filter: { kind: 'top', count: 1 } }],
  },
  {
    id: 'longTargetTop',
    icon: '🎯',
    name: 'Non prendere la più alta della fazione',
    desc: 'Evita di catturare la carta più alta della fazione bersaglio.',
    limits: true,
    rules: [{ points: -8, per: 'card', filter: { kind: 'targetTop', count: 1 } }],
  },
  {
    id: 'longLast',
    icon: '🏁',
    name: 'Non prendere l’ultima',
    desc: 'Le altre prese sono neutre. Conta soltanto l’ultima.',
    rules: [{ points: -5, per: 'trick', tricks: { from: 13, to: 13 } }],
  },
  {
    id: 'longLast3',
    icon: '3️⃣',
    name: 'Evita le ultime tre',
    desc: 'Le ultime 3 prese della mano sono tutte penalità.',
    rules: [{ points: -2, per: 'trick', tricks: { from: 11, to: 13 } }],
  },
  {
    id: 'longMoreDouble',
    icon: '🏆',
    name: 'Più prese doppie',
    desc: 'Vinci più prese che puoi: ognuna vale il doppio.',
    rules: [{ points: 2, per: 'trick' }],
  },
  {
    id: 'longTrump',
    icon: '⭐',
    name: 'Briscola',
    desc: 'Chi è primo di mano sceglie la briscola: batte la fazione d’apertura. Non si apre con la briscola finché qualcuno non l’ha giocata.',
    trump: true,
    rules: [{ points: 1, per: 'trick' }],
  },
  {
    id: 'longDomino',
    icon: '🀱',
    name: 'Domino',
    desc: 'Niente prese: si parte dalla carta centrale di ogni fazione e si attaccano le carte vicine della stessa fazione. Chi non può giocare passa. Chi finisce per primo chiude la mano.',
    mode: 'domino',
    rules: [],
  },
  {
    id: 'longChaos',
    icon: '🔥',
    name: 'Tutto negativo',
    desc: 'Prese, Nullarii, le 3 carte più alte di ogni fazione e l’ultima presa accumulano penalità.',
    rules: [
      { points: -1, per: 'trick' },
      { points: -1, per: 'card', filter: { kind: 'faction', faction: 'Nullarii' } },
      { points: -1, per: 'card', filter: { kind: 'top', count: 3 } },
      { points: -3, per: 'trick', tricks: { from: 13, to: 13 } },
    ],
  },
];
const LONG_CONTRACTS = LONG_CONTRACT_LIST.map((c): ContractDef => ({ ...c, long: true }));

/**
 * Le mani lunghe (da 15 a 25 carte per fazione, da 5 giocatori in su). Il gioco usa questi Contratti anche con un
 * catalogo pubblicato prima, finché l'autore non applica l'aggiornamento (vedi withLongContracts in catalog.ts).
 */
export const LONG_HANDS_UPDATE: CatalogUpdate = {
  id: 'mani-lunghe-2026-11-10',
  date: '2026-11-10',
  title: 'Contratti per mani lunghe',
  note: 'Tredici Contratti nella sezione «Mani lunghe»: con più di 13 carte per fazione (da 5 giocatori in su) si giocano solo questi, con 13 carte mai. «Le più alte» sono le carte in cima a ogni fazione (con 25 carte la più alta è il 25) e gli intervalli che arrivano alla presa 13 valgono per le ultime prese della mano. Il Cappotto cresce con le carte. Il gioco li usa già anche senza applicarli: applicali per modificarli.',
  contracts: LONG_CONTRACTS,
  cards: {},
};

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
  {
    id: 'contratti-numeri-2026-10-31',
    date: '2026-10-31',
    title: 'Contratti con i numeri',
    note: 'I Contratti dicono il numero invece di “alte” e “basse”: Non prendere 12 o più, Non prendere 3 o meno e Tutto negativo (12 o più). Nuovo Contratto: Non prendere i 9.',
    contracts: [
      {
        id: 'avoidHigh',
        icon: '⬆️',
        name: 'Non prendere 12 o più',
        desc: 'Evita di catturare carte di valore 12 o più.',
        rules: [{ points: -1, per: 'card', filter: { kind: 'minValue', value: 12 } }],
      },
      {
        id: 'avoidLow',
        icon: '⬇️',
        name: 'Non prendere 3 o meno',
        desc: 'Evita di catturare carte di valore 3 o meno.',
        rules: [{ points: -1, per: 'card', filter: { kind: 'maxValue', value: 3 } }],
      },
      {
        id: 'chaos',
        icon: '🔥',
        name: 'Tutto negativo',
        desc: 'Prese, Nullarii, carte di valore 12 o più e ultima presa accumulano penalità.',
        rules: [
          { points: -1, per: 'trick' },
          { points: -1, per: 'card', filter: { kind: 'faction', faction: 'Nullarii' } },
          { points: -1, per: 'card', filter: { kind: 'minValue', value: 12 } },
          { points: -3, per: 'trick', tricks: { from: 13, to: 13 } },
        ],
      },
      {
        id: 'avoidNine',
        icon: '9️⃣',
        name: 'Non prendere i 9',
        desc: 'Evita di catturare le carte di valore 9.',
        rules: [{ points: -1, per: 'card', filter: { kind: 'exactValue', value: 9 } }],
      },
    ],
    cards: {},
  },
  {
    id: 'contratti-king-2026-10-31',
    date: '2026-10-31',
    title: 'Contratti dal King',
    note: 'Otto Contratti nuovi: Non prendere 11 e 13, Non prendere i 12, Non prendere il 13 della fazione, Non prendere l’8 della fazione, Evita le ultime due, Più prese doppie, Briscola e Domino. Si aggiungono il Cappotto a Meno prese e a Non prendere una fazione, e i Limiti del King ai Contratti che penalizzano delle carte.',
    contractFlags: {
      less: { slam: 13 },
      avoidFaction: { slam: 13, limits: true },
      avoidHigh: { limits: true },
      avoidLow: { limits: true },
      avoidNine: { limits: true },
    },
    contracts: [
      {
        id: 'avoidElevenThirteen',
        icon: '👑',
        name: 'Non prendere 11 e 13',
        desc: 'Evita di catturare le carte di valore 11 e 13.',
        limits: true,
        rules: [
          { points: -2, per: 'card', filter: { kind: 'exactValue', value: 11 } },
          { points: -2, per: 'card', filter: { kind: 'exactValue', value: 13 } },
        ],
      },
      {
        id: 'avoidTwelve',
        icon: '🃏',
        name: 'Non prendere i 12',
        desc: 'Evita di catturare le carte di valore 12.',
        limits: true,
        rules: [{ points: -3, per: 'card', filter: { kind: 'exactValue', value: 12 } }],
      },
      {
        id: 'avoidTargetThirteen',
        icon: '🎯',
        name: 'Non prendere il 13 della fazione',
        desc: 'Evita di catturare il 13 della fazione bersaglio.',
        limits: true,
        rules: [{ points: -8, per: 'card', filter: { kind: 'targetValue', value: 13 } }],
      },
      {
        id: 'avoidTargetEight',
        icon: '🎯',
        name: 'Non prendere l’8 della fazione',
        desc: 'Evita di catturare l’8 della fazione bersaglio.',
        limits: true,
        rules: [{ points: -8, per: 'card', filter: { kind: 'targetValue', value: 8 } }],
      },
      {
        id: 'last2',
        icon: '2️⃣',
        name: 'Evita le ultime due',
        desc: 'Le prese 12 e 13 sono penalità.',
        rules: [{ points: -4, per: 'trick', tricks: { from: 12, to: 13 } }],
      },
      {
        id: 'moreDouble',
        icon: '🏆',
        name: 'Più prese doppie',
        desc: 'Vinci più prese che puoi: ognuna vale il doppio.',
        rules: [{ points: 2, per: 'trick' }],
      },
      {
        id: 'trump',
        icon: '⭐',
        name: 'Briscola',
        desc: 'Chi è primo di mano sceglie la briscola: batte la fazione d’apertura. Non si apre con la briscola finché qualcuno non l’ha giocata.',
        trump: true,
        rules: [{ points: 1, per: 'trick' }],
      },
      {
        id: 'domino',
        icon: '🀱',
        name: 'Domino',
        desc: 'Niente prese: si parte dai 7 e si attaccano le carte vicine della stessa fazione. Chi non può giocare passa. Chi finisce per primo chiude la mano.',
        mode: 'domino',
        rules: [],
      },
    ],
    cards: {},
  },
  LONG_HANDS_UPDATE,
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
    for (const contract of update.contracts ?? []) {
      const i = next.contracts.findIndex((k) => k.id === contract.id);
      if (i >= 0) next.contracts[i] = contract;
      else next.contracts.push(contract);
    }
    for (const [id, flags] of Object.entries(update.contractFlags ?? {})) {
      const contract = next.contracts.find((k) => k.id === id);
      if (contract) Object.assign(contract, flags);
    }
    next.appliedUpdates = [...new Set([...(next.appliedUpdates ?? []), update.id])];
  }
  return next;
}

/** Aggiornamenti non ancora applicati al catalogo. */
export function pendingCatalogUpdates(catalog: Catalog): CatalogUpdate[] {
  return CATALOG_UPDATES.filter((u) => !catalog.appliedUpdates?.includes(u.id));
}
