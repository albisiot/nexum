import type { ContractDef } from '@nexum/engine';
import type { ReactNode } from 'react';

/** Icone disegnate per NEXUM: griglia 24 × 24, tratto 1,75, nel colore del testo (currentColor). */
const PATHS = {
  // menu
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9.5 2.5v3.5M14.5 2.5v3.5M9.5 18v3.5M14.5 18v3.5M2.5 9.5h3.5M2.5 14.5h3.5M18 9.5h3.5M18 14.5h3.5" />
    </>
  ),
  multiplayer: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4" />
      <path d="M18 14c2 .9 3.5 3.2 3.5 6" />
    </>
  ),
  online: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </>
  ),
  novita: (
    <>
      <path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9Z" />
      <path d="M18 15.5v5M15.5 18h5" />
    </>
  ),
  'patch-notes': (
    <>
      <path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 12.5h7M8.5 16h5" />
    </>
  ),
  editor: (
    <>
      <path d="M4 20l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L8 19Z" />
      <path d="M13.5 7.5l3 3" />
      <path d="M13 20h7" />
    </>
  ),

  // Contratti: quelli "non prendere" partono tutti dalla stessa carta (13 × 18, raggio 2,5)
  'piu-prese': (
    <>
      <path d="M8 4h8v5.5a4 4 0 0 1-8 0Z" />
      <path d="M8 5.5H4.5v1a4 4 0 0 0 4 4" />
      <path d="M16 5.5h3.5v1a4 4 0 0 1-4 4" />
      <path d="M12 13.5V17" />
      <path d="M9.5 17h5l.8 3.5H8.7Z" />
    </>
  ),
  'meno-prese': (
    <>
      <path d="M19.5 4.5c-8 0-13.5 5.5-13.5 13.5 8 0 13.5-5.5 13.5-13.5Z" />
      <path d="M4 20 15 9" />
    </>
  ),
  fazione: (
    <>
      <rect x="5.5" y="3" width="13" height="18" rx="2.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'carte-alte': (
    <>
      <rect x="5.5" y="3" width="13" height="18" rx="2.5" />
      <path d="M12 16V8.5M9 11.5l3-3 3 3" />
    </>
  ),
  'carte-basse': (
    <>
      <rect x="5.5" y="3" width="13" height="18" rx="2.5" />
      <path d="M12 8v7.5M9 12.5l3 3 3-3" />
    </>
  ),
  'the-unmade': (
    <>
      <path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.6 3.5 5.8V20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.7c2.2-1.2 3.5-3.2 3.5-5.8A7.5 7.5 0 0 0 12 3Z" />
      <circle cx="9.3" cy="11" r="1.6" />
      <circle cx="14.7" cy="11" r="1.6" />
      <path d="M10.5 21v-2.5M13.5 21v-2.5" />
    </>
  ),
  ultima: (
    <>
      <path d="M6 21V3.5" />
      <path d="M6 4h11.5l-2.5 4 2.5 4H6" />
    </>
  ),
  'ultime-tre': (
    <>
      <path d="M7.5 16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v.5" />
      <path d="M11 18.5H9.5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2V8" />
      <rect x="11" y="8" width="9" height="13" rx="2" />
    </>
  ),
  'con-potere': (
    <>
      <rect x="5.5" y="3" width="13" height="18" rx="2.5" />
      <path d="M13 7.5 9.5 12.5h3L11 16.5l3.5-5h-3Z" />
    </>
  ),
  'tutto-negativo': (
    <>
      <path d="M12 21c-3.6 0-6.5-2.7-6.5-6.3 0-3.9 3-6 3.7-10.2 2 1.4 3.3 3.6 3.3 6 1-.6 1.8-1.7 2-3.2 1.9 1.8 3 4.3 3 7 0 4-2.9 6.7-5.5 6.7Z" />
      <path d="M12 21c-1.5 0-2.7-1.2-2.7-2.8 0-1.7 1.3-2.6 2.7-4.2 1.4 1.6 2.7 2.5 2.7 4.2 0 1.6-1.2 2.8-2.7 2.8Z" />
    </>
  ),

  // formati della serie: dado = casuale, spunta = a scelta; due elementi = serie, uno solo = un Contratto
  'serie-casuale': (
    <>
      <rect x="3" y="8" width="11" height="11" rx="2.5" />
      <path d="M10 8V5.5A2.5 2.5 0 0 1 12.5 3h6A2.5 2.5 0 0 1 21 5.5v6a2.5 2.5 0 0 1-2.5 2.5H14" />
      <g fill="currentColor" stroke="none">
        <circle cx="6" cy="11" r="1.1" />
        <circle cx="8.5" cy="13.5" r="1.1" />
        <circle cx="11" cy="16" r="1.1" />
        <circle cx="13.2" cy="6.2" r="1.1" />
        <circle cx="17.8" cy="10.8" r="1.1" />
      </g>
    </>
  ),
  'serie-scelta': (
    <>
      <path d="M10.5 6.5h10M10.5 12h10M10.5 17.5h10" />
      <path d="M3.5 6.5l1.5 1.5 3-3M3.5 12l1.5 1.5 3-3M3.5 17.5l1.5 1.5 3-3" />
    </>
  ),
  'singolo-casuale': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.5" cy="8.5" r="1.2" />
        <circle cx="15.5" cy="8.5" r="1.2" />
        <circle cx="12" cy="12" r="1.2" />
        <circle cx="8.5" cy="15.5" r="1.2" />
        <circle cx="15.5" cy="15.5" r="1.2" />
      </g>
    </>
  ),
  'singolo-scelta': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-5" />
    </>
  ),

  // simboli delle fazioni, in filigrana sulle carte
  scudo: (
    <>
      <path d="M12 3l7 2.8v5.7c0 4.6-3 8.1-7 9.5-4-1.4-7-4.9-7-9.5V5.8Z" />
      <path d="M12 7.5v9M8.5 11.5h7" />
    </>
  ),
  eclissi: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="14" cy="10" r="5" fill="currentColor" stroke="none" />
    </>
  ),
  volo: (
    <>
      <path d="M2.5 11.5c3-3 6.5-3 9.5 1 3-4 6.5-4 9.5-1" />
      <path d="M8 17.5c1.5-1.5 3.2-1.5 4.5.5 1.3-2 3-2 4.5-.5" />
    </>
  ),
  clessidra: (
    <>
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3v2.5c0 2.6 4 4 4 6.5s-4 3.9-4 6.5V21" />
      <path d="M16 3v2.5c0 2.6-4 4-4 6.5s4 3.9 4 6.5V21" />
      <path d="M10 19.5h4" />
    </>
  ),
  alloro: (
    <>
      <path d="M8.5 20C5 17.5 3.5 13.5 4.5 8.5" />
      <path d="M15.5 20c3.5-2.5 5-6.5 4-11.5" />
      <path d="M5 15.5 2.5 14.5M4.3 12 2 10.8M4.6 8.8 3.2 6.6M19 15.5l2.5-1M19.7 12l2.3-1.2M19.4 8.8l1.4-2.2" />
      <path d="M8.5 20 12 21.5l3.5-1.5" />
    </>
  ),
  bilancia: (
    <>
      <circle cx="12" cy="3.5" r="1" />
      <path d="M12 4.5v15.5M8 20.5h8M5 7h14" />
      <path d="M5 7 2.5 12.5M5 7l2.5 5.5M19 7l-2.5 5.5M19 7l2.5 5.5" />
      <path d="M2.5 12.5h5a2.5 2.5 0 0 1-5 0ZM16.5 12.5h5a2.5 2.5 0 0 1-5 0Z" />
    </>
  ),
  colonna: (
    <>
      <path d="M4.5 4h15M6 6.5h12M4.5 21h15M6 18.5h12M8.5 6.5v12M12 6.5v12M15.5 6.5v12" />
    </>
  ),
  farfalla: (
    <>
      <path d="M12 7.5v11" />
      <path d="M12 9.5C10.5 5.5 7 3.5 4.5 4.5S3 10 7.5 11.5C4 12.5 3.5 16 5.5 17.5s5-.5 6.5-3" />
      <path d="M12 9.5c1.5-4 5-6 7.5-5S21 10 16.5 11.5c3.5 1 4 4.5 2 6s-5-.5-6.5-3" />
      <path d="M12 7.5 10 4.5M12 7.5l2-3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Icone dei Contratti predefiniti, per id. I Contratti creati nell'Editor usano la loro emoji. */
const CONTRACT_ICONS: Partial<Record<string, IconName>> = {
  more: 'piu-prese',
  less: 'meno-prese',
  avoidFaction: 'fazione',
  avoidHigh: 'carte-alte',
  avoidLow: 'carte-basse',
  unmade: 'the-unmade',
  last: 'ultima',
  last3: 'ultime-tre',
  special: 'con-potere',
  chaos: 'tutto-negativo',
};

export const drawnContractIcon = (id: string): IconName | undefined => CONTRACT_ICONS[id];

/** Simboli delle fazioni predefinite, per id. Le fazioni create nell'Editor non ne hanno. */
const FACTION_SYMBOLS: Partial<Record<string, IconName>> = {
  Custodes: 'scudo',
  Nullarii: 'eclissi',
  Auguria: 'volo',
  Reliquiae: 'clessidra',
  Dominari: 'alloro',
  Concordia: 'bilancia',
  Axiomata: 'colonna',
  Conflux: 'farfalla',
};

export const factionSymbol = (id: string): IconName | undefined => FACTION_SYMBOLS[id];

export function ContractIcon({ contract, size }: { contract: ContractDef; size?: number }) {
  const name = drawnContractIcon(contract.id);
  if (name) return <Icon name={name} size={size} />;
  return (
    <span className="icon-emoji" aria-hidden="true">
      {contract.icon}
    </span>
  );
}
