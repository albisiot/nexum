import type { CardDef, FactionDef, FactionId } from '../types';

/** Ordine canonico delle fazioni (usato anche per ordinare le mani). */
export const FACTION_IDS = [
  'Custodes',
  'Nullarii',
  'Auguria',
  'Reliquiae',
  'Dominari',
  'Concordia',
  'Axiomata',
  'Conflux',
] as const;

type RawCard = readonly [name: string, value: number, effect: string];

/** Carte trascritte dal simulatore v0.9 (reference/Nexum_Simulatore_v0_9.html). */
const RAW: Record<FactionId, { color: string; tagline: string; cards: readonly RawCard[] }> = {
  Custodes: {
    color: '#2f80ed',
    tagline: 'Blu · controllo e protezione',
    cards: [
      ['Meridian', 91, ''],
      ['Aegiron', 84, 'Se prende la presa, la tua prossima carta è protetta.'],
      ['Vigil', 76, 'Controllo.'],
      ['Caelia Vorn', 69, ''],
      ['Foreseer', 63, 'Predizione.'],
      ['Locke', 57, 'Se prende la presa, limita modifiche nella presa successiva.'],
      ['Sentry-7', 51, ''],
      ['Reversal', 44, 'Può annullare effetti di vittoria.'],
      ['Greyline', 37, ''],
      ['Second Sight', 29, 'Informazione futura.'],
      ['Anchor', 21, 'Blocca recuperi.'],
      ['The Witness', 12, 'Informazione se molto bassa.'],
      ['Origin', 3, 'Se prende la presa: +3 punti bonus Contratto.'],
    ],
  },
  Nullarii: {
    color: '#20242c',
    tagline: 'Nero · caos e sacrificio',
    cards: [
      ['The Unmade', 98, ''],
      ['Vesper Null', 88, 'Se prende la presa: -15 alla prossima carta di un avversario.'],
      ['Oblivion', 81, 'Se prende la presa, tutti scartano una carta non giocata.'],
      ['Maledict', 73, 'Se non prende la presa, il vincitore perde 1 punto Contratto.'],
      ['Black Echo', 65, 'La prima volta che perde può tornare in mano.'],
      ['Ruinborn', 58, ''],
      ['Nullchild', 49, 'Se prende la presa, un avversario salta la prossima.'],
      ['Gravemind', 41, 'Cresce con le carte già giocate.'],
      ['Hollow', 33, ''],
      ['Morrowshade', 25, 'Bonus se è la più bassa.'],
      ['Ashen', 17, 'Può aumentare pagando punti.'],
      ['Paradox', 9, 'Interagisce con valori identici.'],
      ['Zero', 1, 'Se prende la presa: +4 punti bonus Contratto.'],
    ],
  },
  Auguria: {
    color: '#d7b33d',
    tagline: 'Oro · predizione',
    cards: [
      ['Fortuna', 94, ''],
      ['Praevis', 86, ''],
      ['Sibyl', 78, 'Predizione.'],
      ['Decima', 70, 'Predizione sopra/sotto 50.'],
      ['Kairon', 62, ''],
      ['Lucent', 55, ''],
      ['Morrow', 47, ''],
      ['Threadseer', 39, ''],
      ['Auspice', 31, ''],
      ['Chanceborn', 23, ''],
      ['Tertia', 16, ''],
      ['Omen', 8, ''],
      ['Last Oracle', 2, ''],
    ],
  },
  Reliquiae: {
    color: '#8f5bd6',
    tagline: 'Viola · recupero e memoria',
    cards: [
      ['Relicta', 92, ''],
      ['Palimpsest', 84, 'Copia un effetto precedente.'],
      ['Echo Prime', 77, 'Può tornare in mano una volta.'],
      ['Mnemos', 69, 'Può recuperare una carta bassa.'],
      ['Violet Wraith', 61, ''],
      ['Archivist', 54, 'Può usare un valore dagli scarti.'],
      ['Afterimage', 46, 'Se la carta precedente era 70+, +20.'],
      ['Lost Saint', 38, ''],
      ['Remnant', 30, ''],
      ['Remainder', 22, ''],
      ['Unwritten', 15, 'Bonus se scartata da un effetto.'],
      ['Faded One', 9, 'Resiste agli scarti.'],
      ['Vestige', 4, ''],
    ],
  },
  Dominari: {
    color: '#d84a4a',
    tagline: 'Rosso · pressione e vittorie',
    cards: [
      ['Imperator', 99, ''],
      ['Vexor', 90, ''],
      ['Praetor', 82, 'Se prende la presa, la prossima carta +10.'],
      ['Ravager', 74, 'Se prende la presa, un avversario perde 1 punto Contratto.'],
      ['Crimson Crown', 66, ''],
      ['Duelist', 59, ''],
      ['Warhound', 51, ''],
      ['Usurper', 43, 'Bonus se batte carte molto alte.'],
      ['Bloodmark', 35, 'Se perde contro 75+, prossima carta +15.'],
      ['Challenger', 28, 'Se affronta un 70+, diventa 68.'],
      ['Fury', 20, 'Può aumentare pagando punti.'],
      ['Rebel', 12, 'Punisce un vincitore 80+.'],
      ['Ascendant', 4, 'Dopo due prese perse può diventare 74.'],
    ],
  },
  Concordia: {
    color: '#4da46a',
    tagline: 'Verde · equilibrio e rimonta',
    cards: [
      ['Equilibrium', 96, ''],
      ['Harmonia', 87, ''],
      ['Mediator', 79, ''],
      ['Balancer', 71, 'Se sei unico ultimo in classifica, +15.'],
      ['Concord', 63, ''],
      ['Bridge', 55, ''],
      ['Evenhand', 47, 'Se sei a pari merito ultimo, +15.'],
      ['Symmetra', 39, 'Se il range è 40+, diventa 69.'],
      ['Kin', 31, ''],
      ['Medius', 23, ''],
      ['Pax', 15, 'Protegge dalle perdite di punti carta.'],
      ['Equalis', 7, 'Se il range è ≤20, diventa 77.'],
      ['Union', 2, ''],
    ],
  },
  Axiomata: {
    color: '#e7e9ee',
    tagline: 'Bianco · regole e annullamenti',
    cards: [
      ['Lex Prime', 97, ''],
      ['Canon', 88, ''],
      ['Veritas', 80, 'Il valore resta sempre 80.'],
      ['Edict', 72, ''],
      ['Constant', 64, ''],
      ['Axiom', 55, 'Annulla gli altri effetti nella presa.'],
      ['Clause', 47, ''],
      ['Measure', 39, 'Limita i valori tra 10 e 90.'],
      ['Notary', 31, ''],
      ['Seal', 23, ''],
      ['Proof', 15, ''],
      ['Invariant', 8, 'Per il confronto vale sempre 50.'],
      ['Exception', 1, ''],
    ],
  },
  Conflux: {
    color: '#ee8b36',
    tagline: 'Arancio · trasformazione',
    cards: [
      ['Flux Regent', 97, ''],
      ['Mosaic', 89, ''],
      ['Janus', 83, 'Può valere 83 oppure 17.'],
      ['Shift', 75, 'Può applicare +15 o -15.'],
      ['Chimera', 67, ''],
      ['Crossfade', 59, ''],
      ['Switch', 51, 'Se ci sono un 80+ e un ≤20, diventa 91.'],
      ['Mirror Twin', 43, ''],
      ['Flicker', 35, ''],
      ['Metamorph', 27, 'Dipende dalla carta precedente.'],
      ['Split', 19, 'Può valere 19 oppure 79.'],
      ['Wildcard', 11, 'Diventa il valore avversario più basso +1.'],
      ['Convergence', 3, ''],
    ],
  },
};

export const FACTIONS: Record<FactionId, FactionDef> = Object.fromEntries(
  FACTION_IDS.map((id) => [id, { id, name: id, color: RAW[id].color, tagline: RAW[id].tagline }]),
) as Record<FactionId, FactionDef>;

/** Tutte le 104 carte, indicizzate per id (es. "Custodes-0"). */
export const CARDS: Readonly<Record<string, CardDef>> = Object.fromEntries(
  FACTION_IDS.flatMap((faction) =>
    RAW[faction].cards.map(([name, value, effect], i) => {
      const card: CardDef = { id: `${faction}-${i}`, faction, name, value, effect };
      return [card.id, card];
    }),
  ),
);

export function factionCards(faction: FactionId): CardDef[] {
  return RAW[faction].cards.map((_, i) => CARDS[`${faction}-${i}`]!);
}

export function getCard(id: string): CardDef {
  const card = CARDS[id];
  if (!card) throw new Error(`Carta sconosciuta: ${id}`);
  return card;
}

export function hasPowerText(card: CardDef): boolean {
  return card.effect.trim() !== '';
}
