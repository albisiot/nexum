import { CONTRACTS, ranking } from '@nexum/engine';
import type { PlayerView } from '@nexum/engine';
import { plural } from '../game/text';

interface Props {
  view: PlayerView;
  /** Posto da evidenziare (il giocatore umano contro la CPU). */
  me: number | null;
  onReplay(): void;
  onExit(): void;
  onMenu(): void;
}

export function EndScreen({ view, me, onReplay, onExit, onMenu }: Props) {
  const order = ranking(view);
  const best = view.players[order[0]!]!.score;
  const winners = order.filter((pi) => view.players[pi]!.score === best);
  const title =
    winners.length > 1
      ? `Pareggio: ${winners.map((pi) => view.players[pi]!.name).join(' e ')}`
      : winners[0] === me
        ? 'Hai vinto il Contratto!'
        : `${view.players[winners[0]!]!.name} vince il Contratto`;

  return (
    <section className="panel end">
      <span className="hint">Contratto terminato</span>
      <h2>{title}</h2>
      <p className="hint">{CONTRACTS[view.contract].name} · vince chi chiude con il punteggio più alto.</p>
      <div className="final-score">
        {order.map((pi, i) => {
          const p = view.players[pi]!;
          return (
            <div key={pi} className={`score-row${pi === me ? ' me' : ''}`}>
              <div>
                <b>
                  {i + 1}. {p.name}
                </b>
                <div className="hint">
                  {plural(p.tricks, 'presa vinta', 'prese vinte')} · {plural(p.capturedCount, 'carta catturata', 'carte catturate')}
                </div>
              </div>
              <b>{p.score} pt</b>
            </div>
          );
        })}
      </div>
      <div className="controls center">
        <button type="button" className="btn primary" onClick={onReplay}>
          Rigioca questo Contratto
        </button>
        <button type="button" className="btn" onClick={onExit}>
          Cambia impostazioni
        </button>
        <button type="button" className="btn" onClick={onMenu}>
          Menu principale
        </button>
      </div>
    </section>
  );
}
