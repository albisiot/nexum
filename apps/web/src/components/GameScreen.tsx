import {
  POWERS,
  dominoStartValue,
  getCard,
  getContract,
  getFaction,
  hasPowerText,
  isPowerImplemented,
  leadPower,
  matchRanking,
  playChoice,
  sortHand,
} from '@nexum/engine';
import type { CardId, Decision } from '@nexum/engine';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GameClient } from '../game/GameClient';
import { contractDescription, contractTitle, describeNote, describeScoring, describeTrick, plural, signed } from '../game/text';
import { useGame } from '../game/useGame';
import { askConfirm } from './ConfirmDialog';
import { EndScreen, HandEndScreen } from './EndScreen';
import { HandFan } from './HandFan';
import { DominoBoard } from './DominoBoard';
import { ContractIcon } from './Icon';
import { Select } from './Select';
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
  // Archivist: il valore scelto; Mnemos: la carta da prendere; pass-and-play: la decisione già mostrata.
  const [borrow, setBorrow] = useState<number | null>(null);
  const [take, setTake] = useState<CardId | null>(null);
  const [shownDecision, setShownDecision] = useState<string | null>(null);
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
  // Oblivion: a inizio turno si scarta una carta, poi si gioca.
  const discardable = new Set(view.discardable);
  const hand = sortHand(view.hand);
  const sel = selected !== null && view.hand.includes(selected) ? selected : null;
  const lead = view.leadFaction ? getFaction(view.leadFaction) : null;
  // Vigil ha aperto la presa: chi segue deve giocare la sua carta più alta della fazione.
  const vigil = !trickOver && leadPower(view.plays) === 'vigil';
  const seat = view.players[anchor]!;
  const domino = view.domino;
  const placed = domino ? Object.values(domino.table).reduce((t, line) => t + line.high - line.low + 1, 0) : 0;

  // Primo tocco: la carta si alza e mostra il potere. Secondo tocco: si gioca.
  const pick = (id: CardId) => {
    if (id === sel && snap.canPlay && legal.has(id)) client.playCard(id);
    if (id === sel && snap.canDiscard && discardable.has(id)) client.discard(id);
    setSelected(id === sel ? null : id);
  };
  const discard = (id: CardId) => {
    client.discard(id);
    setSelected(null);
  };
  const play = (id: CardId, option = 0) => {
    client.playCard(id, option);
    setSelected(null);
  };
  const exit = () => {
    void askConfirm({
      title: 'Abbandonare la partita?',
      text: 'Torni alla preparazione e la partita in corso va persa.',
      confirm: 'Abbandona',
      cancel: 'Continua a giocare',
      danger: true,
    }).then((ok) => {
      if (ok) onExit();
    });
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
            {domino ? (
              <>
                <span className="hint">In tavola</span>
                <strong>
                  {placed} / {view.factions.length * 13}
                </strong>
              </>
            ) : (
              <>
                <span className="hint">Presa</span>
                <strong>
                  {view.trickNo} / {view.tricksPerHand}
                </strong>
              </>
            )}
          </div>
          <button type="button" className="btn small" aria-expanded={rulesOpen} onClick={onRules}>
            Regole
          </button>
        </div>
      </section>

      <div className="gamegrid">
        <div className={`board${sel ? ' picking' : ''}${last || snap.handHidden || view.decision ? '' : ' slim'}`}>
          {domino ? (
            <DominoBoard domino={domino} factions={view.factions} players={view.players} names={names} turn={view.turn} />
          ) : (
            <TableView
              view={view}
              names={names}
              totals={match.totals}
              anchor={anchor}
              plays={plays}
              winner={last ? last.winner : null}
            />
          )}

          <div className="table-status" aria-live="polite">
            {last ? (
              <div className="result">
                <p>
                  <b>{describeTrick(last, names)}</b>
                </p>
                {view.decision?.kind === 'recover' ? (
                  <p className="hint">I punti del Contratto si contano dopo il recupero.</p>
                ) : (
                  <p className={last.contractDelta >= 0 ? 'good' : 'bad'}>Contratto: {signed(last.contractDelta)}</p>
                )}
                {last.notes.length > 0 && (
                  <ul>
                    {last.notes.map((note, i) => (
                      <li key={i}>{describeNote(note, names)}</li>
                    ))}
                  </ul>
                )}
                {view.decision ? (
                  decisionBox(view.decision)
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
                  {domino
                    ? `Carte in tavola: ${placed}.`
                    : view.plays.length === 0
                      ? `${current} è primo di mano e apre la presa.`
                      : `Carte già sul tavolo: ${view.plays.length}. Fazione d’apertura: ${lead!.name}.`}{' '}
                  Mostra la mano solo quando {current} ha il dispositivo.
                </p>
                <button type="button" className="btn primary" onClick={() => client.revealHand()}>
                  Mostra la mia mano
                </button>
              </section>
            ) : view.decision?.kind === 'trump' ? (
              <div className="result">{decisionBox(view.decision)}</div>
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
                  <b>{names[anchor]}</b> · {match.totals[anchor]} pt · {!domino && <>{plural(seat.tricks, 'presa', 'prese')} · </>}
                  {plural(seat.handCount, 'carta', 'carte')}
                  {seat.nextModifier !== 0 && ` · prossima carta ${signed(seat.nextModifier)}`}
                  {seat.protectedNext && ' · prossima carta protetta'}
                  {seat.mustDiscard > 0 && ' · prima di giocare scarti una carta'}
                </span>
              </span>
              {perspective !== null && !trickOver && (
                <span className="hint">
                  {snap.canDiscard
                    ? 'Scegli la carta da scartare, poi sceglila di nuovo per scartarla.'
                    : 'Scegli una carta per leggerne il potere, sceglila di nuovo per giocarla.'}
                </span>
              )}
            </div>
            {view.seen.length > 0 && <p className="seen-box">{seenText()}</p>}
            <HandFan
              cards={perspective === null ? [] : hand}
              hiddenCount={seat.handCount}
              legal={snap.canDiscard ? discardable : legal}
              canPlay={snap.canPlay || snap.canDiscard}
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
                      {!domino && <>{plural(p.tricks, 'presa', 'prese')} · </>}
                      {p.handCount} in mano
                      {series && ` · questa mano ${signed(p.score)}`}
                      {p.nextModifier !== 0 && ` · prossima carta ${signed(p.nextModifier)}`}
                    </div>
                  </div>
                  <b>{match.totals[pi]} pt</b>
                </div>
              );
            })}
          </section>
          {!domino && (
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
          )}
          <button type="button" className="btn danger wide" onClick={exit}>
            Torna alla preparazione
          </button>
        </aside>
      </div>
    </main>
  );

  /** Second Sight, The Witness: le carte avversarie viste e ancora in mano a loro. */
  function seenText(): string {
    const byPlayer = [...new Set(view.seen.map((x) => x.player))].map((p) => {
      const cards = view.seen.filter((x) => x.player === p).map((x) => `${getCard(x.cardId).name} (${getCard(x.cardId).value})`);
      return `${names[p]}: ${cards.join(', ')}`;
    });
    return `Hai visto · ${byPlayer.join(' · ')}`;
  }

  function turnTitle(): string {
    if (snap.canDiscard) return 'Tocca a te · prima scarta una carta';
    if (domino) return snap.canPlay ? 'Tocca a te · attacca una carta' : `Tocca a ${current}`;
    if (!snap.canPlay) return `Tocca a ${current}`;
    if (!lead) return 'Tocca a te · apri tu';
    if (!view.hand.some((id) => getCard(id).faction === view.leadFaction)) return `Tocca a te · non hai ${lead.name}`;
    return vigil ? `Tocca a te · la tua ${lead.name} più alta` : `Tocca a te · segui ${lead.name}`;
  }

  function turnHint(): string {
    if (snap.canDiscard) return 'Oblivion: scegli la carta da scartare, poi giochi. Faded One non si scarta.';
    if (domino) {
      const passed = domino.passed.map((p) => names[p]).join(', ');
      const start = dominoStartValue(view.factions[0]!);
      return `${passed ? `Passa: ${passed}. ` : ''}Si gioca un ${start} o una carta vicina a quelle in tavola della stessa fazione.`;
    }
    if (!snap.canPlay) {
      if (!lead) return `${current} è primo di mano.`;
      return vigil ? `Vigil ha aperto la presa: chi ha ${lead.name} deve giocare la sua carta più alta.` : `Fazione d’apertura: ${lead.name}.`;
    }
    if (!lead) {
      return legal.size < view.hand.length
        ? 'Sei primo di mano: non puoi aprire con la fazione che nessuno ha ancora giocato.'
        : 'Sei primo di mano: puoi aprire con qualsiasi fazione.';
    }
    if (!view.hand.some((id) => getCard(id).faction === view.leadFaction)) {
      if (legal.size < view.hand.length) return 'Alla prima presa non puoi scartare le carte che fanno penalità: gioca una di quelle sollevate.';
      if (view.trump) return `Puoi giocare qualsiasi carta: la briscola ${getFaction(view.trump).name} batte la fazione d’apertura.`;
      return 'Puoi giocare qualsiasi carta, ma solo la fazione d’apertura può prendere.';
    }
    return vigil
      ? 'Vigil ha aperto la presa: devi giocare la tua carta più alta della fazione d’apertura.'
      : 'Devi giocare una carta della fazione d’apertura: sono quelle sollevate.';
  }

  /** Le decisioni di fine presa: Reversal, l'avversario da colpire, il recupero di una carta. */
  function decisionBox(d: Decision) {
    const mine = d.player === perspective;
    const who = mine ? 'Tu' : names[d.player]!;
    const waiting = <p className="hint">{names[d.player]} sta decidendo…</p>;
    const deciderNote = !mine && <span className="hint decision-who">Decide {names[d.player]}.</span>;

    if (d.kind === 'trump') {
      return (
        <div className="decision">
          <p>
            <b>Briscola:</b> {mine ? 'scegli' : `${who} sceglie`} la fazione che batte la fazione d’apertura.
          </p>
          {snap.canDecide ? (
            <div className="controls">
              {d.options.map((f) => (
                <button key={f} type="button" className="btn" onClick={() => client.decide({ accept: true, faction: f })}>
                  <span className="dot" style={{ '--faction': getFaction(f).color } as CSSProperties} />
                  {getFaction(f).name}
                </button>
              ))}
            </div>
          ) : (
            waiting
          )}
        </div>
      );
    }

    const cardName = getCard(d.cardId).name;

    if (d.kind === 'reversal') {
      const changes = d.deltas
        .map((x, i) => (x ? `${i === perspective ? 'tu' : names[i]} ${signed(x)}` : null))
        .filter(Boolean)
        .join(' · ');
      return (
        <div className="decision">
          <p>
            <b>{mine ? 'Hai catturato' : `${who} ha catturato`} {cardName}:</b> {mine ? 'puoi' : 'può'} annullare i punti nati
            da questa presa ({changes}).
          </p>
          {snap.canDecide ? (
            <div className="controls">
              <button type="button" className="btn primary" onClick={() => client.decide({ accept: true })}>
                Annulla i punti
              </button>
              <button type="button" className="btn" onClick={() => client.decide({ accept: false })}>
                Tienili
              </button>
              {deciderNote}
            </div>
          ) : (
            waiting
          )}
        </div>
      );
    }

    if (d.kind === 'target') {
      const effect =
        d.power === 'vesper-null' ? 'avrà −15 sulla prossima carta' : d.power === 'ravager' ? 'perde 1 punto' : 'salta la prossima presa';
      return (
        <div className="decision">
          <p>
            <b>{cardName}:</b> {mine ? 'scegli' : `${who} sceglie`} l’avversario che {effect}.
          </p>
          {snap.canDecide ? (
            <div className="controls">
              {d.options.map((i) => (
                <button key={i} type="button" className="btn" onClick={() => client.decide({ accept: true, target: i })}>
                  {names[i]} · {match.totals[i]} pt
                </button>
              ))}
              {deciderNote}
            </div>
          ) : (
            waiting
          )}
        </div>
      );
    }

    // Recupero (Black Echo, Echo Prime, Mnemos): si sceglie la carta da scartare dalla propria mano.
    const mnemos = d.power === 'mnemos';
    const takeId = take !== null && d.take.includes(take) ? take : d.take[0]!;
    const takeName = `${getCard(takeId).name} (${getCard(takeId).value})`;
    const key = `${view.trickNo}-${d.cardId}`;
    // In pass-and-play la mano di chi decide si mostra solo quando ha il dispositivo.
    const hidden = client.setup.mode === 'local' && shownDecision !== key;
    return (
      <div className="decision">
        <p>
          <b>{cardName}:</b>{' '}
          {mnemos
            ? `${mine ? 'puoi' : `${who} può`} prendere in mano una carta catturata di valore 20 o meno, scartandone una ${mine ? 'tua' : 'sua'}.`
            : `${mine ? 'puoi' : `${who} può`} riprenderla in mano, scartando un’altra carta.`}
        </p>
        {!snap.canDecide ? (
          waiting
        ) : hidden ? (
          <div className="controls">
            <button type="button" className="btn primary" onClick={() => setShownDecision(key)}>
              Mostra le carte di {names[d.player]}
            </button>
            <button type="button" className="btn" onClick={() => client.decide({ accept: false })}>
              Lascia stare
            </button>
          </div>
        ) : (
          <>
            {mnemos && d.take.length > 1 && (
              <div className="controls">
                {d.take.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`btn small${id === takeId ? ' chosen' : ''}`}
                    aria-pressed={id === takeId}
                    onClick={() => setTake(id)}
                  >
                    Prendi {getCard(id).name} ({getCard(id).value})
                  </button>
                ))}
              </div>
            )}
            <p className="hint">
              {mnemos ? `Prendi ${takeName}: quale carta scarti?` : `Riprendi ${takeName}: quale carta scarti?`}
            </p>
            <div className="controls">
              {snap.decisionHand.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="btn small"
                  onClick={() => client.decide({ accept: true, take: takeId, discard: id })}
                >
                  Scarta {getCard(id).name} ({getCard(id).value})
                </button>
              ))}
              <button type="button" className="btn small" onClick={() => client.decide({ accept: false })}>
                Lascia stare
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  function cardDetail(cardId: CardId) {
    const card = getCard(cardId);
    const faction = getFaction(card.faction);
    const playable = snap.canPlay && legal.has(cardId);
    // Fury, Ashen, Shift e Archivist (anche copiate da Palimpsest): una scelta quando la giochi.
    const choice = domino ? null : playChoice(view, card);
    const modifier = perspective === null ? 0 : view.players[perspective]!.nextModifier;
    const clampValue = (v: number) => Math.min(100, Math.max(0, v));
    const base = clampValue(card.value + modifier);
    const borrowed = choice?.kind === 'borrow' ? (borrow !== null && choice.values.includes(borrow) ? borrow : choice.values[0]!) : 0;

    let actions;
    if (snap.canDiscard) {
      actions = discardable.has(cardId) ? (
        <button type="button" className="btn primary" onClick={() => discard(cardId)}>
          Scarta {card.name}
        </button>
      ) : (
        <span className="hint">Faded One non si può scartare.</span>
      );
    } else if (!playable) {
      actions = (
        <span className="hint">
          {!snap.canPlay
            ? 'Potrai giocarla quando tocca a te.'
            : domino
              ? 'Non puoi giocarla: non è vicina alle carte in tavola.'
              : !lead
                ? 'Non puoi aprire con questa fazione: nessuno l’ha ancora giocata.'
                : vigil && card.faction === view.leadFaction
                  ? `Non puoi giocarla: Vigil ti obbliga a giocare la tua ${lead.name} più alta.`
                  : view.hand.some((id) => getCard(id).faction === view.leadFaction)
                    ? `Non puoi giocarla: devi seguire ${lead.name}.`
                    : 'Non puoi giocarla: alla prima presa non si scartano carte che fanno penalità.'}
        </span>
      );
    } else if (choice?.kind === 'shift') {
      actions = (
        <>
          <button type="button" className="btn primary" onClick={() => play(cardId, 0)}>
            Gioca a {clampValue(base + 15)} (+15)
          </button>
          <button type="button" className="btn pay" onClick={() => play(cardId, 1)}>
            Gioca a {clampValue(base - 15)} (−15)
          </button>
        </>
      );
    } else if (choice?.kind === 'borrow') {
      actions = (
        <>
          <button type="button" className="btn primary" onClick={() => play(cardId)}>
            Gioca {card.name} ({base})
          </button>
          <label className="borrow">
            <span className="hint">Valore di una carta già giocata o scartata</span>
            <Select
              value={String(borrowed)}
              options={choice.values.map((v) => ({ value: String(v), label: String(v) }))}
              onChange={(v) => setBorrow(Number(v))}
            />
          </label>
          <button type="button" className="btn pay" onClick={() => play(cardId, borrowed)}>
            Gioca a {borrowed}
          </button>
        </>
      );
    } else {
      actions = (
        <>
          <button type="button" className="btn primary" onClick={() => play(cardId)}>
            Gioca {card.name}
          </button>
          {choice?.kind === 'pay' &&
            Array.from({ length: choice.maxTimes }, (_, i) => i + 1).map((times) => (
              <button key={times} type="button" className="btn pay" onClick={() => play(cardId, times)}>
                Paga {plural(times * choice.costPerTime, 'punto', 'punti')}: vale{' '}
                {choice.power === 'fury' ? 75 : clampValue(base + 20 * times)}
              </button>
            ))}
        </>
      );
    }

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
        {actions}
        <button type="button" className="btn small" onClick={() => setSelected(null)}>
          Chiudi
        </button>
      </div>
    );
  }
}
