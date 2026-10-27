import {
  CONTRACTS,
  CONTRACT_LIST,
  FACTIONS,
  FACTION_IDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  randomSeed,
  shuffle,
} from '@nexum/engine';
import type { ContractId, FactionId } from '@nexum/engine';
import type { CSSProperties } from 'react';
import type { GameMode, MatchSetup, Seat } from '../game/GameClient';

export interface SetupValues {
  mode: GameMode;
  playerCount: number;
  /** Nomi per il pass-and-play (sempre MAX_PLAYERS voci, si usano le prime playerCount). */
  names: string[];
  contract: ContractId;
  targetFaction: FactionId | null;
  factions: FactionId[];
}

const randomFactions = (n: number, keep: FactionId[] = []): FactionId[] => {
  const kept = keep.slice(0, n);
  const extra = shuffle(FACTION_IDS.filter((f) => !kept.includes(f)), Math.random).slice(0, n - kept.length);
  return FACTION_IDS.filter((f) => kept.includes(f) || extra.includes(f));
};

export function defaultSetup(): SetupValues {
  return {
    mode: 'solo',
    playerCount: 4,
    names: Array.from({ length: MAX_PLAYERS }, (_, i) => `Giocatore ${i + 1}`),
    contract: 'more',
    targetFaction: null,
    factions: randomFactions(4),
  };
}

/** Completa la selezione delle fazioni (come il prototipo) e costruisce la configurazione della partita. */
export function toMatchSetup(v: SetupValues): MatchSetup {
  const n = v.playerCount;
  const factions = v.factions.length === n ? v.factions : randomFactions(n, v.factions);
  const seats: Seat[] = Array.from({ length: n }, (_, i) =>
    v.mode === 'local'
      ? { name: v.names[i]?.trim() || `Giocatore ${i + 1}`, kind: 'human' }
      : { name: i === 0 ? 'Tu' : `Avversario ${i}`, kind: i === 0 ? 'human' : 'cpu' },
  );
  const needsTarget = CONTRACTS[v.contract].needsTarget;
  const targetFaction = needsTarget
    ? v.targetFaction && factions.includes(v.targetFaction)
      ? v.targetFaction
      : factions[0]
    : undefined;
  return { mode: v.mode, seats, factions, contract: v.contract, targetFaction, seed: randomSeed() };
}

interface Props {
  values: SetupValues;
  onChange(values: SetupValues): void;
  onStart(setup: MatchSetup): void;
  onBack(): void;
}

export function SetupScreen({ values: v, onChange, onStart, onBack }: Props) {
  const set = (patch: Partial<SetupValues>) => onChange({ ...v, ...patch });
  const n = v.playerCount;
  const contract = CONTRACTS[v.contract];
  const missing = (contract.requiresFactions ?? []).filter((f) => !v.factions.includes(f));

  const toggleFaction = (f: FactionId) => {
    if (v.factions.includes(f)) set({ factions: v.factions.filter((x) => x !== f) });
    else if (v.factions.length < n) set({ factions: FACTION_IDS.filter((x) => x === f || v.factions.includes(x)) });
  };

  return (
    <section className="panel setup">
      <button type="button" className="back" onClick={onBack}>
        ← Menu principale
      </button>
      <h2>{v.mode === 'solo' ? 'Partita contro la CPU' : 'Multiplayer sullo stesso dispositivo'}</h2>
      <p className="hint">
        {v.mode === 'solo'
          ? 'Tu controlli il primo posto; gli altri sono gestiti dalla CPU.'
          : 'Ci si passa il dispositivo: tra un turno e l’altro la mano viene coperta.'}
      </p>

      <div className="grid2">
        <label className="field">
          <span className="label">{v.mode === 'solo' ? 'Giocatori (te compreso)' : 'Giocatori'}</span>
          <select
            value={n}
            onChange={(e) => {
              const count = Number(e.target.value);
              set({ playerCount: count, factions: randomFactions(count, v.factions) });
            }}
          >
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>

      {v.mode === 'local' && (
        <div className="names">
          {Array.from({ length: n }, (_, i) => (
            <label key={i} className="field">
              <span className="label">Posto {i + 1}</span>
              <input
                value={v.names[i] ?? ''}
                maxLength={20}
                onChange={(e) => set({ names: v.names.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            </label>
          ))}
        </div>
      )}

      <h3 className="step">1. Scegli il Contratto</h3>
      <p className="hint">Il Contratto resta attivo per tutte le 13 prese.</p>
      <div className="contract-picker" role="radiogroup">
        {CONTRACT_LIST.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={v.contract === c.id}
            className={`contract-option${v.contract === c.id ? ' selected' : ''}`}
            onClick={() => set({ contract: c.id })}
          >
            <span className="contract-title">
              {c.icon} {c.name}
            </span>
            <span className="contract-desc">{c.desc}</span>
            <span className="contract-score">{c.score}</span>
          </button>
        ))}
      </div>

      {contract.needsTarget && (
        <label className="field target">
          <span className="label">Fazione da evitare</span>
          <select
            value={v.targetFaction && v.factions.includes(v.targetFaction) ? v.targetFaction : (v.factions[0] ?? '')}
            onChange={(e) => set({ targetFaction: e.target.value as FactionId })}
          >
            {v.factions.map((f) => (
              <option key={f} value={f}>
                {FACTIONS[f].name}
              </option>
            ))}
          </select>
        </label>
      )}

      <h3 className="step">2. Scegli le fazioni del mazzo</h3>
      <p className="hint">
        Servono tante fazioni quanti sono i giocatori. Le carte vengono mescolate tutte insieme e ridistribuite: nessuno
        “possiede” una fazione.
      </p>
      <div className="faction-picker">
        {FACTION_IDS.map((f) => {
          const selected = v.factions.includes(f);
          const full = !selected && v.factions.length >= n;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={selected}
              disabled={full}
              className={`faction-option${selected ? ' selected' : ''}`}
              style={{ '--faction': FACTIONS[f].color } as CSSProperties}
              onClick={() => toggleFaction(f)}
            >
              <b>
                <span className="dot" />
                {FACTIONS[f].name}
              </b>
              <span className="hint">{FACTIONS[f].tagline}</span>
            </button>
          );
        })}
      </div>
      <p className={`status${v.factions.length === n ? ' good' : ''}`}>
        {v.factions.length === n
          ? `${n}/${n} fazioni selezionate · mazzo di ${n * 13} carte, 13 a giocatore.`
          : `Servono ${n} fazioni, ora ${v.factions.length}. Avviando, le mancanti verranno scelte a caso.`}
      </p>
      {missing.length > 0 && (
        <p className="status warn">
          Attenzione: questo Contratto riguarda {missing.map((f) => FACTIONS[f].name).join(', ')}, che non è nel mazzo.
        </p>
      )}

      <div className="controls">
        <button type="button" className="btn" onClick={() => set({ factions: randomFactions(n) })}>
          Fazioni casuali
        </button>
        <button type="button" className="btn primary" onClick={() => onStart(toMatchSetup(v))}>
          Mescola e distribuisci
        </button>
      </div>
    </section>
  );
}
