import { getCard, getContract, getFaction, matchRanking, sortHand } from '@nexum/engine';
import type { GameClient } from '../game/GameClient';
import { contractDescription, contractTitle, describeNote, describeScoring, describeTrick, plural, signed } from '../game/text';
import { useGame } from '../game/useGame';
import { CardView } from './CardView';
import { EndScreen, HandEndScreen } from './EndScreen';

interface Props {
  client: GameClient;
  onReplay(): void;
  onExit(): void;
  onMenu(): void;
}

export function GameScreen({ client, onReplay, onExit, onMenu }: Props) {
  const snap = useGame(client);
  const { match, view, perspective } = snap;
  const names = view.players.map((p) => p.name);
  const me = client.setup.mode === 'solo' ? 0 : null;
  const series = match.hands.length > 1;

  if (match.phase === 'matchEnd') {
    return <EndScreen match={match} names={names} me={me} onReplay={onReplay} onExit={onExit} onMenu={onMenu} />;
  }
  if (match.phase === 'handEnd') {
    return <HandEndScreen match={match} names={names} me={me} onNext={() => client.nextHand()} onMenu={onMenu} />;
  }

  const n = view.players.length;
  const order = Array.from({ length: n }, (_, k) => (view.leader + k) % n);
  const trickOver = view.phase === 'trickEnd';
  const last = trickOver ? view.lastTrick : null;
  const plays = last ? last.plays : view.plays;
  const current = names[view.turn];
  const legal = new Set(view.legal);

  const exit = () => {
    if (window.confirm('Abbandonare la partita in corso e tornare alla preparazione?')) onExit();
  };

  return (
    <main className="game">
      <section className="panel contract-head">
        <div>
          <span className="hint">{series ? `Contratto ${match.handIndex + 1} di ${match.hands.length}` : 'Contratto'}</span>
          <h2>{contractTitle(view)}</h2>
          <p>{contractDescription(view)}</p>
          <span className="pill">{describeScoring(getContract(view.contract))}</span>
        </div>
        <div className="phase">
          <span className="hint">Presa</span>
          <strong>
            {view.trickNo} / {view.tricksPerHand}
          </strong>
          <span className="hint">
            {trickOver ? `Presa a ${names[last!.winner]}` : view.turn === perspective ? 'Tocca a te' : `Tocca a ${current}`}
          </span>
        </div>
      </section>

      <section className="panel table">
        <div className="order">
          {order.map((pi, idx) => {
            const done = plays.some((pl) => pl.player === pi);
            const now = !trickOver && view.turn === pi;
            return (
              <span key={pi} className={`chip${now ? ' current' : ''}`}>
                {idx + 1}° {names[pi]}
                {now ? ' · ora' : done ? ' · giocato' : ''}
              </span>
            );
          })}
        </div>

        <div className="trick">
          {order.map((pi, idx) => {
            const pl = plays.find((x) => x.player === pi);
            const won = last?.winner === pi;
            return (
              <div key={pi} className={`slot${pl ? '' : ' empty'}${won ? ' won' : ''}`}>
                <div className="slot-head">
                  {idx + 1}° · {names[pi]}
                  {pi === view.leader && <span className="tag">primo di mano</span>}
                  {won && <span className="tag gold">prende</span>}
                </div>
                {!pl ? (
                  <div className="slot-body">{view.turn === pi && !trickOver ? 'Sta giocando…' : 'Deve ancora giocare'}</div>
                ) : pl.skipped ? (
                  <div className="slot-body">Salta la presa</div>
                ) : (
                  <CardView cardId={pl.cardId} final={pl.final} compact />
                )}
              </div>
            );
          })}
        </div>

        {last && (
          <div className="result">
            <p>
              <b>{describeTrick(last, names)}</b>
            </p>
            <p className={last.contractDelta >= 0 ? 'good' : 'bad'}>Contratto: {signed(last.contractDelta)}</p>
            {last.notes.length > 0 && (
              <ul>
                {last.notes.map((note, i) => (
                  <li key={i}>{describeNote(note, names)}</li>
                ))}
              </ul>
            )}
            <button type="button" className="btn primary" onClick={() => client.nextTrick()}>
              {view.trickNo >= view.tricksPerHand ? 'Vedi il risultato finale' : 'Presa successiva'}
            </button>
          </div>
        )}
      </section>

      {snap.handHidden && (
        <section className="pass-panel">
          <span className="hint">Mano privata</span>
          <h2>Passa il dispositivo a {current}</h2>
          <p>
            {view.plays.length === 0
              ? `${current} è primo di mano e può aprire con qualsiasi fazione.`
              : `Carte già sul tavolo: ${view.plays.length}. Fazione d’apertura: ${getFaction(view.leadFaction!).name}.`}{' '}
            Mostra la mano solo quando {current} ha il dispositivo.
          </p>
          <button type="button" className="btn primary" onClick={() => client.revealHand()}>
            Mostra la mia mano
          </button>
        </section>
      )}

      <div className="gamegrid">
        <section className="panel">
          <div className="hand-head">
            <div>
              <h2>{perspective === null ? 'Mano' : client.setup.mode === 'local' ? `${names[perspective]} — le tue carte` : 'Le tue carte'}</h2>
              <span className="hint">{handHint()}</span>
            </div>
            {perspective !== null && <strong>{view.hand.length} carte</strong>}
          </div>
          {perspective === null ? (
            <div className="hand-hidden">
              {trickOver ? 'Presa conclusa.' : 'La mano è coperta finché il giocatore di turno non la mostra.'}
            </div>
          ) : (
            <div className="hand">
              {sortHand(view.hand).map((id) => {
                const playable = snap.canPlay && legal.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`cardbtn${snap.canPlay ? (playable ? ' valid' : ' invalid') : ''}`}
                    disabled={!playable}
                    onClick={() => client.playCard(id)}
                    aria-label={`Gioca ${getCard(id).name}`}
                  >
                    <CardView cardId={id} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="sidebar">
          <section className="panel">
            <h3>{series ? 'Classifica della serie' : 'Classifica'}</h3>
            {matchRanking(match.totals).map((pi, i) => {
              const p = view.players[pi]!;
              return (
                <div key={pi} className={`score-row${pi === perspective ? ' me' : ''}`}>
                  <div>
                    <b>
                      {i + 1}. {p.name}
                    </b>
                    <div className="hint">
                      {plural(p.tricks, 'presa', 'prese')} · {p.handCount} in mano
                      {series && ` · questa mano ${signed(p.score)}`}
                      {p.nextModifier !== 0 && ` · prossima carta ${signed(p.nextModifier)}`}
                    </div>
                  </div>
                  <b>{match.totals[pi]} pt</b>
                </div>
              );
            })}
          </section>
          <section className="panel">
            <h3>Cronologia</h3>
            {view.history.length === 0 ? (
              <p className="hint">Nessuna presa completata.</p>
            ) : (
              <div className="log">
                {[...view.history].reverse().map((t) => (
                  <div key={t.trickNo} className="logitem">
                    <b>Presa {t.trickNo}</b> · {names[t.winner]}
                    <div className="hint">
                      {getCard(t.winningCardId).name} ({t.winningValue}) · {signed(t.contractDelta)} pt
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <button type="button" className="btn danger wide" onClick={exit}>
            Torna alla preparazione
          </button>
        </aside>
      </div>
    </main>
  );

  function handHint(): string {
    if (trickOver) return 'Presa conclusa.';
    if (snap.handHidden) return 'Mano coperta per la privacy.';
    if (!snap.canPlay) return `Attendi: tocca a ${current}.`;
    if (!view.leadFaction) return 'Sei primo di mano: puoi aprire con qualsiasi fazione.';
    const lead = getFaction(view.leadFaction).name;
    return view.hand.some((id) => getCard(id).faction === view.leadFaction)
      ? `Fazione d’apertura: ${lead}. Devi seguirla.`
      : `Fazione d’apertura: ${lead}. Non ce l’hai: puoi giocare qualsiasi carta.`;
  }
}
