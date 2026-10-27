import type { ContractDef, ContractId } from '../types';

export const CONTRACT_IDS = [
  'more',
  'less',
  'avoidFaction',
  'avoidHigh',
  'avoidLow',
  'unmade',
  'last',
  'last3',
  'special',
  'chaos',
] as const;

const LIST: ContractDef[] = [
  {
    id: 'more',
    icon: '🏆',
    name: 'Più prese',
    desc: 'Cerca di vincere più prese possibile.',
    score: '+1 per ogni presa vinta',
  },
  {
    id: 'less',
    icon: '🪶',
    name: 'Meno prese',
    desc: 'Ogni presa vinta è una penalità. Liberati delle carte senza vincere.',
    score: '−1 per ogni presa vinta',
  },
  {
    id: 'avoidFaction',
    icon: '🎨',
    name: 'Non prendere una fazione',
    desc: 'Le carte della fazione bersaglio raccolte nelle tue prese valgono penalità.',
    score: '−1 per ogni carta bersaglio catturata',
    needsTarget: true,
  },
  {
    id: 'avoidHigh',
    icon: '⬆️',
    name: 'Non prendere carte alte',
    desc: 'Evita di catturare personaggi con valore stampato 80 o superiore.',
    score: '−1 per ogni carta 80+ catturata',
  },
  {
    id: 'avoidLow',
    icon: '⬇️',
    name: 'Non prendere carte basse',
    desc: 'Evita di catturare personaggi con valore stampato 20 o inferiore.',
    score: '−1 per ogni carta ≤20 catturata',
  },
  {
    id: 'unmade',
    icon: '☠️',
    name: 'Evita The Unmade',
    desc: 'La presa che contiene The Unmade è particolarmente pericolosa.',
    score: '−5 a chi cattura The Unmade',
    requiresFactions: ['Nullarii'],
  },
  {
    id: 'last',
    icon: '13️⃣',
    name: 'Non prendere l’ultima',
    desc: 'Le prime 12 prese sono neutre. Conta soltanto l’ultima.',
    score: '−5 a chi vince la 13ª presa',
  },
  {
    id: 'last3',
    icon: '3️⃣',
    name: 'Evita le ultime tre',
    desc: 'Le prese 11, 12 e 13 sono tutte penalità.',
    score: '−2 per ciascuna delle prese 11, 12 e 13',
  },
  {
    id: 'special',
    icon: '⚡',
    name: 'Non prendere carte con potere',
    desc: 'Ogni personaggio con un potere scritto catturato vale penalità.',
    score: '−1 per ogni carta con potere catturata',
  },
  {
    id: 'chaos',
    icon: '🔥',
    name: 'Tutto negativo',
    desc: 'Prese, Nullarii, carte alte e ultima presa accumulano penalità.',
    score: '−1 per presa · −1 per Nullarii · −1 per 80+ · −3 ultima presa',
  },
];

export const CONTRACTS: Record<ContractId, ContractDef> = Object.fromEntries(
  LIST.map((c) => [c.id, c]),
) as Record<ContractId, ContractDef>;

export const CONTRACT_LIST: readonly ContractDef[] = LIST;
