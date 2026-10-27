import { useEffect, useMemo, useState } from 'react';
import {
  CARDS_PER_FACTION,
  DEFAULT_CATALOG,
  MAX_CARD_VALUE,
  MIN_CARD_VALUE,
  POWERS,
  TRICKS_PER_HAND,
  getCatalog,
  validateCatalog,
} from '@nexum/engine';
import type { CardFilter, Catalog, ContractDef, ScoringRule } from '@nexum/engine';
import type { CSSProperties } from 'react';
import { useAuth } from '../auth/auth';
import { catalogStore } from '../catalog/store';
import { describeRule, describeScoring } from '../game/text';

type Tab = 'factions' | 'contracts';
type Status = { kind: 'busy' | 'ok' | 'error' | 'info'; text: string };
type Update = (change: (draft: Catalog) => void) => void;

const clone = (c: Catalog): Catalog => JSON.parse(JSON.stringify(c)) as Catalog;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
/** Un campo numerico svuotato vale NaN (o null dopo la copia): lo mostriamo vuoto. */
const numValue = (n: number) => (Number.isFinite(n) ? n : '');
const time = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
/** Valori proposti per le 13 carte di una fazione nuova. */
const NEW_FACTION_VALUES = [97, 89, 81, 73, 65, 57, 50, 42, 34, 26, 18, 10, 2];

function errorText(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'permission-denied') {
    return 'Il database non riconosce questo account come Editor, oppure le regole di sicurezza non sono ancora pubblicate.';
  }
  if (code === 'not-found') return 'Il database Firestore non esiste ancora: va creato nella console Firebase.';
  if (code === 'unavailable') return 'Database non raggiungibile: controlla la connessione.';
  return error instanceof Error ? error.message : String(error);
}

interface Props {
  onBack(): void;
}

export function EditorScreen({ onBack }: Props) {
  const auth = useAuth();
  const email = auth.status === 'signedIn' ? auth.account.email : null;
  const [draft, setDraft] = useState<Catalog | null>(null);
  const [saved, setSaved] = useState('');
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'busy', text: 'Caricamento della bozza…' });
  const [tab, setTab] = useState<Tab>('factions');
  const [factionId, setFactionId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = (catalog: Catalog) => {
      setDraft(clone(catalog));
      setSaved(JSON.stringify(catalog));
    };
    (async () => {
      try {
        const remote = await import('../catalog/remote');
        const [d, p] = await Promise.all([remote.loadCatalog('draft'), remote.loadCatalog('published')]);
        if (cancelled) return;
        start(d?.catalog ?? p?.catalog ?? getCatalog());
        setPublishedVersion(p?.catalog.version ?? 0);
        setStatus({ kind: 'info', text: d ? 'Bozza caricata.' : 'Nessuna bozza salvata: parti dai dati attuali del gioco.' });
      } catch (error) {
        if (cancelled) return;
        start(getCatalog());
        setStatus({ kind: 'error', text: `${errorText(error)} Puoi lavorare, ma salvare e pubblicare non funzionerà.` });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = useMemo(() => (draft ? validateCatalog(draft) : []), [draft]);
  if (!draft) return <section className="panel editor">{status.text}</section>;

  const dirty = JSON.stringify(draft) !== saved;
  const busy = status.kind === 'busy';
  const update: Update = (change) =>
    setDraft((prev) => {
      const next = clone(prev!);
      change(next);
      return next;
    });

  const save = async () => {
    setStatus({ kind: 'busy', text: 'Salvataggio della bozza…' });
    try {
      const remote = await import('../catalog/remote');
      await remote.saveDraft(draft, email);
      setSaved(JSON.stringify(draft));
      setStatus({ kind: 'ok', text: `Bozza salvata alle ${time()}. I giocatori non la vedono finché non la pubblichi.` });
    } catch (error) {
      setStatus({ kind: 'error', text: `Bozza non salvata: ${errorText(error)}` });
    }
  };

  const publish = async () => {
    const next = (publishedVersion ?? 0) + 1;
    if (!window.confirm(`Pubblicare la versione ${next}? Da ora le nuove partite di tutti useranno questi dati.`)) return;
    setStatus({ kind: 'busy', text: 'Pubblicazione…' });
    try {
      const remote = await import('../catalog/remote');
      const version = await remote.publish(draft, email);
      const live = { ...draft, version };
      setDraft(live);
      setSaved(JSON.stringify(live));
      setPublishedVersion(version);
      catalogStore.offer(live);
      setStatus({ kind: 'ok', text: `Versione ${version} pubblicata alle ${time()}: le nuove partite useranno questi dati.` });
    } catch (error) {
      setStatus({ kind: 'error', text: `Pubblicazione non riuscita: ${errorText(error)}` });
    }
  };

  const revert = () => {
    if (window.confirm('Annullare tutte le modifiche non salvate?')) setDraft(JSON.parse(saved) as Catalog);
  };
  const restoreDefaults = () => {
    if (window.confirm('Sostituire la bozza con i dati originali del gioco (simulatore v0.9)? Potrai ancora annullare finché non salvi.')) {
      setDraft({ ...clone(DEFAULT_CATALOG), version: draft.version });
    }
  };
  const back = () => {
    if (!dirty || window.confirm('Ci sono modifiche non salvate. Uscire comunque?')) onBack();
  };

  return (
    <section className="panel editor">
      <button type="button" className="back" onClick={back}>
        ← Menu principale
      </button>
      <div className="editor-head">
        <div>
          <h2>Editor</h2>
          <p className="hint">
            Versione pubblicata: {publishedVersion ?? '—'} · Bozza: {dirty ? 'modifiche non salvate' : 'salvata'}
          </p>
        </div>
        <div className="controls">
          <button type="button" className="btn" disabled={!dirty || busy} onClick={revert}>
            Annulla modifiche
          </button>
          <button type="button" className="btn" disabled={!dirty || busy} onClick={() => void save()}>
            Salva bozza
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={errors.length > 0 || busy}
            onClick={() => void publish()}
          >
            Pubblica
          </button>
        </div>
      </div>
      <p className={`status editor-status ${status.kind}`}>{status.text}</p>

      {errors.length > 0 && (
        <div className="editor-errors">
          <b>Da sistemare prima di pubblicare ({errors.length}):</b>
          <ul>
            {errors.slice(0, 8).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {errors.length > 8 && <li>…e altri {errors.length - 8}.</li>}
          </ul>
        </div>
      )}

      <div className="editor-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'factions'} onClick={() => setTab('factions')}>
          Fazioni e carte
        </button>
        <button type="button" role="tab" aria-selected={tab === 'contracts'} onClick={() => setTab('contracts')}>
          Contratti
        </button>
      </div>

      {tab === 'factions' ? (
        <FactionsTab draft={draft} update={update} selected={factionId} select={setFactionId} />
      ) : (
        <ContractsTab draft={draft} update={update} selected={contractId} select={setContractId} />
      )}

      <div className="editor-footer">
        <button type="button" className="btn small" disabled={busy} onClick={restoreDefaults}>
          Ripristina i dati originali
        </button>
      </div>
    </section>
  );
}

interface TabProps {
  draft: Catalog;
  update: Update;
  selected: string | null;
  select(id: string | null): void;
}

function FactionsTab({ draft, update, selected, select }: TabProps) {
  const faction = draft.factions.find((f) => f.id === selected) ?? draft.factions[0];

  const addFaction = () => {
    const id = newId('F');
    update((c) => {
      c.factions.push({ id, name: 'Nuova fazione', color: '#888888', tagline: '' });
      NEW_FACTION_VALUES.forEach((value, i) =>
        c.cards.push({ id: `${id}-${i}`, faction: id, name: `Carta ${i + 1}`, value, effect: '' }),
      );
    });
    select(id);
  };

  return (
    <div className="editor-body">
      <nav className="editor-list" aria-label="Fazioni">
        {draft.factions.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`editor-item${f.id === faction?.id ? ' selected' : ''}`}
            style={{ '--faction': f.color } as CSSProperties}
            onClick={() => select(f.id)}
          >
            <span className="dot" />
            {f.name || '(senza nome)'}
          </button>
        ))}
        <button type="button" className="editor-item add" onClick={addFaction}>
          + Nuova fazione
        </button>
      </nav>

      {faction && (
        <FactionForm key={faction.id} draft={draft} update={update} factionId={faction.id} onDeleted={() => select(null)} />
      )}
    </div>
  );
}

function FactionForm({
  draft,
  update,
  factionId,
  onDeleted,
}: {
  draft: Catalog;
  update: Update;
  factionId: string;
  onDeleted(): void;
}) {
  const faction = draft.factions.find((f) => f.id === factionId)!;
  const cards = draft.cards.filter((c) => c.faction === factionId);
  const editFaction = (patch: Partial<typeof faction>) =>
    update((c) => Object.assign(c.factions.find((f) => f.id === factionId)!, patch));
  const editCard = (cardId: string, change: (card: Catalog['cards'][number]) => void) =>
    update((c) => change(c.cards.find((x) => x.id === cardId)!));

  const remove = () => {
    if (!window.confirm(`Eliminare la fazione “${faction.name}” e le sue ${cards.length} carte?`)) return;
    update((c) => {
      c.factions = c.factions.filter((f) => f.id !== factionId);
      c.cards = c.cards.filter((x) => x.faction !== factionId);
    });
    onDeleted();
  };

  return (
    <div className="editor-form">
      <div className="grid2">
        <label className="field">
          <span className="label">Nome della fazione</span>
          <input value={faction.name} maxLength={30} onChange={(e) => editFaction({ name: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">Colore</span>
          <input type="color" value={faction.color} onChange={(e) => editFaction({ color: e.target.value })} />
        </label>
      </div>
      <label className="field">
        <span className="label">Descrizione breve</span>
        <input value={faction.tagline} maxLength={60} onChange={(e) => editFaction({ tagline: e.target.value })} />
      </label>

      <h3 className="step">Le {CARDS_PER_FACTION} carte</h3>
      <p className="hint">
        Valori interi da {MIN_CARD_VALUE} a {MAX_CARD_VALUE}, tutti diversi nella fazione. Il <b>testo</b> è ciò che
        leggono i giocatori; il <b>potere programmato</b> è ciò che il gioco applica davvero. Per un potere nuovo scrivi
        il testo e lascia “Nessuno”: andrà programmato.
      </p>
      <div className="card-editor-list">
        {cards.map((card) => (
          <div key={card.id} className="card-editor" style={{ '--faction': faction.color } as CSSProperties}>
            <div className="card-editor-row">
              <label className="field grow">
                <span className="label">Nome</span>
                <input
                  value={card.name}
                  maxLength={30}
                  onChange={(e) => editCard(card.id, (x) => (x.name = e.target.value))}
                />
              </label>
              <label className="field value">
                <span className="label">Valore</span>
                <input
                  type="number"
                  min={MIN_CARD_VALUE}
                  max={MAX_CARD_VALUE}
                  value={numValue(card.value)}
                  onChange={(e) => editCard(card.id, (x) => (x.value = parseInt(e.target.value, 10)))}
                />
              </label>
            </div>
            <label className="field">
              <span className="label">Testo del potere</span>
              <textarea
                rows={2}
                value={card.effect}
                maxLength={200}
                placeholder="Nessun potere"
                onChange={(e) => editCard(card.id, (x) => (x.effect = e.target.value))}
              />
            </label>
            <label className="field">
              <span className="label">Potere programmato</span>
              <select
                value={card.power ?? ''}
                onChange={(e) =>
                  editCard(card.id, (x) => {
                    if (e.target.value) x.power = e.target.value;
                    else delete x.power;
                  })
                }
              >
                <option value="">Nessuno</option>
                {Object.entries(POWERS).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name} — {p.summary}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>

      <div className="controls">
        <button type="button" className="btn danger" onClick={remove}>
          Elimina questa fazione
        </button>
      </div>
    </div>
  );
}

function ContractsTab({ draft, update, selected, select }: TabProps) {
  const contract = draft.contracts.find((c) => c.id === selected) ?? draft.contracts[0];

  const addContract = () => {
    const id = newId('K');
    update((c) =>
      c.contracts.push({ id, icon: '⭐', name: 'Nuovo Contratto', desc: '', rules: [{ points: -1, per: 'trick' }] }),
    );
    select(id);
  };

  return (
    <div className="editor-body">
      <nav className="editor-list" aria-label="Contratti">
        {draft.contracts.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`editor-item${c.id === contract?.id ? ' selected' : ''}`}
            onClick={() => select(c.id)}
          >
            {c.icon} {c.name || '(senza nome)'}
          </button>
        ))}
        <button type="button" className="editor-item add" onClick={addContract}>
          + Nuovo Contratto
        </button>
      </nav>

      {contract && (
        <ContractForm key={contract.id} draft={draft} update={update} contract={contract} onDeleted={() => select(null)} />
      )}
    </div>
  );
}

function ContractForm({
  draft,
  update,
  contract,
  onDeleted,
}: {
  draft: Catalog;
  update: Update;
  contract: ContractDef;
  onDeleted(): void;
}) {
  const edit = (change: (c: ContractDef) => void) => update((cat) => change(cat.contracts.find((c) => c.id === contract.id)!));
  const remove = () => {
    if (!window.confirm(`Eliminare il Contratto “${contract.name}”?`)) return;
    update((cat) => {
      cat.contracts = cat.contracts.filter((c) => c.id !== contract.id);
    });
    onDeleted();
  };

  return (
    <div className="editor-form">
      <div className="contract-edit-head">
        <label className="field icon">
          <span className="label">Icona</span>
          <input value={contract.icon} maxLength={4} onChange={(e) => edit((c) => (c.icon = e.target.value))} />
        </label>
        <label className="field grow">
          <span className="label">Nome</span>
          <input value={contract.name} maxLength={40} onChange={(e) => edit((c) => (c.name = e.target.value))} />
        </label>
      </div>
      <label className="field">
        <span className="label">Descrizione per i giocatori</span>
        <textarea rows={2} value={contract.desc} maxLength={200} onChange={(e) => edit((c) => (c.desc = e.target.value))} />
      </label>

      <h3 className="step">Regole di punteggio</h3>
      <p className="hint">
        Ogni regola assegna punti a chi vince una presa. I punti delle regole si sommano. Riassunto per i giocatori:{' '}
        <b>{describeScoring(contract, draft) || '—'}</b>
      </p>
      {contract.rules.map((rule, i) => (
        <RuleEditor
          key={i}
          draft={draft}
          rule={rule}
          onChange={(change) => edit((c) => change(c.rules[i]!))}
          onRemove={() => edit((c) => c.rules.splice(i, 1))}
        />
      ))}
      <div className="controls">
        <button type="button" className="btn" onClick={() => edit((c) => c.rules.push({ points: -1, per: 'trick' }))}>
          + Aggiungi regola
        </button>
        <button type="button" className="btn danger" onClick={remove}>
          Elimina questo Contratto
        </button>
      </div>
    </div>
  );
}

type FilterKey = 'any' | 'target' | 'faction' | 'minValue' | 'maxValue' | 'hasPower' | 'card';

const FILTER_LABELS: Record<FilterKey, string> = {
  any: 'qualsiasi carta',
  target: 'della fazione bersaglio (scelta a inizio mano)',
  faction: 'di una fazione precisa',
  minValue: 'di valore almeno…',
  maxValue: 'di valore al massimo…',
  hasPower: 'con un potere scritto',
  card: 'una carta precisa',
};

function filterKey(filter: CardFilter | undefined): FilterKey {
  if (!filter) return 'any';
  if (filter.kind === 'faction') return filter.faction === 'target' ? 'target' : 'faction';
  return filter.kind;
}

function RuleEditor({
  draft,
  rule,
  onChange,
  onRemove,
}: {
  draft: Catalog;
  rule: ScoringRule;
  onChange(change: (r: ScoringRule) => void): void;
  onRemove(): void;
}) {
  const key = filterKey(rule.filter);
  const setFilter = (k: FilterKey) =>
    onChange((r) => {
      const first = draft.factions[0]?.id ?? '';
      const filters: Record<FilterKey, CardFilter> = {
        any: { kind: 'any' },
        target: { kind: 'faction', faction: 'target' },
        faction: { kind: 'faction', faction: first },
        minValue: { kind: 'minValue', value: 80 },
        maxValue: { kind: 'maxValue', value: 20 },
        hasPower: { kind: 'hasPower' },
        card: { kind: 'card', cardId: draft.cards[0]?.id ?? '' },
      };
      r.filter = filters[k];
    });

  return (
    <div className="rule-editor">
      <div className="rule-row">
        <label className="field points">
          <span className="label">Punti</span>
          <input
            type="number"
            value={numValue(rule.points)}
            onChange={(e) => onChange((r) => (r.points = parseInt(e.target.value, 10)))}
          />
        </label>
        <label className="field grow">
          <span className="label">Per</span>
          <select
            value={rule.per}
            onChange={(e) =>
              onChange((r) => {
                r.per = e.target.value as ScoringRule['per'];
                if (r.per === 'card') r.filter ??= { kind: 'any' };
                else delete r.filter;
              })
            }
          >
            <option value="trick">ogni presa vinta</option>
            <option value="card">ogni carta catturata…</option>
          </select>
        </label>
      </div>

      {rule.per === 'card' && (
        <div className="rule-row">
          <label className="field grow">
            <span className="label">Quali carte</span>
            <select value={key} onChange={(e) => setFilter(e.target.value as FilterKey)}>
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((k) => (
                <option key={k} value={k}>
                  {FILTER_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          {rule.filter?.kind === 'faction' && rule.filter.faction !== 'target' && (
            <label className="field grow">
              <span className="label">Fazione</span>
              <select
                value={rule.filter.faction}
                onChange={(e) => onChange((r) => (r.filter = { kind: 'faction', faction: e.target.value }))}
              >
                {draft.factions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(rule.filter?.kind === 'minValue' || rule.filter?.kind === 'maxValue') && (
            <label className="field points">
              <span className="label">Valore</span>
              <input
                type="number"
                value={numValue(rule.filter.value)}
                onChange={(e) =>
                  onChange((r) => {
                    if (r.filter?.kind === 'minValue' || r.filter?.kind === 'maxValue') r.filter.value = parseInt(e.target.value, 10);
                  })
                }
              />
            </label>
          )}
          {rule.filter?.kind === 'card' && (
            <label className="field grow">
              <span className="label">Carta</span>
              <select
                value={rule.filter.cardId}
                onChange={(e) => onChange((r) => (r.filter = { kind: 'card', cardId: e.target.value }))}
              >
                {draft.factions.map((f) => (
                  <optgroup key={f.id} label={f.name}>
                    {draft.cards
                      .filter((c) => c.faction === f.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.value})
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="rule-row">
        <label className="field grow">
          <span className="label">Quando</span>
          <select
            value={rule.tricks ? 'range' : 'all'}
            onChange={(e) =>
              onChange((r) => {
                if (e.target.value === 'range') r.tricks = { from: TRICKS_PER_HAND, to: TRICKS_PER_HAND };
                else delete r.tricks;
              })
            }
          >
            <option value="all">in tutte le prese</option>
            <option value="range">solo in alcune prese</option>
          </select>
        </label>
        {rule.tricks && (
          <>
            <label className="field points">
              <span className="label">Dalla presa</span>
              <input
                type="number"
                min={1}
                max={TRICKS_PER_HAND}
                value={numValue(rule.tricks.from)}
                onChange={(e) => onChange((r) => (r.tricks!.from = parseInt(e.target.value, 10)))}
              />
            </label>
            <label className="field points">
              <span className="label">Alla presa</span>
              <input
                type="number"
                min={1}
                max={TRICKS_PER_HAND}
                value={numValue(rule.tricks.to)}
                onChange={(e) => onChange((r) => (r.tricks!.to = parseInt(e.target.value, 10)))}
              />
            </label>
          </>
        )}
      </div>

      <div className="rule-foot">
        <span className="rule-text">{describeRule(rule, draft)}</span>
        <button type="button" className="btn small danger" onClick={onRemove}>
          Togli regola
        </button>
      </div>
    </div>
  );
}
