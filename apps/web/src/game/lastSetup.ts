// L'ultima preparazione con cui è partita una partita sul dispositivo (contro la CPU o multiplayer): la preparazione
// riparte da lì e dal menu si rigioca con un tocco. Sta in localStorage come le Impostazioni (settings.ts); senza
// (navigazione privata, spazio pieno) vale finché la pagina resta aperta.
import { CARDS_PER_FACTION, HAND_LENGTHS, MAX_PLAYERS, MIN_PLAYERS, factionIds } from '@nexum/engine';
import type { ContractId, FactionId } from '@nexum/engine';
import { useMemo, useSyncExternalStore } from 'react';
import {
  CONTRACT_FORMATS,
  SERIES_LENGTHS,
  allOfferedContracts,
  chosenContracts,
  defaultSetup,
  handSize,
  offeredContracts,
  randomFactions,
  sanitizeSetup,
} from '../components/SetupScreen';
import type { SetupValues } from '../components/SetupScreen';

const KEY = 'nexum-preparazione';
/** Come i campi dei nomi nella preparazione. */
const NAME_MAX = 20;

/**
 * Rilegge una preparazione salvata con il catalogo attivo. Ogni parte che non va più (un valore strano, una fazione
 * o un Contratto che non esiste più) torna in silenzio al valore iniziale; le fazioni non scelte si ripescano a caso.
 */
export function parseLastSetup(saved: unknown): SetupValues {
  const s = (saved !== null && typeof saved === 'object' ? saved : {}) as Partial<Record<keyof SetupValues, unknown>>;
  const initial = defaultSetup(s.mode === 'local' ? 'local' : 'solo');
  const count = s.playerCount;
  const playerCount = Number.isInteger(count) && Number(count) >= MIN_PLAYERS && Number(count) <= MAX_PLAYERS ? Number(count) : initial.playerCount;
  const names = (list: unknown, fallback: string[]) =>
    fallback.map((name, i) => {
      const entry: unknown = Array.isArray(list) ? list[i] : undefined;
      return typeof entry === 'string' ? entry.slice(0, NAME_MAX) : name;
    });

  // Le configurazioni di prima delle mani lunghe non hanno le carte per fazione: valgono 13.
  const cards = s.cardsPerFaction;
  const cardsPerFaction = (HAND_LENGTHS as readonly unknown[]).includes(cards) ? Number(cards) : CARDS_PER_FACTION;
  // I Contratti della serie a scelta possono essere di entrambe le sezioni (normali e mani lunghe).
  const offered: string[] = allOfferedContracts().map((c) => c.id);
  const inSection: string[] = offeredContracts(handSize({ playerCount, cardsPerFaction })).map((c) => c.id);
  const known: string[] = factionIds();
  const ids = <T extends string>(list: unknown, valid: string[]) =>
    Array.isArray(list) ? [...new Set(list.filter((x): x is T => typeof x === 'string' && valid.includes(x)))] : [];
  const seriesContracts = ids<ContractId>(s.seriesContracts, offered);
  const singleOk = typeof s.singleContract === 'string' && offered.includes(s.singleContract);
  let format = CONTRACT_FORMATS.find((f) => f === s.format) ?? initial.format;
  // Una serie a scelta rimasta con meno di 2 Contratti, o un Contratto scelto che non c'è più: formato iniziale.
  const seriesOk = chosenContracts({ ...initial, format: 'chosenSeries', playerCount, cardsPerFaction, seriesContracts }).length >= 2;
  const singleInSection = singleOk && inSection.includes(s.singleContract as string);
  if ((format === 'chosenSeries' && !seriesOk) || (format === 'chosenSingle' && !singleInSection)) format = initial.format;
  const picked = s.factionsPicked === true ? ids<FactionId>(s.factions, known).slice(0, playerCount) : [];

  return sanitizeSetup({
    ...initial,
    playerCount,
    names: names(s.names, initial.names),
    botNames: names(s.botNames, initial.botNames),
    format,
    seriesLength: SERIES_LENGTHS.find((l) => l.value === s.seriesLength)?.value ?? initial.seriesLength,
    seriesContracts,
    singleContract: singleOk ? (s.singleContract as ContractId) : initial.singleContract,
    trumpEach: typeof s.trumpEach === 'boolean' ? s.trumpEach : initial.trumpEach,
    targetFaction: typeof s.targetFaction === 'string' && known.includes(s.targetFaction) ? (s.targetFaction as FactionId) : null,
    factions: picked.length ? picked : randomFactions(playerCount),
    factionsPicked: picked.length > 0,
    cardsPerFaction,
  });
}

function load(): object | null {
  try {
    const saved = localStorage.getItem(KEY);
    const value: unknown = saved ? JSON.parse(saved) : null;
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// Si tiene quello che c'era scritto, non già controllato: il catalogo pubblicato arriva qualche istante dopo l'avvio,
// e una fazione o un Contratto creati nell'Editor esistono solo da lì in poi.
let saved = load();
const listeners = new Set<() => void>();

/** L'ultima preparazione, controllata con il catalogo attivo; null se non c'è ancora stata una partita. */
export function lastSetup(): SetupValues | null {
  return saved === null ? null : parseLastSetup(saved);
}

/** A ogni partita nuova sul dispositivo. Quelle online si preparano nella stanza e non si ricordano. */
export function saveLastSetup(values: SetupValues): void {
  if (values.mode === 'online') return;
  saved = { ...values };
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Senza localStorage la preparazione vale finché la pagina resta aperta.
  }
  listeners.forEach((l) => l());
}

/** Per il menu. `catalogVersion` è quella del catalogo attivo: quando ne arriva uno nuovo si ricontrolla. */
export function useLastSetup(catalogVersion: number): SetupValues | null {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => saved,
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (current === null ? null : parseLastSetup(current)), [current, catalogVersion]);
}
