import {
  POWERS,
  getCard,
  getContract,
  getFaction,
  hasPowerText,
  isPowerImplemented,
  leadPower,
  matchRanking,
  paymentFor,
  sortHand,
} from '@nexum/engine';
import type { CardId, Decision } from '@nexum/engine';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GameClient } from '../game/GameClient';
import { contractDescription, contractTitle, describeNote, describeScoring, describeTrick, plural, signed } from '../game/text';
import { useGame } from '../game/useGame';
import { EndScreen, HandEndScreen } from './EndScreen';
import { HandFan } from './HandFan';
import { ContractIcon } from './Icon';
import { TableView, initials } from './TableView';

interface Props {
  client: GameClient;
  rulesOpen: boolean;
  onRules(): void;
  onReplay(): void;
  onExit(): void;
  onMenu(): void;
}

export function GameScreen({ client, rulesOpen, onRules, onReplay, onExit, onMenu }: Props) {
  const snap = useGame(client);
  const { match, view, perspective } = snap;
  const [selected, setSelected] = useState<CardId | null>(null);
  // In basso siede chi ha il dispositivo; tra un turno e l'altro resta l'ultimo giocatore umano.
  const lastAnchor = useRef(Math.max(0, client.setup.seats.findIndex((s) => s.kind === 'human')));
  const anchor = perspective ?? (snap.handHidden ? view.turn : lastAnchor.current);
  useEffect(() => {
    lastAnchor.current = anchor;
  }, [anchor]);

  const names = view.players.map((p) => p.name);
  const me = client.setup.mode === 'solo' ? 0 : null;
  const series = match.hands.length > 1;

  if (match.phase === 'matchEnd') {
    return <EndScreen match={match} names={names} me={me} onReplay={onReplay} onExit={onExit} onMenu={onMenu} />;
  }
  if (match.phase === 'handEnd') {
    return <HandEndScreen match={match} names={names} me={me} onNext={() => client.nextHand()} onMenu={onMenu} />;
  }

  const trickOver = view.phase === 'trickEnd';
  const last = trickOver ? view.lastTrick : null;
  const plays = last ? last.plays : view.plays;
  const current = names[view.turn];
  const legal = new Set(view.legal);
  const hand = sortHand(view.hand);
  const sel = selected !== null && view.hand.includes(selected) ? selected : null;
  const lead = view.leadFaction ? getFaction(view.leadFaction) : null;
  // Vigil ha aperto la presa: chi segue deve giocare la sua carta più alta della fazione.
  const vigil = !trickOver && leadPower(view.plays) === 'vigil';
  const seat = view.players[anchor]!;

  // Primo tocco: la carta si alza e mostra il potere. Secondo tocco: si gioca.
  const pick = (id: CardId) => {
    if (id === sel && snap.canPlay && legal.has(id)) client.playCard(id);
    setSelected(id === sel ? null : id);
  };
  const play = (id: CardId, option = 0) => {
    client.playCard(id, option);
    setSelected(null);
  };
  const exit = () => {
    if (window.confirm('Abbandonare la partita in corso e tornare alla preparazione?')) onExit();
  };

  return (
    <main className="game">
      <section className="panel contract-head">
        <div>
          <span className="hint">{series ? `Contratto ${match.handIndex + 1} di ${match.hands.length}` : 'Contratto'}</span>
          <h2>
            <ContractIcon contract={getContract(view.contract)} /> {contractTitle(view)}{' '}
            <span className="pill">{describeScoring(getContract(view.contract))}</span>
          </h2>
          <p>{contractDescription(view)}</p>
        </div>
        <div className="contract-side">
          <div className="phase">
            <span className="hint">Presa</span>
            <strong>
              {view.trickNo} / {view.tricksPerHand}
            </strong>
          </div>
          <button type="button" className="btn small" aria-expanded={rulesOpen} onClick={onRules}>
            Regole
          </button>
        </div>
      </section>

      <div className="gamegrid">
        <div className={`board${sel ? ' picking' : ''}${last || snap.handHidden ? '' : ' slim'}`}>
          <TableView
            view={view}
            names={names}
            totals={match.totals}
            anchor={anchor}
            plays={plays}
            winner={last ? last.winner : null}
          />

          <div className="table-status" aria-live="polite">
            {last ? (
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
                {view.decision ? (
                  reversalChoice(view.decision)
                ) : (
                  <button type="button" className="btn primary" onClick={() => client.nextTrick()}>
                    {view.trickNo >= view.tricksPerHand ? 'Vedi il risultato finale' : 'Presa successiva'}
                  </button>
                )}
              </div>
            ) : snap.handHidden ? (
              <section className="pass-panel">
                <span className="hint">Mano privata</span>
                <h2>Passa il dispositivo a {current}</h2>
                <p>
                  {view.plays.length === 0
                    ? `${current} è primo di mano e può aprire con qualsiasi fazione.`
                    : `Carte già sul tavolo: ${view.plays.length}. Fazione d’apertura: ${lead!.name}.`}{' '}
                  Mostra la mano solo quando {current} ha il dispositivo.
                </p>
                <button type="button" className="btn primary" onClick={() => client.revealHand()}>
                  Mostra la mia mano
                </button>
              </section>
            ) : (
              <>
                <span className={`turn-pill${snap.canPlay ? ' mine' : ''}`}>
                  {lead && <span className="dot" style={{ '--faction': lead.color } as CSSProperties} />}
                  {turnTitle()}
                </span>
                <span className="hint">{turnHint()}</span>
              </>
            )}
          </div>

          <div className="hand-area">
            <div className="hand-head">
              <span className="chip me-chip">
                <span className="seat-avatar">{initials(names[anchor]!)}</span>
                <span>
                  <b>{names[anchor]}</b> · {match.totals[anchor]} pt · {plural(seat.tricks, 'presa', 'prese')} ·{' '}
                  {plural(seat.handCount, 'carta', 'carte')}
                  {seat.nextModifier !== 0 && ` · prossima carta ${signed(seat.nextModifier)}`}
                </span>
              </span>
              {perspective !== null && !trickOver && (
                <span className="hint">Scegli una carta per leggerne il potere, sceglila di nuovo per giocarla.</span>
              )}
            </div>
            <HandFan
              cards={perspective === null ? [] : hand}
              hiddenCount={seat.handCount}
              legal={legal}
              canPlay={snap.canPlay}
              selected={sel}
              onPick={pick}
              onClear={() => setSelected(null)}
            >
              {sel && cardDetail(sel)}
            </HandFan>
          </div>
        </div>

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

  function turnTitle(): string {
    if (!snap.canPlay) return `Tocca a ${current}`;
    if (!lead) return 'Tocca a te · apri tu';
    if (!view.hand.some((id) => getCard(id).faction === view.leadFaction)) return `Tocca a te · non hai ${lead.name}`;
    return vigil ? `Tocca a te · la tua ${lead.name} più alta` : `Tocca a te · segui ${lead.name}`;
  }

  function turnHint(): string {
    if (!snap.canPlay) {
      if (!lead) return `${current} è primo di mano.`;
      return vigil ? `Vigil ha aperto la presa: chi ha ${lead.name} deve giocare la sua carta più alta.` : `Fazione d’apertura: ${lead.name}.`;
    }
    if (!lead) return 'Sei primo di mano: puoi aprire con qualsiasi fazione.';
    if (!view.hand.some((id) => getCard(id).faction === view.leadFaction)) {
      return 'Puoi giocare qualsiasi carta, ma solo la fazione d’apertura può prendere.';
    }
    return vigil
      ? 'Vigil ha aperto la presa: devi giocare la tua carta più alta della fazione d’apertura.'
      : 'Devi giocare una carta della fazione d’apertura: sono quelle sollevate.';
  }

  /** Reversal: chi l'ha catturata decide se annullare i punti nati dalla presa. */
  function reversalChoice(d: Decision) {
    const mine = d.player === perspective;
    const changes = d.deltas
      .map((x, i) => (x ? `${i === perspective ? 'tu' : names[i]} ${signed(x)}` : null))
      .filter(Boolean)
      .join(' · ');
    return (
      <div className="decision">
        <p>
          <b>{mine ? 'Hai catturato' : `${names[d.player]} ha catturato`} {getCard(d.cardId).name}:</b>{' '}
          {mine ? 'puoi' : 'può'} annullare i punti nati da questa presa ({changes}).
        </p>
        {snap.canDecide ? (
          <div className="controls">
            <button type="button" className="btn primary" onClick={() => client.decide(true)}>
              Annulla i punti
            </button>
            <button type="button" className="btn" onClick={() => client.decide(false)}>
              Tienili
            </button>
            {!mine && <span className="hint decision-who">Decide {names[d.player]}.</span>}
          </div>
        ) : (
          <p className="hint">{names[d.player]} sta decidendo…</p>
        )}
      </div>
    );
  }

  function cardDetail(cardId: CardId) {
    const card = getCard(cardId);
    const faction = getFaction(card.faction);
    const playable = snap.canPlay && legal.has(cardId);
    // Fury e Ashen (anche copiate da Palimpsest): si possono pagare con punti Contratto.
    const payment = paymentFor(view.plays, card);
    const modifier = perspective === null ? 0 : view.players[perspective]!.nextModifier;
    const paidValue = (times: number) =>
      payment?.power === 'fury' ? 75 : Math.min(100, Math.max(0, card.value + modifier + 20 * times));
    return (
      <div className="card-detail" aria-live="polite">
        <div className="card-detail-head">
          <span className="dot" style={{ '--faction': faction.color } as CSSProperties} />
          <b>{card.name}</b>
          <span className="hint">
            {faction.name} · {card.value}
          </span>
        </div>
        <p>
          {card.effect || 'Nessun potere.'}
          {hasPowerText(card) && !isPowerImplemented(card) && <em> Potere non ancora attivo.</em>}
        </p>
        {isPowerImplemented(card) && <p className="card-rule">Regola: {POWERS[card.power!]!.summary}.</p>}
        {playable ? (
          <>
            <button type="button" className="btn primary" onClick={() => play(cardId)}>
              Gioca {card.name}
            </button>
            {payment &&
              Array.from({ length: payment.maxTimes }, (_, i) => i + 1).map((times) => (
                <button key={times} type="button" className="btn pay" onClick={() => play(cardId, times)}>
                  Paga {plural(times * payment.costPerTime, 'punto', 'punti')}: vale {paidValue(times)}
                </button>
              ))}
          </>
        ) : (
          <span className="hint">
            {!snap.canPlay
              ? 'Potrai giocarla quando tocca a te.'
              : vigil && card.faction === view.leadFaction
                ? `Non puoi giocarla: Vigil ti obbliga a giocare la tua ${lead!.name} più alta.`
                : `Non puoi giocarla: devi seguire ${lead!.name}.`}
          </span>
        )}
        <button type="button" className="btn small" onClick={() => setSelected(null)}>
          Chiudi
        </button>
      </div>
    );
  }
}
