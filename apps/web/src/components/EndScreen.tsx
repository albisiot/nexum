import { cardMatches, getCard, getContract, getFaction, matchRanking, ruleApplies } from '@nexum/engine';
import type { ContractDef, FactionId, MatchView, TrickResult } from '@nexum/engine';
import { describeScoring, handLabel as contractLabel, plural, signed } from '../game/text';
import { ContractIcon } from './Icon';

interface ResultProps {
  match: MatchView;
  names: readonly string[];
  /** Posto da evidenziare (il giocatore umano contro la CPU). */
  me: number | null;
}

const tone = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : undefined);

/** Che cosa conta di una presa per il Contratto: le carte che fanno punti, o la fazione d'apertura. */
function trickDetail(t: TrickResult, contract: ContractDef, target?: FactionId): string {
  const active = contract.rules.filter((r) => ruleApplies(r, t.trickNo));
  const rules = active.filter((r) => r.per === 'card');
  if (!rules.length) return `Fazione d’apertura ${getFaction(t.leadFaction).name}`;
  const counted = t.plays
    .flatMap((pl) => (pl.skipped ? [] : [getCard(pl.cardId)]))
    .filter((card) => rules.some((r) => cardMatches(r.filter ?? { kind: 'any' }, card, target)));
  if (!counted.length) {
    return active.some((r) => r.per === 'trick')
      ? 'Conta solo la presa: nessuna carta che fa punti'
      : 'Nessuna carta che conta per il Contratto';
  }
  const shown = counted.slice(0, 3).map((card) => `${card.name} (${card.value})`);
  const more = counted.length - shown.length;
  return `Carte che contano: ${shown.join(', ')}${more > 0 ? ` e altre ${more}` : ''}`;
}

/** Pausa tra due Contratti di una serie. */
export function HandEndScreen({ match, names, me, onNext, onMenu }: ResultProps & { onNext(): void; onMenu(): void }) {
  const hand = match.completed.at(-1)!;
  const contract = getContract(hand.contract);
  const next = match.hands[match.handIndex + 1]!;
  const nextContract = getContract(next.contract);
  const order = matchRanking(match.totals);
  // Classifica prima di questa mano, per mostrare chi sale e chi scende (dopo la prima mano non c'è un prima).
  const before = match.handIndex > 0 ? matchRanking(match.totals.map((t, i) => t - hand.scores[i]!)) : order;
  const history = match.game.history;
  const tricks = me === null ? history : history.filter((t) => t.winner === me);
  // Punti arrivati dai poteri delle carte invece che dalle prese vinte.
  const fromPowers = me === null ? 0 : hand.scores[me]! - tricks.reduce((sum, t) => sum + t.contractDelta, 0);
  const leave = () => {
    if (window.confirm('Abbandonare la serie in corso e tornare al menu?')) onMenu();
  };

  return (
    <section className="hand-end">
      <header className="panel hand-end-head">
        <div>
          <span className="hint">
            Contratto {match.handIndex + 1} di {match.hands.length} concluso
          </span>
          <h2>
            <ContractIcon contract={contract} /> {contractLabel(hand)}
          </h2>
        </div>
        {me !== null && (
          <div className="phase">
            <span className="hint">Il tuo posto</span>
            <strong>
              {order.indexOf(me) + 1}° · {match.totals[me]} pt
            </strong>
          </div>
        )}
      </header>

      <ol className="series-steps" aria-label="Contratti della serie">
        {match.hands.map((h, i) => {
          const done = i <= match.handIndex;
          const upcoming = i === match.handIndex + 1;
          const mine = done && me !== null ? match.completed[i]!.scores[me]! : null;
          return (
            <li
              key={i}
              className={`series-step${done ? ' done' : upcoming ? ' next' : ''}`}
              aria-current={upcoming ? 'step' : undefined}
            >
              <span className="series-step-icon">
                <ContractIcon contract={getContract(h.contract)} size={22} />
              </span>
              <span className="series-step-text">
                <span className="series-step-label">
                  {i + 1}
                  {done ? ' · Concluso' : upcoming ? ' · Prossimo' : ''}
                </span>
                <b>{getContract(h.contract).name}</b>
                <span className="hint">
                  {mine !== null ? (
                    <>
                      {names[me!]} <b className={tone(mine)}>{signed(mine)}</b>
                    </>
                  ) : done ? (
                    'Giocato'
                  ) : (
                    'Da giocare'
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="hand-end-grid">
        <section className="panel">
          <h3>Classifica della serie</h3>
          <div className="standings-head" aria-hidden="true">
            <span>Giocatore</span>
            <span>Prese</span>
            <span>Questa mano</span>
            <span>Totale</span>
          </div>
          {order.map((pi, i) => {
            const move = before.indexOf(pi) - i;
            return (
              <div key={pi} className={`standings-row${pi === me ? ' me' : ''}`}>
                <span>
                  <b>
                    {i + 1}. {names[pi]}
                  </b>
                  {move !== 0 && (
                    <>
                      <span className={`move ${move > 0 ? 'good' : 'bad'}`} aria-hidden="true">
                        {move > 0 ? `↑${move}` : `↓${-move}`}
                      </span>
                      <span className="sr-only">
                        , {move > 0 ? 'sale' : 'scende'} di {plural(Math.abs(move), 'posto', 'posti')}
                      </span>
                    </>
                  )}
                </span>
                <span>
                  {hand.tricks[pi]}
                  <span className="sr-only"> {hand.tricks[pi] === 1 ? 'presa' : 'prese'}</span>
                </span>
                <b className={tone(hand.scores[pi]!)}>
                  {signed(hand.scores[pi]!)}
                  <span className="sr-only"> in questa mano</span>
                </b>
                <b>{match.totals[pi]} pt</b>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <h3>{me === null ? 'Prese della mano' : 'Le tue prese'}</h3>
          {tricks.length === 0 ? (
            <p className="hint">Nessuna presa vinta in questa mano.</p>
          ) : (
            <div className="log">
              {tricks.map((t) => (
                <div key={t.trickNo} className="logitem trick-line">
                  <div>
                    <b>Presa {t.trickNo}</b> · {me === null && `${names[t.winner]} `}
                    con {getCard(t.winningCardId).name} ({t.winningValue})
                    <div className="hint">{trickDetail(t, contract, hand.targetFaction)}</div>
                  </div>
                  <b className={tone(t.contractDelta)}>{signed(t.contractDelta)}</b>
                </div>
              ))}
            </div>
          )}
          {me !== null && (
            <>
              <div className="hand-total">
                <span>Questa mano</span>
                <b className={tone(hand.scores[me]!)}>{signed(hand.scores[me]!)}</b>
              </div>
              {fromPowers !== 0 && <p className="hint">Di cui {signed(fromPowers)} dai poteri delle carte.</p>}
            </>
          )}
        </section>
      </div>

      <section className="panel next-contract">
        <div className="next-contract-info">
          <span className="icon-tile">
            <ContractIcon contract={nextContract} />
          </span>
          <div>
            <span className="hint">
              Prossimo Contratto · {match.handIndex + 2} di {match.hands.length}
            </span>
            <h3>{contractLabel(next)}</h3>
            <p>
              {nextContract.desc} <span className="pill">{describeScoring(nextContract)}</span>
            </p>
          </div>
        </div>
        <div className="controls">
          <button type="button" className="btn" onClick={leave}>
            Menu principale
          </button>
          <button type="button" className="btn primary" onClick={onNext}>
            Gioca il Contratto {match.handIndex + 2}
          </button>
        </div>
      </section>
    </section>
  );
}

/** Fine della partita: classifica finale e, per le serie, punti di ogni Contratto. */
export function EndScreen({
  match,
  names,
  me,
  onReplay,
  onExit,
  onMenu,
}: ResultProps & { onReplay(): void; onExit(): void; onMenu(): void }) {
  const order = matchRanking(match.totals);
  const best = match.totals[order[0]!]!;
  const winners = order.filter((pi) => match.totals[pi] === best);
  const series = match.hands.length > 1;
  const title =
    winners.length > 1
      ? `Pareggio: ${winners.map((pi) => names[pi]).join(' e ')}`
      : winners[0] === me
        ? series
          ? 'Hai vinto la serie!'
          : 'Hai vinto il Contratto!'
        : `${names[winners[0]!]} vince ${series ? 'la serie' : 'il Contratto'}`;

  return (
    <section className="panel end">
      <span className="hint">{series ? `Serie di ${match.hands.length} Contratti terminata` : 'Contratto terminato'}</span>
      <h2>{title}</h2>
      <p className="hint">
        {series ? (
          'Vince chi ha più punti sommando tutti i Contratti.'
        ) : (
          <>
            <ContractIcon contract={getContract(match.hands[0]!.contract)} size={16} /> {contractLabel(match.hands[0]!)} · vince
            chi chiude con il punteggio più alto.
          </>
        )}
      </p>

      <div className="final-score">
        {order.map((pi, i) => {
          const tricks = match.completed.reduce((t, h) => t + h.tricks[pi]!, 0);
          return (
            <div key={pi} className={`score-row${pi === me ? ' me' : ''}`}>
              <div>
                <b>
                  {i + 1}. {names[pi]}
                </b>
                <div className="hint">{plural(tricks, 'presa vinta', 'prese vinte')}</div>
              </div>
              <b>{match.totals[pi]} pt</b>
            </div>
          );
        })}
      </div>

      {series && (
        <div className="breakdown-wrap">
          <table className="breakdown">
            <thead>
              <tr>
                <th>Contratto</th>
                {order.map((pi) => (
                  <th key={pi}>{names[pi]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {match.completed.map((h, i) => (
                <tr key={i}>
                  <td>
                    {i + 1}. <ContractIcon contract={getContract(h.contract)} size={16} /> {contractLabel(h)}
                  </td>
                  {order.map((pi) => (
                    <td key={pi}>{signed(h.scores[pi]!)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Totale</td>
                {order.map((pi) => (
                  <td key={pi}>{match.totals[pi]}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="controls center">
        <button type="button" className="btn primary" onClick={onReplay}>
          {series ? 'Rigioca la stessa serie' : 'Rigioca questo Contratto'}
        </button>
        <button type="button" className="btn" onClick={onExit}>
          Nuova partita
        </button>
        <button type="button" className="btn" onClick={onMenu}>
          Menu principale
        </button>
      </div>
    </section>
  );
}
