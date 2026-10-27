import { getContract, matchRanking } from '@nexum/engine';
import type { MatchView } from '@nexum/engine';
import { describeScoring, handLabel as contractLabel, plural, signed } from '../game/text';

interface ResultProps {
  match: MatchView;
  names: readonly string[];
  /** Posto da evidenziare (il giocatore umano contro la CPU). */
  me: number | null;
}

/** Pausa tra due Contratti di una serie. */
export function HandEndScreen({ match, names, me, onNext, onMenu }: ResultProps & { onNext(): void; onMenu(): void }) {
  const hand = match.completed.at(-1)!;
  const next = match.hands[match.handIndex + 1]!;
  const order = matchRanking(match.totals);
  const leave = () => {
    if (window.confirm('Abbandonare la serie in corso e tornare al menu?')) onMenu();
  };

  return (
    <section className="panel end">
      <span className="hint">
        Contratto {match.handIndex + 1} di {match.hands.length} concluso
      </span>
      <h2>{contractLabel(hand)}</h2>
      <div className="final-score">
        {order.map((pi, i) => (
          <div key={pi} className={`score-row${pi === me ? ' me' : ''}`}>
            <div>
              <b>
                {i + 1}. {names[pi]}
              </b>
              <div className="hint">
                {plural(hand.tricks[pi]!, 'presa', 'prese')} · questa mano {signed(hand.scores[pi]!)}
              </div>
            </div>
            <b>{match.totals[pi]} pt</b>
          </div>
        ))}
      </div>
      <p className="hint">
        Prossimo: <b>{contractLabel(next)}</b> · {describeScoring(getContract(next.contract))}
      </p>
      <div className="controls center">
        <button type="button" className="btn primary" onClick={onNext}>
          Gioca il Contratto {match.handIndex + 2}
        </button>
        <button type="button" className="btn" onClick={leave}>
          Menu principale
        </button>
      </div>
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
        {series ? 'Vince chi ha più punti sommando tutti i Contratti.' : `${contractLabel(match.hands[0]!)} · vince chi chiude con il punteggio più alto.`}
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
                    {i + 1}. {contractLabel(h)}
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
