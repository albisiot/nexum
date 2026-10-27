import { useState } from 'react';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  contractNeedsTarget,
  contractRequiredFactions,
  contracts,
  createRng,
  factionIds,
  getContract,
  getFaction,
  randomHands,
  randomSeed,
  shuffle,
} from '@nexum/engine';
import type { ContractId, FactionId, HandPlan } from '@nexum/engine';
import type { CSSProperties } from 'react';
import type { GameMode, MatchSetup, Seat } from '../game/GameClient';
import { describeScoring } from '../game/text';

export type ContractFormat = 'randomSeries' | 'chosenSeries' | 'randomSingle' | 'chosenSingle';

export interface SetupValues {
  mode: GameMode;
  playerCount: number;
  /** Nomi per il pass-and-play (sempre MAX_PLAYERS voci, si usano le prime playerCount). */
  names: string[];
  format: ContractFormat;
  /** Numero di Contratti della serie casuale (10 = tutti). */
  seriesLength: number;
  /** Contratti della serie a scelta, nell'ordine in cui verranno giocati. */
  seriesContracts: ContractId[];
  singleContract: ContractId;
  targetFaction: FactionId | null;
  factions: FactionId[];
}

const FORMATS: { id: ContractFormat; icon: string; title: string; desc: string }[] = [
  {
    id: 'randomSeries',
    icon: '🎲',
    title: 'Serie casuale',
    desc: 'Più Contratti estratti a caso, uno dopo l’altro. Vince chi ha più punti in totale.',
  },
  { id: 'chosenSeries', icon: '📋', title: 'Serie a scelta', desc: 'Scegli tu quali Contratti giocare e in che ordine.' },
  { id: 'randomSingle', icon: '🎯', title: 'Un Contratto casuale', desc: 'Una sola mano di 13 prese con un Contratto a sorpresa.' },
  { id: 'chosenSingle', icon: '✋', title: 'Un Contratto a scelta', desc: 'Una sola mano di 13 prese con il Contratto che preferisci.' },
];

const SERIES_LENGTHS = [
  { value: 3, label: '3 Contratti' },
  { value: 5, label: '5 Contratti' },
  { value: 10, label: 'Tutti' },
];

const STEPS = ['Giocatori', 'Contratti', 'Fazioni'];

const randomFactions = (n: number, keep: FactionId[] = []): FactionId[] => {
  const all = factionIds();
  const kept = keep.filter((f) => all.includes(f)).slice(0, n);
  const extra = shuffle(all.filter((f) => !kept.includes(f)), Math.random).slice(0, n - kept.length);
  return all.filter((f) => kept.includes(f) || extra.includes(f));
};

/** Toglie dalle scelte fazioni e Contratti che non esistono più nel catalogo (dopo una pubblicazione). */
export function sanitizeSetup(v: SetupValues): SetupValues {
  const knownFactions = factionIds();
  const knownContracts = contracts().map((c) => c.id);
  return {
    ...v,
    factions: v.factions.filter((f) => knownFactions.includes(f)),
    targetFaction: v.targetFaction && knownFactions.includes(v.targetFaction) ? v.targetFaction : null,
    seriesContracts: v.seriesContracts.filter((c) => knownContracts.includes(c)),
    singleContract: knownContracts.includes(v.singleContract) ? v.singleContract : knownContracts[0]!,
  };
}

export function defaultSetup(): SetupValues {
  return {
    mode: 'solo',
    playerCount: 4,
    names: Array.from({ length: MAX_PLAYERS }, (_, i) => `Giocatore ${i + 1}`),
    format: 'randomSeries',
    seriesLength: 5,
    seriesContracts: [],
    singleContract: 'more',
    targetFaction: null,
    factions: randomFactions(4),
  };
}

/** Contratti scelti a mano (vuoto per i formati casuali). */
function chosenContracts(v: SetupValues): ContractId[] {
  if (v.format === 'chosenSeries') return v.seriesContracts;
  if (v.format === 'chosenSingle') return [v.singleContract];
  return [];
}

export function describeFormat(v: SetupValues): string {
  switch (v.format) {
    case 'randomSeries':
      return v.seriesLength >= 10 ? 'Serie casuale con tutti i Contratti' : `Serie casuale di ${v.seriesLength} Contratti`;
    case 'chosenSeries':
      return `Serie a scelta di ${v.seriesContracts.length} Contratti`;
    case 'randomSingle':
      return 'Un Contratto casuale';
    case 'chosenSingle':
      return `Un Contratto: ${getContract(v.singleContract).name}`;
  }
}

/** Completa la selezione delle fazioni, estrae i Contratti casuali e costruisce la partita. */
export function toMatchSetup(v: SetupValues): MatchSetup {
  const n = v.playerCount;
  const seed = randomSeed();
  const rng = createRng(seed ^ 0x5bd1e995);
  const factions = v.factions.length === n ? v.factions : randomFactions(n, v.factions);
  const seats: Seat[] = Array.from({ length: n }, (_, i) =>
    v.mode === 'local'
      ? { name: v.names[i]?.trim() || `Giocatore ${i + 1}`, kind: 'human' }
      : { name: i === 0 ? 'Tu' : `Avversario ${i}`, kind: i === 0 ? 'human' : 'cpu' },
  );
  const plan = (contract: ContractId): HandPlan => {
    if (!contractNeedsTarget(getContract(contract))) return { contract };
    const chosen = v.targetFaction && factions.includes(v.targetFaction) ? v.targetFaction : null;
    return { contract, targetFaction: chosen ?? factions[Math.floor(rng() * factions.length)]! };
  };
  const hands =
    v.format === 'randomSeries'
      ? randomHands(v.seriesLength, factions, rng)
      : v.format === 'randomSingle'
        ? randomHands(1, factions, rng)
        : chosenContracts(v).map(plan);
  return { mode: v.mode, seats, factions, hands, seed };
}

interface Props {
  values: SetupValues;
  onChange(values: SetupValues): void;
  onStart(setup: MatchSetup): void;
  onBack(): void;
}

export function SetupScreen({ values: v, onChange, onStart, onBack }: Props) {
  const [step, setStep] = useState(0);
  const set = (patch: Partial<SetupValues>) => onChange({ ...v, ...patch });
  const go = (next: number) => {
    setStep(next);
    window.scrollTo(0, 0);
  };
  const canContinue = step !== 1 || v.format !== 'chosenSeries' || v.seriesContracts.length >= 2;

  return (
    <section className="panel setup">
      <button type="button" className="back" onClick={() => (step === 0 ? onBack() : go(step - 1))}>
        ← {step === 0 ? 'Menu principale' : 'Indietro'}
      </button>

      <ol className="steps" aria-label="Passaggi">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
            <button type="button" disabled={i >= step} onClick={() => go(i)}>
              <span className="step-no">{i + 1}</span>
              <span className="step-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && <PlayersStep v={v} set={set} />}
      {step === 1 && <ContractsStep v={v} set={set} />}
      {step === 2 && <FactionsStep v={v} set={set} />}

      <div className="controls step-controls">
        {step < 2 ? (
          <button type="button" className="btn primary" disabled={!canContinue} onClick={() => go(step + 1)}>
            Avanti →
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={() => onStart(toMatchSetup(v))}>
            Inizia la partita
          </button>
        )}
      </div>
    </section>
  );
}

interface StepProps {
  v: SetupValues;
  set(patch: Partial<SetupValues>): void;
}

function PlayersStep({ v, set }: StepProps) {
  const counts = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS);
  return (
    <>
      <h2>In quanti giocate?</h2>
      <p className="hint">
        {v.mode === 'solo'
          ? 'Te compreso: gli altri posti sono gestiti dalla CPU.'
          : 'Tutti sullo stesso dispositivo: ci si passa il telefono o il computer a turno.'}
      </p>
      <div className="count-picker" role="radiogroup" aria-label="Numero di giocatori">
        {counts.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={v.playerCount === k}
            className={`count-option${v.playerCount === k ? ' selected' : ''}`}
            onClick={() => set({ playerCount: k, factions: randomFactions(k, v.factions) })}
          >
            <b>{k}</b>
            <span>{v.mode === 'solo' ? `tu + ${k - 1} CPU` : 'giocatori'}</span>
          </button>
        ))}
      </div>

      {v.mode === 'local' && (
        <>
          <h3 className="step">Nomi dei giocatori</h3>
          <div className="names">
            {Array.from({ length: v.playerCount }, (_, i) => (
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
        </>
      )}
    </>
  );
}

function ContractsStep({ v, set }: StepProps) {
  const toggleSeries = (id: ContractId) =>
    set({
      seriesContracts: v.seriesContracts.includes(id)
        ? v.seriesContracts.filter((c) => c !== id)
        : [...v.seriesContracts, id],
    });

  return (
    <>
      <h2>Come volete giocare i Contratti?</h2>
      <p className="hint">Ogni Contratto dura una mano da 13 prese. In una serie i punti si sommano.</p>
      <div className="format-picker" role="radiogroup" aria-label="Formato">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={v.format === f.id}
            className={`format-option${v.format === f.id ? ' selected' : ''}`}
            onClick={() => set({ format: f.id })}
          >
            <span className="format-icon" aria-hidden="true">
              {f.icon}
            </span>
            <span className="contract-title">{f.title}</span>
            <span className="contract-desc">{f.desc}</span>
          </button>
        ))}
      </div>

      {v.format === 'randomSeries' && (
        <>
          <h3 className="step">Quanti Contratti?</h3>
          <div className="length-picker" role="radiogroup" aria-label="Lunghezza della serie">
            {SERIES_LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={v.seriesLength === l.value}
                className={`chip-option${v.seriesLength === l.value ? ' selected' : ''}`}
                onClick={() => set({ seriesLength: l.value })}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="hint">I Contratti vengono estratti all’inizio, senza ripetizioni.</p>
        </>
      )}

      {v.format === 'randomSingle' && (
        <p className="hint step-note">Il Contratto viene estratto quando inizia la partita.</p>
      )}

      {v.format === 'chosenSeries' && (
        <>
          <h3 className="step">Scegli i Contratti</h3>
          <p className="hint">
            Tocca i Contratti nell’ordine in cui volete giocarli (almeno 2). Selezionati: {v.seriesContracts.length}.
          </p>
          <ContractGrid selected={v.seriesContracts} ordered onToggle={toggleSeries} />
        </>
      )}

      {v.format === 'chosenSingle' && (
        <>
          <h3 className="step">Scegli il Contratto</h3>
          <ContractGrid selected={[v.singleContract]} onToggle={(id) => set({ singleContract: id })} />
        </>
      )}
    </>
  );
}

function ContractGrid({
  selected,
  ordered,
  onToggle,
}: {
  selected: ContractId[];
  ordered?: boolean;
  onToggle(id: ContractId): void;
}) {
  return (
    <div className="contract-picker">
      {contracts().map((c) => {
        const index = selected.indexOf(c.id);
        return (
          <button
            key={c.id}
            type="button"
            role={ordered ? 'checkbox' : 'radio'}
            aria-checked={index >= 0}
            className={`contract-option${index >= 0 ? ' selected' : ''}`}
            onClick={() => onToggle(c.id)}
          >
            {ordered && index >= 0 && <span className="order-badge">{index + 1}</span>}
            <span className="contract-title">
              {c.icon} {c.name}
            </span>
            <span className="contract-desc">{c.desc}</span>
            <span className="contract-score">{describeScoring(c)}</span>
          </button>
        );
      })}
    </div>
  );
}

function FactionsStep({ v, set }: StepProps) {
  const n = v.playerCount;
  const chosen = chosenContracts(v);
  const needsTarget = chosen.some((c) => contractNeedsTarget(getContract(c)));
  const missing = [...new Set(chosen.flatMap((c) => contractRequiredFactions(getContract(c))))].filter(
    (f) => !v.factions.includes(f),
  );

  const toggleFaction = (f: FactionId) => {
    if (v.factions.includes(f)) set({ factions: v.factions.filter((x) => x !== f) });
    else if (v.factions.length < n) set({ factions: factionIds().filter((x) => x === f || v.factions.includes(x)) });
  };

  return (
    <>
      <h2>Con quali fazioni?</h2>
      <p className="hint">
        Servono {n} fazioni, una per giocatore. Le carte vengono mescolate tutte insieme e ridistribuite a ogni
        Contratto: nessuno “possiede” una fazione.
      </p>
      <div className="faction-picker">
        {factionIds().map((f) => {
          const selected = v.factions.includes(f);
          return (
            <button
              key={f}
              type="button"
              aria-pressed={selected}
              disabled={!selected && v.factions.length >= n}
              className={`faction-option${selected ? ' selected' : ''}`}
              style={{ '--faction': getFaction(f).color } as CSSProperties}
              onClick={() => toggleFaction(f)}
            >
              <b>
                <span className="dot" />
                {getFaction(f).name}
              </b>
              <span className="hint">{getFaction(f).tagline}</span>
            </button>
          );
        })}
      </div>
      <p className={`status${v.factions.length === n ? ' good' : ''}`}>
        {v.factions.length === n
          ? `${n}/${n} fazioni selezionate · mazzo di ${n * 13} carte, 13 a giocatore.`
          : `Servono ${n} fazioni, ora ${v.factions.length}. Iniziando, le mancanti verranno scelte a caso.`}
      </p>
      <div className="controls">
        <button type="button" className="btn" onClick={() => set({ factions: randomFactions(n) })}>
          Fazioni casuali
        </button>
      </div>

      {needsTarget && (
        <label className="field target">
          <span className="label">Fazione da evitare in “Non prendere una fazione”</span>
          <select
            value={v.targetFaction && v.factions.includes(v.targetFaction) ? v.targetFaction : ''}
            onChange={(e) => set({ targetFaction: (e.target.value || null) as FactionId | null })}
          >
            <option value="">Casuale</option>
            {v.factions.map((f) => (
              <option key={f} value={f}>
                {getFaction(f).name}
              </option>
            ))}
          </select>
        </label>
      )}
      {missing.length > 0 && (
        <p className="status warn">
          Attenzione: un Contratto scelto riguarda {missing.map((f) => getFaction(f).name).join(', ')}, che non è nel
          mazzo.
        </p>
      )}
      {(v.format === 'randomSeries' || v.format === 'randomSingle') && (
        <p className="hint">I Contratti casuali escludono quelli che riguardano fazioni assenti dal mazzo.</p>
      )}

      <p className="summary">
        <b>Riepilogo:</b> {n} giocatori · {describeFormat(v)}
      </p>
    </>
  );
}
