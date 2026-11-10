import { getCard, getContract, getFaction, matchRanking } from '@nexum/engine';
import type { MatchView, PlayerView, TrickResult } from '@nexum/engine';
import type { CSSProperties } from 'react';
import { contractDescription, contractTitle, describeNote, describeScoring, describeTrick, handLabel, plural, signed } from '../game/text';
import { ContractIcon, Icon } from './Icon';
import { RulesContent } from './RulesPanel';
import { Sheet } from './Sheet';

export type InfoTab = 'classifica' | 'prese' | 'contratto' | 'regole';

/** Quando la colonna con classifica e prese resta accanto al tavolo (deve combaciare con styles.css). */
export const SIDEBAR_QUERY = '(min-width: 1200px) and (min-height: 640px)';

interface StandingsProps {
  match: MatchView;
  view: PlayerView;
  perspective: number | null;
}

/** La classifica: nella colonna accanto al tavolo sui computer grandi, e nella scheda Classifica di Info. */
export function Standings({ match, view, perspective }: StandingsProps) {
  const series = match.hands.length > 1;
  return (
    <div className="standings">
      {matchRanking(match.totals).map((pi, i) => {
        const p = view.players[pi]!;
        return (
          <div key={pi} className={`score-row${pi === perspective ? ' me' : ''}${pi === view.turn && view.phase === 'playing' ? ' turn' : ''}`}>
            <div>
              <b>
                {i + 1}. {p.name}
              </b>
              <div className="hint">
                {!view.domino && <>{plural(p.tricks, 'presa', 'prese')} · </>}
                {p.handCount} in mano
                {series && ` · questa mano ${signed(p.score)}`}
                {p.nextModifier !== 0 && ` · prossima carta ${signed(p.nextModifier)}`}
              </div>
            </div>
            <b>{match.totals[pi]} pt</b>
          </div>
        );
      })}
    </div>
  );
}

/** Le prese di questa mano, dalla più recente. */
export function TrickLog({ history, names }: { history: readonly TrickResult[]; names: readonly string[] }) {
  if (history.length === 0) return <p className="hint">Nessuna presa completata.</p>;
  return (
    <div className="log">
      {[...history].reverse().map((t) => (
        <div key={t.trickNo} className="logitem">
          <b>Presa {t.trickNo}</b> · {names[t.winner]}
          <div className="hint">
            {getCard(t.winningCardId).name} ({t.winningValue}) · {signed(t.contractDelta)} pt
          </div>
        </div>
      ))}
    </div>
  );
}

/** L'ultima presa conclusa, carta per carta. */
function LastTrick({ trick, names }: { trick: TrickResult; names: readonly string[] }) {
  return (
    <section className="last-trick">
      <h3>Ultima presa</h3>
      <p>{describeTrick(trick, names)}</p>
      <ul className="trick-plays">
        {trick.plays.map((pl) => {
          const won = pl.player === trick.winner;
          if (pl.skipped) {
            return (
              <li key={pl.player}>
                <span className="trick-play-who">{names[pl.player]}</span>
                <span className="hint">Salta la presa</span>
              </li>
            );
          }
          const card = getCard(pl.cardId);
          return (
            <li key={pl.player} className={won ? 'won' : undefined}>
              <span className="trick-play-who">
                {names[pl.player]}
                {/* La riga di chi prende è evidenziata, come nella frase sopra. */}
                {won && <span className="sr-only">, prende</span>}
              </span>
              <span className="trick-play-card">
                <span className="dot" style={{ '--faction': getFaction(card.faction).color } as CSSProperties} />
                {card.name}
              </span>
              <b className="trick-play-value">{pl.final === card.value ? card.value : `${card.value} → ${pl.final}`}</b>
            </li>
          );
        })}
      </ul>
      <p className={trick.contractDelta >= 0 ? 'good' : 'bad'}>
        Contratto: {signed(trick.contractDelta)}
        {trick.cancelled && ' · punti annullati con Reversal'}
      </p>
      {trick.notes.length > 0 && (
        <ul className="trick-notes">
          {trick.notes.map((note, i) => (
            <li key={i}>{describeNote(note, names)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContractInfo({ match, view }: { match: MatchView; view: PlayerView }) {
  const contract = getContract(view.contract);
  const series = match.hands.length > 1;
  return (
    <div className="contract-info">
      <span className="hint">{series ? `Contratto ${match.handIndex + 1} di ${match.hands.length}` : 'Contratto'}</span>
      <h3>
        <ContractIcon contract={contract} size={26} /> {contractTitle(view)}
      </h3>
      <p>{contractDescription(view)}</p>
      <h4>Punteggio</h4>
      <ul>
        {describeScoring(contract, undefined, view.cardsPerFaction)
          .split(' · ')
          .map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
      </ul>
      {series && (
        <>
          <h4>La serie</h4>
          <ol className="series-list">
            {match.hands.map((h, i) => (
              <li key={i} className={i === match.handIndex ? 'current' : i < match.handIndex ? 'done' : undefined}>
                <ContractIcon contract={getContract(h.contract)} size={18} />
                <span>{handLabel(h)}</span>
                {i === match.handIndex && <span className="tag gold">in corso</span>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

interface InfoProps extends StandingsProps {
  tab: InfoTab;
  names: readonly string[];
  onTab(tab: InfoTab): void;
  onClose(): void;
  onTutorial?: () => void;
}

/** Il pannello Info: sale dal basso sul telefono, si apre di lato sul computer. */
export function InfoPanel({ tab, names, match, view, perspective, onTab, onClose, onTutorial }: InfoProps) {
  const tabs: [InfoTab, string][] = [
    ['classifica', 'Classifica'],
    // Nel Domino non ci sono prese.
    ...(view.domino ? [] : [['prese', 'Prese'] as [InfoTab, string]]),
    ['contratto', 'Contratto'],
    ['regole', 'Regole'],
  ];
  const current = tabs.some(([id]) => id === tab) ? tab : 'classifica';
  const last = view.lastTrick ?? view.history.at(-1) ?? null;

  return (
    <Sheet className="info-sheet" label="Info" onClose={onClose}>
      <div className="sheet-frame">
        <header className="sheet-head">
          <div className="info-tabs" role="tablist" aria-label="Info">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === current}
                className="info-tab"
                onClick={() => onTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="btn small icon-toggle" aria-label="Chiudi" onClick={onClose}>
            <Icon name="chiudi" size={18} />
          </button>
        </header>
        <div key={current} className="sheet-body" role="tabpanel">
          {current === 'classifica' && (
            <>
              <h3>{match.hands.length > 1 ? 'Classifica della serie' : 'Classifica'}</h3>
              <Standings match={match} view={view} perspective={perspective} />
            </>
          )}
          {current === 'prese' && (
            <>
              {last && <LastTrick trick={last} names={names} />}
              <h3>Prese di questa mano</h3>
              <TrickLog history={view.history} names={names} />
            </>
          )}
          {current === 'contratto' && <ContractInfo match={match} view={view} />}
          {current === 'regole' && <RulesContent onTutorial={onTutorial} />}
        </div>
      </div>
    </Sheet>
  );
}
