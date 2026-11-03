import {
  POWERS,
  contractNeedsTarget,
  dominoStartValue,
  getCard,
  getContract,
  getFaction,
  hasPowerText,
  isPowerImplemented,
  leadPower,
  matchRewards,
  playChoice,
  sortHand,
} from '@nexum/engine';
import type { CardId, Decision, PlayerView } from '@nexum/engine';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GameClient } from '../game/GameClient';
import { contractDescription, contractTitle, describeNote, describeTrick, plural, signed } from '../game/text';
import { useGame } from '../game/useGame';
import { profileStore } from '../shop/profile';
import { playSound, vibrate } from '../game/feedback';
import { handFresh } from '../game/intro';
import { askConfirm } from './ConfirmDialog';
import { ContractIntro, useContractIntro } from './ContractIntro';
import type { IntroPhase } from './ContractIntro';
import { EndScreen, HandEndScreen } from './EndScreen';
import { HandFan } from './HandFan';
import { DominoBoard } from './DominoBoard';
import { GameMenu } from './GameMenu';
import { ContractIcon, Icon } from './Icon';
import { InfoPanel, SIDEBAR_QUERY, Standings, TrickLog } from './InfoPanel';
import type { InfoTab } from './InfoPanel';
import { Select } from './Select';
import { Sheet } from './Sheet';
import { TableView, initials } from './TableView';

interface Props {
  client: GameClient;
  /** Apre la finestra Regole. */
  onRules(): void;
  /** Assente online: lì il tempo del turno scorre anche durante il tutorial. */
  onTutorial?: () => void;
  onReplay?: () => void;
  onExit(): void;
  onMenu(): void;
}

/** Online: negli ultimi secondi del proprio turno ricorda che poi gioca la CPU. */
function TurnClock({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  if (left > 20) return null;
  return <p className="status warn">Ancora {plural(left, 'secondo', 'secondi')}, poi la CPU gioca al posto tuo.</p>;
}

/** Suoni e vibrazione per ciò che succede al tavolo. `bottom` è il posto disegnato in basso: le sue prese suonano diverse. */
function useTableFeedback(view: PlayerView, bottom: number, canPlay: boolean, intro: IntroPhase | null) {
  const last = view.phase === 'trickEnd' ? view.lastTrick : null;
  const count = (last ? last.plays : view.plays).length;
  const seen = useRef({ trick: view.trickNo, count });
  useEffect(() => {
    const before = seen.current;
    seen.current = { trick: view.trickNo, count };
    if (count > (before.trick === view.trickNo ? before.count : 0)) playSound('card');
  }, [view.trickNo, count]);

  // Quando la carta vincente si è alzata.
  const winner = last?.winner ?? null;
  useEffect(() => {
    if (winner === null) return;
    const timer = setTimeout(() => playSound(winner === bottom ? 'takeMine' : 'take'), 650);
    return () => clearTimeout(timer);
  }, [view.trickNo, winner, bottom]);

  const myTurn = canPlay && intro === null;
  useEffect(() => {
    if (!myTurn) return;
    playSound('turn');
    vibrate(40);
  }, [myTurn]);

  useEffect(() => {
    if (intro) playSound(intro === 'show' ? 'intro' : 'deal');
  }, [intro]);
}

export function GameScreen({ client, onRules, onTutorial, onReplay, onExit, onMenu }: Props) {
  const snap = useGame(client);
  const { match, view, perspective } = snap;
  const [selected, setSelected] = useState<CardId | null>(null);
  // Archivist: il valore scelto; Mnemos: la carta da prendere; pass-and-play: la decisione già mostrata.
  const [borrow, setBorrow] = useState<number | null>(null);
  const [take, setTake] = useState<CardId | null>(null);
  const [shownDecision, setShownDecision] = useState<string | null>(null);
  // Le finestre della barra in alto: Info (con la scheda aperta) e il menu ☰.
  const [info, setInfo] = useState<InfoTab | null>(null);
  const [menu, setMenu] = useState(false);
  // In basso siede chi ha il dispositivo; tra un turno e l'altro resta l'ultimo giocatore umano.
  const lastAnchor = useRef(Math.max(0, client.setup.seats.findIndex((s) => s.kind === 'human')));
  const anchor = perspective ?? (snap.handHidden ? view.turn : lastAnchor.current);
  useEffect(() => {
    lastAnchor.current = anchor;
  }, [anchor]);

  const names = view.players.map((p) => p.name);
  const me = client.setup.mode === 'local' ? null : perspective;
  const series = match.hands.length > 1;
  const intro = useContractIntro(client, match.handIndex, match.phase === 'playing' && handFresh(view));
  useTableFeedback(view, anchor, snap.canPlay || snap.canDiscard, intro.phase);

  // Le monete: si incassano appena un Contratto o la partita è vinta, una volta sola anche rientrando.
  const rewards = me === null ? [] : matchRewards(match, me);
  const rewardKeys = rewards.map((r) => `${r.key}=${r.amount}`).join();
  const seed = client.setup.seed;
  useEffect(() => {
    if (me === null) return;
    for (const r of matchRewards(match, me)) profileStore.award(`${seed}:${r.key}`, r.amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, rewardKeys]);
  const coins = rewards.filter((r) => r.handIndex === match.completed.length - 1).reduce((t, r) => t + r.amount, 0);

  if (match.phase === 'matchEnd') {
    return <EndScreen match={match} names={names} me={me} coins={coins} onReplay={onReplay} onExit={onExit} onMenu={onMenu} />;
  }
  if (match.phase === 'handEnd') {
    return <HandEndScreen match={match} names={names} me={me} coins={coins} onNext={() => client.nextHand()} onMenu={onMenu} leaveNote={client.leaveNote} />;
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
    void askConfirm(
      client.leaveNote
        ? { title: 'Uscire dalla partita?', text: client.leaveNote, confirm: 'Esci', cancel: 'Continua a giocare', danger: true }
        : {
            title: 'Abbandonare la partita?',
            text: 'Torni alla preparazione e la partita in corso va persa.',
            confirm: 'Abbandona',
            cancel: 'Continua a giocare',
            danger: true,
          },
    ).then((ok) => {
      if (ok) onExit();
    });
  };

  // Durante la presentazione e la distribuzione non si tocca niente.
  const busy = intro.phase !== null;
  // Pass-and-play: tra un turno e l'altro lo schermo intero copre tutto, mano compresa.
  const passing = snap.handHidden && !last && !busy;
  const contract = getContract(view.contract);
  const target = contractNeedsTarget(contract) && view.targetFaction ? getFaction(view.targetFaction) : null;
  const trump = view.trump ? getFaction(view.trump) : null;
  // Sui computer grandi classifica e prese sono già accanto al tavolo: Info si apre sul Contratto.
  const openInfo = (tab?: InfoTab) => setInfo(tab ?? (matchMedia(SIDEBAR_QUERY).matches ? 'contratto' : 'classifica'));

  return (
    <main className={`game${intro.phase ? ` intro-${intro.phase}` : ''}`}>
      <header className="game-bar">
        <button
          type="button"
          className="bar-contract"
          aria-haspopup="dialog"
          aria-label={`${series ? `Contratto ${match.handIndex + 1} di ${match.hands.length}` : 'Contratto'}: ${contractDescription(view)} Apri i dettagli.`}
          onClick={() => openInfo('contratto')}
        >
          <ContractIcon contract={contract} size={20} />
          <b className="bar-contract-name">{contractTitle(view)}</b>
          {series && (
            <span className="bar-series">
              {match.handIndex + 1}/{match.hands.length}
            </span>
          )}
          {target && (
            <span className="bar-faction">
              <span className="dot" style={{ '--faction': target.color } as CSSProperties} />
              <span className="bar-faction-name">{target.name}</span>
            </span>
          )}
          {trump && (
            <span className="bar-faction">
              <span className="dot" style={{ '--faction': trump.color } as CSSProperties} />
              <span className="bar-faction-name">Briscola {trump.name}</span>
            </span>
          )}
        </button>
        <span className="bar-count">
          <span>{domino ? 'In tavola' : 'Presa'}</span>
          <b>{domino ? `${placed}/${view.factions.length * 13}` : `${view.trickNo}/${view.tricksPerHand}`}</b>
        </span>
        <button type="button" className="btn small bar-info" aria-haspopup="dialog" onClick={() => openInfo()}>
          <Icon name="info" size={18} />
          Info
        </button>
        <button type="button" className="btn small icon-toggle" aria-label="Menu" aria-haspopup="dialog" onClick={() => setMenu(true)}>
          <Icon name="menu" size={20} />
        </button>
      </header>

      <div className="game-body" inert={busy}>
        <div className={`board${sel ? ' picking' : ''}`}>
          <div className="table-area">
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
                intro={intro.phase}
                // Con un recupero in sospeso i punti si contano dopo.
                gain={last && view.decision?.kind !== 'recover' ? last.contractDelta : null}
              />
            )}

            {/* Esito della presa e decisioni: in alto sul tavolo, la mano resta libera. */}
            <div className="table-overlay" aria-live="polite">
              {snap.notice && <p className="status warn">{snap.notice}</p>}
              {snap.turnDeadline && !snap.notice && <TurnClock key={snap.turnDeadline} deadline={snap.turnDeadline} />}
              {last ? (
                <div className="result">
                  <p>
                    <b>{describeTrick(last, names)}</b>
                  </p>
                  {last.notes.length > 0 && (
                    <ul>
                      {last.notes.map((note, i) => (
                        <li key={i}>{describeNote(note, names)}</li>
                      ))}
                    </ul>
                  )}
                  <div className="result-next">
                    {view.decision?.kind === 'recover' ? (
                      <p className="hint">I punti del Contratto si contano dopo il recupero.</p>
                    ) : (
                      <p className={last.contractDelta >= 0 ? 'good' : 'bad'}>Contratto: {signed(last.contractDelta)}</p>
                    )}
                    {!view.decision && (
                      <button type="button" className="btn primary" onClick={() => client.nextTrick()}>
                        {view.trickNo >= view.tricksPerHand ? 'Vedi il risultato finale' : 'Presa successiva'}
                      </button>
                    )}
                  </div>
                  {client.setup.mode === 'online' && !view.decision && <span className="hint">Si prosegue da soli tra pochi secondi.</span>}
                  {view.decision && decisionBox(view.decision)}
                </div>
              ) : (
                !snap.handHidden && view.decision?.kind === 'trump' && <div className="result">{decisionBox(view.decision)}</div>
              )}
            </div>
          </div>

          <div className="hand-area">
            {/* A fine presa turno e suggerimento restano al loro posto, nascosti: il tavolo non si sposta. */}
            <div className="hand-head">
              <span className={`turn-pill${snap.canPlay || snap.canDiscard ? ' mine' : ''}${last ? ' idle' : ''}`} aria-hidden={!!last}>
                {lead && <span className="dot" style={{ '--faction': lead.color } as CSSProperties} />}
                {turnTitle()}
              </span>
              <span className="chip me-chip">
                <span className="seat-avatar">{initials(names[anchor]!)}</span>
                <span>
                  <span className="me-name">
                    <b>{names[anchor]}</b> ·{' '}
                  </span>
                  {match.totals[anchor]} pt
                  {!domino && <> · {plural(seat.tricks, 'presa', 'prese')}</>}
                  {seat.nextModifier !== 0 && ` · prossima carta ${signed(seat.nextModifier)}`}
                  {seat.protectedNext && ' · prossima carta protetta'}
                  {seat.mustDiscard > 0 && ' · prima di giocare scarti una carta'}
                </span>
              </span>
            </div>
            <p className="hint hand-hint">
              {!last && turnHint()}
              {!last && perspective !== null && (snap.canPlay || snap.canDiscard) && (
                <span className="pick-hint">
                  {' '}
                  {snap.canDiscard
                    ? 'Scegli la carta da scartare, poi sceglila di nuovo per scartarla.'
                    : 'Scegli una carta per leggerne il potere, sceglila di nuovo per giocarla.'}
                </span>
              )}
            </p>
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

        {/* Sui computer grandi classifica e prese restano accanto al tavolo; altrove si aprono da Info. */}
        <aside className="sidebar" aria-label="Classifica e prese">
          <section className="panel side-standings">
            <h3>{series ? 'Classifica della serie' : 'Classifica'}</h3>
            <Standings match={match} view={view} perspective={perspective} />
          </section>
          {!domino && (
            <section className="panel side-log">
              <h3>Prese</h3>
              <TrickLog history={view.history} names={names} />
            </section>
          )}
        </aside>
      </div>

      {passing && (
        <Sheet className="pass-sheet" label="Passa il dispositivo">
          <div className="pass-screen">
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
            <button type="button" className="btn primary" autoFocus onClick={() => client.revealHand()}>
              Mostra la mia mano
            </button>
            <button type="button" className="btn small danger" onClick={exit}>
              Esci dalla partita
            </button>
          </div>
        </Sheet>
      )}

      {info && (
        <InfoPanel
          tab={info}
          names={names}
          match={match}
          view={view}
          perspective={perspective}
          onTab={setInfo}
          onClose={() => setInfo(null)}
          onTutorial={onTutorial}
        />
      )}

      {menu && (
        <GameMenu
          onClose={() => setMenu(false)}
          onRules={() => {
            setMenu(false);
            onRules();
          }}
          onExit={() => {
            setMenu(false);
            exit();
          }}
        />
      )}

      {intro.phase === 'show' && (
        <ContractIntro
          view={view}
          label={series ? `Contratto ${match.handIndex + 1} di ${match.hands.length}` : 'Contratto'}
          online={client.setup.mode === 'online'}
          onSkip={intro.skip}
        />
      )}
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
