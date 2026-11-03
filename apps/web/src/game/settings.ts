// Le preferenze di chi gioca su questo dispositivo: suoni, vibrazione, presa successiva automatica e nome.
// Stanno in localStorage; senza (navigazione privata, spazio pieno) valgono i valori iniziali finché la pagina resta aperta.
import { useSyncExternalStore } from 'react';

/** Dopo quanti millisecondi, a fine presa, si passa da soli alla successiva: 0 = mai. */
export type AutoNext = 0 | 2000 | 4000;

export const AUTO_NEXT_CHOICES: { value: AutoNext; label: string }[] = [
  { value: 0, label: 'Spenta' },
  { value: 2000, label: 'Dopo 2 s' },
  { value: 4000, label: 'Dopo 4 s' },
];

export interface Settings {
  sound: boolean;
  vibrate: boolean;
  autoNext: AutoNext;
  /** Il nome al tavolo di chi gioca senza accesso; vuoto = "Tu". */
  name: string;
}

export const NAME_MAX = 20;

const KEY = 'nexum-settings';
/** Fino alla 0.40 suoni e vibrazione si salvavano da soli con questa chiave. */
const OLD_FEEDBACK_KEY = 'nexum-feedback';
const DEFAULTS: Settings = { sound: true, vibrate: true, autoNext: 4000, name: '' };

/** Tiene i valori riconosciuti; quelli mancanti o strani tornano al valore iniziale. */
export function parseSettings(saved: unknown): Settings {
  const s = (saved !== null && typeof saved === 'object' ? saved : {}) as Partial<Record<keyof Settings, unknown>>;
  const autoNext = AUTO_NEXT_CHOICES.find((c) => c.value === s.autoNext)?.value;
  return {
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULTS.sound,
    vibrate: typeof s.vibrate === 'boolean' ? s.vibrate : DEFAULTS.vibrate,
    autoNext: autoNext ?? DEFAULTS.autoNext,
    name: typeof s.name === 'string' ? s.name.slice(0, NAME_MAX) : DEFAULTS.name,
  };
}

function load(): Settings {
  try {
    const saved = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_FEEDBACK_KEY);
    return parseSettings(saved ? JSON.parse(saved) : {});
  } catch {
    return DEFAULTS;
  }
}

let settings = load();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return settings;
}

export function setSettings(change: Partial<Settings>): void {
  settings = { ...settings, ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Senza localStorage la scelta vale finché la pagina resta aperta.
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSettings,
  );
}
