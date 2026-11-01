import {
  CONTRACT_WIN_COINS,
  DUPLICATE_COINS,
  PACK_PRICE,
  PACK_SIZE,
  SERIES_WIN_COINS,
  TRICKS_PER_HAND,
  canPlaceDomino,
  contractDelta,
  contracts,
  dominoPlaced,
  dominoStartValue,
  factionCards,
  factionIds,
  factions,
  getCard,
  getFaction,
} from '@nexum/engine';
import type { CardId, DominoState, FactionId } from '@nexum/engine';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useCatalogVersion } from '../catalog/store';
import { describeScoring, signed } from '../game/text';
import { CardView } from './CardView';
import { ContractIcon } from './Icon';
import { offeredContracts } from './SetupScreen';

const SEEN_KEY = 'nexum-tutorial-seen';

/** Senza localStorage non si può ricordare: meglio non riproporre il tutorial a ogni apertura. */
export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Vedi tutorialSeen.
  }
}

/** La carta in quella posizione della fazione, dalla più bassa: 1 è la prima, 13 l'ultima. */
const cardAt = (faction: FactionId, position: number): CardId =>
  factionCards(faction).sort((a, b) => a.value - b.value)[position - 1]!.id;

const cardName = (id: CardId) => getCard(id).name;
const factionName = (faction: FactionId) => getFaction(faction).name;

interface Play {
  who: string;
  cardId: CardId;
}

/** Vince la carta più alta della briscola, se ce n'è una, altrimenti della fazione d'apertura. */
function trickWinner(plays: readonly Play[], lead: FactionId, trump?: FactionId): Play {
  const inFaction = (f: FactionId) => plays.filter((p) => getCard(p.cardId).faction === f);
  const eligible = trump && inFaction(trump).length ? inFaction(trump) : inFaction(lead);
  return eligible.reduce((best, p) => (getCard(p.cardId).value > getCard(best.cardId).value ? p : best));
}

function Slot({ cardId }: { cardId: CardId }) {
  return (
    <span className="card-slot">
      <CardView cardId={cardId} mini />
    </span>
  );
}

function FactionName({ faction }: { faction: FactionId }) {
  return (
    <b className="tut-faction">
      <span className="dot" style={{ '--faction': getFaction(faction).color } as CSSProperties} />
      {factionName(faction)}
    </b>
  );
}

function TablePlays({ plays, winner }: { plays: readonly Play[]; winner?: Play }) {
  return (
    <div className="tut-table">
      {plays.map((p) => (
        <div key={p.who} className={`tut-play${p === winner ? ' winner' : ''}`}>
          <span className="tut-who">{p.who}</span>
          <Slot cardId={p.cardId} />
          {p === winner && <span className="tut-takes">Prende</span>}
        </div>
      ))}
    </div>
  );
}

interface TrickProps {
  before: Play;
  after: Play;
  hand: CardId[];
  /** Cosa dire dopo che la carta è stata giocata. */
  outcome(card: CardId, winner: Play): ReactNode;
}

/** Una presa vera da giocare: si tocca una carta per alzarla e di nuovo per giocarla, come in partita. */
function TrickLesson({ before, after, hand, outcome }: TrickProps) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const [played, setPlayed] = useState<CardId | null>(null);
  const lead = getCard(before.cardId).faction;
  const following = hand.filter((id) => getCard(id).faction === lead);
  const legal = following.length ? following : hand;

  if (played) {
    const mine: Play = { who: 'Tu', cardId: played };
    const plays = [before, mine, after];
    const winner = trickWinner(plays, lead);
    return (
      <>
        <TablePlays plays={plays} winner={winner} />
        <p className="tut-feedback good" role="status">
          {outcome(played, winner)}
        </p>
        <button
          type="button"
          className="btn small"
          onClick={() => {
            setPlayed(null);
            setSelected(null);
          }}
        >
          Riprova con un’altra carta
        </button>
      </>
    );
  }

  const blocked = selected && !legal.includes(selected);
  return (
    <>
      <TablePlays plays={[before]} />
      {blocked ? (
        <p className="tut-feedback bad" role="status">
          Non puoi giocarla: hai ancora carte {factionName(lead)}, quindi devi seguire. Sono quelle sollevate e a colori pieni.
        </p>
      ) : (
        <p className="tut-prompt">
          {selected
            ? `Tocca di nuovo ${cardName(selected)} per giocarla.`
            : following.length
              ? 'È il tuo turno: tocca una carta per alzarla.'
              : 'È il tuo turno: tocca una carta per alzarla. Qui puoi scegliere liberamente.'}
        </p>
      )}
      <div className="tut-hand">
        {hand.map((id) => (
          <button
            key={id}
            type="button"
            className={`tut-card${legal.includes(id) ? '' : ' invalid'}${selected === id ? ' selected' : ''}`}
            aria-pressed={selected === id}
            aria-label={`${cardName(id)}${legal.includes(id) ? '' : ', non giocabile'}`}
            onClick={() => {
              if (id === selected && legal.includes(id)) setPlayed(id);
              else setSelected(id);
            }}
          >
            <Slot cardId={id} />
          </button>
        ))}
      </div>
    </>
  );
}

interface QuizProps {
  plays: Play[];
  lead: FactionId;
  trump?: FactionId;
  /** Perché la carta toccata non è quella che prende. */
  wrong(card: CardId): string;
  right: string;
}

/** Quattro carte sul tavolo: si tocca quella che prende la presa. */
function WinnerQuiz({ plays, lead, trump, wrong, right }: QuizProps) {
  const [picked, setPicked] = useState<CardId | null>(null);
  const winner = trickWinner(plays, lead, trump);
  const solved = picked === winner.cardId;
  return (
    <>
      <div className="tut-table">
        {plays.map((p) => (
          <button
            key={p.who}
            type="button"
            className={`tut-play tut-pick${solved && p === winner ? ' winner' : ''}${picked === p.cardId && !solved ? ' missed' : ''}`}
            aria-label={`${p.who}: ${cardName(p.cardId)}`}
            onClick={() => setPicked(p.cardId)}
          >
            <span className="tut-who">{p.who}</span>
            <Slot cardId={p.cardId} />
            {solved && p === winner && <span className="tut-takes">Prende</span>}
          </button>
        ))}
      </div>
      {!picked && <p className="tut-prompt">Tocca la carta che prende la presa.</p>}
      {picked && (
        <p className={`tut-feedback ${solved ? 'good' : 'bad'}`} role="status">
          {solved ? right : `No: ${wrong(picked)} Prova ancora.`}
        </p>
      )}
    </>
  );
}

/** Una fila di Domino vera: le regole sono quelle del motore di gioco. */
function DominoLesson({ a, b, c }: { a: FactionId; b: FactionId; c: FactionId }) {
  const initial = (): { domino: DominoState; hand: CardId[] } => ({
    // Le posizioni 5-7 (contando da 0) sono le carte attorno a quella di partenza.
    domino: { table: { [a]: { low: 5, high: 7 } }, passed: [], winner: null },
    hand: [cardAt(a, 5), cardAt(a, 9), cardAt(a, 10), cardAt(b, 7), cardAt(c, 3)],
  });
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState<{ good: boolean; text: string } | null>(null);
  const { domino, hand } = state;
  const stuck = !hand.some((id) => canPlaceDomino(domino, id));

  const place = (id: CardId) => {
    const card = getCard(id);
    if (!canPlaceDomino(domino, id)) {
      const line = domino.table[card.faction];
      setMessage({
        good: false,
        text: line
          ? `${card.name} non è vicina alle carte di ${factionName(card.faction)} in tavola.`
          : `${factionName(card.faction)} non è ancora in tavola: serve prima il ${dominoStartValue(card.faction)}.`,
      });
      return;
    }
    const line = domino.table[card.faction];
    const rank = factionCards(card.faction)
      .sort((x, y) => x.value - y.value)
      .findIndex((x) => x.id === id);
    setState({
      domino: {
        ...domino,
        table: {
          ...domino.table,
          [card.faction]: line ? { low: Math.min(line.low, rank), high: Math.max(line.high, rank) } : { low: rank, high: rank },
        },
      },
      hand: hand.filter((x) => x !== id),
    });
    setMessage({ good: true, text: line ? `${card.name} si attacca alla fila.` : `${card.name} apre la fila di ${factionName(card.faction)}.` });
  };

  return (
    <>
      <div className="tut-domino">
        {Object.keys(domino.table).map((f) => (
          <div key={f} className="tut-domino-row">
            {dominoPlaced(domino, f).map((id) => (
              <Slot key={id} cardId={id} />
            ))}
          </div>
        ))}
      </div>
      <p className="tut-prompt">Tocca le carte che puoi attaccare.</p>
      <div className="tut-hand">
        {hand.map((id) => (
          <button key={id} type="button" className="tut-card" aria-label={cardName(id)} onClick={() => place(id)}>
            <Slot cardId={id} />
          </button>
        ))}
      </div>
      {stuck ? (
        <>
          <p className="tut-feedback good" role="status">
            Ora non puoi attaccare niente: in partita passi, senza fare nulla, e il turno va avanti da solo.
          </p>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              setState(initial());
              setMessage(null);
            }}
          >
            Ricomincia
          </button>
        </>
      ) : (
        message && (
          <p className={`tut-feedback ${message.good ? 'good' : 'bad'}`} role="status">
            {message.text}
          </p>
        )
      )}
    </>
  );
}

/** La stessa presa con Contratti diversi: i punti vengono dalle regole vere dei Contratti. */
function SameTrick({ a, b }: { a: FactionId; b: FactionId }) {
  const plays: Play[] = [
    { who: 'Avversario 1', cardId: cardAt(a, 3) },
    { who: 'Tu', cardId: cardAt(a, 12) },
    { who: 'Avversario 2', cardId: cardAt(b, 9) },
  ];
  const captured = plays.map((p) => p.cardId);
  const shown = ['more', 'less', 'avoidHigh', 'avoidNine', 'last'].flatMap((id) => contracts().filter((c) => c.id === id));
  return (
    <>
      <TablePlays plays={plays} winner={plays[1]} />
      <ul className="tut-deltas">
        {shown.map((c) => {
          const delta = contractDelta({ playerNames: [], factions: [a, b], contract: c.id, seed: 0 }, 1, captured, TRICKS_PER_HAND);
          return (
            <li key={c.id}>
              <span>
                <ContractIcon contract={c} size={18} /> {c.name}
              </span>
              <b className={delta > 0 ? 'good' : delta < 0 ? 'bad' : ''}>{delta === 0 ? '0' : signed(delta)}</b>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function GameMap() {
  const zones = [
    ['Il riquadro del Contratto', `In alto: il Contratto in gioco, cosa fa guadagnare o perdere, a che presa sei su ${TRICKS_PER_HAND} e il pulsante Regole.`],
    ['Il tavolo', 'I giocatori seduti intorno e le carte giocate in questa presa. Il posto di chi deve giocare è evidenziato.'],
    ['Il turno', 'Sotto il tavolo una scritta ti dice a chi tocca e cosa devi fare: leggila, ti ricorda sempre la regola che vale in quel momento.'],
    ['La tua mano', 'Le carte che puoi giocare sono sollevate e a colori pieni, le altre sono scurite. Tocca una carta per alzarla e leggerla, toccala di nuovo per giocarla.'],
    ['Classifica e cronologia', 'I punti di tutti e le prese già giocate: di lato sul computer, più in basso sul telefono.'],
  ];
  return (
    <ol className="tut-map">
      {zones.map(([title, text]) => (
        <li key={title}>
          <b>{title}</b>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

interface Step {
  chapter: string;
  title: string;
  body: ReactNode;
}

function buildSteps(): Step[] {
  const [a, b, c, d] = factionIds() as [FactionId, FactionId, FactionId, FactionId];
  const offered = offeredContracts();
  return [
    {
      chapter: 'Le basi',
      title: 'Ti presento Nexum',
      body: (
        <>
          <p>
            Nexum è un gioco di carte <strong>a prese</strong>: a turno ognuno gioca una carta e la più forte si porta via tutte
            le altre. La particolarità è il <strong>Contratto</strong>: è lui a decidere se le prese fanno guadagnare o perdere
            punti. A volte vuoi prenderle tutte, a volte nessuna.
          </p>
          <p>Vince chi alla fine ha più punti.</p>
          <p className="tut-note">
            Bastano pochi minuti, e potrai provare le mosse direttamente qui. Puoi uscire quando vuoi con “Esci” e rivedere tutto
            quando vuoi dal menu principale, alla voce Tutorial.
          </p>
        </>
      ),
    },
    {
      chapter: 'Le basi',
      title: 'Le carte e il mazzo',
      body: (
        <>
          <div className="tut-row">
            {[cardAt(a, 2), cardAt(b, 7), cardAt(c, 13)].map((id) => (
              <Slot key={id} cardId={id} />
            ))}
          </div>
          <p>
            Ogni carta ha un <strong>valore</strong> da 1 a 13 e appartiene a una <strong>fazione</strong>: le fazioni sono i semi
            di Nexum, ognuna con il suo colore e 13 carte.
          </p>
          <p>
            Nel mazzo ci sono tante fazioni quanti sono i giocatori. In 4 si gioca con 4 fazioni, cioè 52 carte, e ognuno ne riceve
            sempre <strong>13</strong>. Le carte si mescolano tutte insieme: nessuno “possiede” una fazione.
          </p>
          <div className="tut-factions">
            {factions().map((f) => (
              <FactionName key={f.id} faction={f.id} />
            ))}
          </div>
        </>
      ),
    },
    {
      chapter: 'Le basi',
      title: 'Come funziona una presa',
      body: (
        <ol className="tut-rules">
          <li>
            <b>Chi è primo di mano apre</b> con la carta che vuole. La sua fazione diventa la <strong>fazione d’apertura</strong>.
          </li>
          <li>
            <b>Gli altri devono seguire</b>: chi ha almeno una carta di quella fazione è obbligato a giocarne una.
          </li>
          <li>
            <b>Chi non ne ha gioca ciò che vuole</b>, ma quella carta non può vincere, per quanto alta.
          </li>
          <li>
            <b>Prende la carta più alta della fazione d’apertura.</b> Chi prende cattura tutte le carte della presa e apre la
            successiva.
          </li>
          <li>
            Dopo <b>{TRICKS_PER_HAND} prese</b> le carte sono finite e la mano è conclusa.
          </li>
        </ol>
      ),
    },
    {
      chapter: 'Le basi',
      title: 'Prova: segui la fazione',
      body: (
        <>
          <p>
            Avversario 1 ha aperto con <FactionName faction={a} />. Tu ne hai due: devi giocare una di quelle. Prova anche a toccare
            una carta scurita, per vedere cosa succede.
          </p>
          <TrickLesson
            before={{ who: 'Avversario 1', cardId: cardAt(a, 8) }}
            after={{ who: 'Avversario 2', cardId: cardAt(a, 10) }}
            hand={[cardAt(a, 11), cardAt(a, 4), cardAt(b, 13), cardAt(c, 2), cardAt(d, 6)]}
            outcome={(_, winner) =>
              winner.who === 'Tu'
                ? `Prendi tu: ${cardName(winner.cardId)} è la più alta di ${factionName(a)}. Ora apri tu la presa successiva.`
                : `Prende ${winner.who} con ${cardName(winner.cardId)}. Questa presa non è tua: con un Contratto che penalizza le prese, è proprio quello che vuoi.`
            }
          />
        </>
      ),
    },
    {
      chapter: 'Le basi',
      title: 'Prova: quando non puoi seguire',
      body: (
        <>
          <p>
            Questa volta si apre con <FactionName faction={b} /> e tu non ne hai: puoi giocare qualsiasi carta. Prova con la più alta.
          </p>
          <TrickLesson
            before={{ who: 'Avversario 1', cardId: cardAt(b, 3) }}
            after={{ who: 'Avversario 2', cardId: cardAt(b, 6) }}
            hand={[cardAt(a, 13), cardAt(a, 2), cardAt(c, 12), cardAt(d, 9)]}
            outcome={(card, winner) =>
              `${cardName(card)} non può prendere, perché non è ${factionName(b)}: prende ${winner.who} con ${cardName(winner.cardId)}, anche se vale meno. È il momento giusto per liberarti delle carte che il Contratto rende pericolose.`
            }
          />
        </>
      ),
    },
    {
      chapter: 'Le basi',
      title: 'Prova: chi prende?',
      body: (
        <>
          <p>
            La presa è stata aperta da Anna con <FactionName faction={a} />.
          </p>
          <WinnerQuiz
            lead={a}
            plays={[
              { who: 'Anna', cardId: cardAt(a, 5) },
              { who: 'Bruno', cardId: cardAt(b, 13) },
              { who: 'Carla', cardId: cardAt(a, 9) },
              { who: 'Dario', cardId: cardAt(c, 12) },
            ]}
            right={`Esatto: ${cardName(cardAt(a, 9))} è la carta più alta di ${factionName(a)}. Le carte di altre fazioni non contano, anche se valgono di più.`}
            wrong={(id) =>
              getCard(id).faction === a
                ? `${cardName(id)} è della fazione giusta, ma ce n’è una più alta.`
                : `${cardName(id)} vale tanto, ma non è della fazione d’apertura.`
            }
          />
        </>
      ),
    },
    {
      chapter: 'I Contratti',
      title: 'Il Contratto cambia tutto',
      body: (
        <>
          <p>
            All’inizio di ogni mano c’è un <strong>Contratto</strong>, che resta lo stesso per tutte le {TRICKS_PER_HAND} prese e
            decide cosa fa punti. Guarda quanto vale <strong>la stessa presa</strong> vinta da te con Contratti diversi:
          </p>
          <SameTrick a={a} b={b} />
          <p>
            Per questo il Contratto va sempre letto per primo: lo trovi nel riquadro in alto durante la partita. Con Più prese le carte
            alte sono un tesoro; con Meno prese sono un problema.
          </p>
        </>
      ),
    },
    {
      chapter: 'I Contratti',
      title: 'Tutti i Contratti',
      body: (
        <>
          <p>Ecco quelli che puoi incontrare, con i punti che assegnano. Non serve impararli: in partita li hai sempre davanti.</p>
          <ul className="tut-contracts">
            {offered.map((k) => (
              <li key={k.id}>
                <span className="contract-title">
                  <ContractIcon contract={k} size={20} /> {k.name}
                </span>
                <span className="contract-desc">{k.desc}</span>
                <span className="contract-score">{describeScoring(k)}</span>
              </li>
            ))}
          </ul>
          <p className="tut-note">
            La <strong>fazione bersaglio</strong>, quando un Contratto la chiede, è una delle fazioni del mazzo e viene indicata
            all’inizio della mano.
          </p>
        </>
      ),
    },
    {
      chapter: 'I Contratti',
      title: 'Limiti del King e Cappotto',
      body: (
        <>
          <p>Alcuni Contratti aggiungono due regole, e nel riquadro del Contratto lo vedi scritto.</p>
          <h3>Limiti del King</h3>
          <ul>
            <li>Alla <strong>prima presa</strong>, chi non può seguire non può scartare carte che fanno penalità, se ne ha altre.</li>
            <li>
              Non si può <strong>aprire con la fazione bersaglio</strong> finché qualcuno non l’ha giocata, a meno che tu non abbia
              solo quella.
            </li>
          </ul>
          <h3>Cappotto</h3>
          <p>
            Chi riesce a prendere <strong>tutto</strong> ciò che il Contratto penalizza non subisce le penalità: riceve invece punti
            positivi, di solito +13. È un rischio: basta una sola carta presa da un altro per pagare tutto.
          </p>
        </>
      ),
    },
    {
      chapter: 'I Contratti',
      title: 'Il Contratto Briscola',
      body: (
        <>
          <p>
            Il primo di mano sceglie una fazione, la <strong>briscola</strong>, che batte la fazione d’apertura. Ogni presa vinta vale
            +1. Devi comunque seguire se puoi; ma se non puoi, una briscola anche piccola prende la presa. Non si può aprire con la
            briscola finché qualcuno non l’ha giocata, a meno che tu non abbia solo quella.
          </p>
          <p>
            Qui la briscola è <FactionName faction={c} /> e la fazione d’apertura è <FactionName faction={a} />.
          </p>
          <WinnerQuiz
            lead={a}
            trump={c}
            plays={[
              { who: 'Anna', cardId: cardAt(a, 5) },
              { who: 'Bruno', cardId: cardAt(a, 12) },
              { who: 'Carla', cardId: cardAt(c, 2) },
              { who: 'Dario', cardId: cardAt(d, 13) },
            ]}
            right={`Esatto: ${cardName(cardAt(c, 2))} è briscola e batte ${factionName(a)}, anche se vale poco. Con più briscole sul tavolo prende la più alta.`}
            wrong={(id) =>
              getCard(id).faction === a
                ? `${cardName(id)} è della fazione d’apertura, ma la briscola la batte.`
                : `${cardName(id)} non è né briscola né fazione d’apertura.`
            }
          />
        </>
      ),
    },
    {
      chapter: 'I Contratti',
      title: 'Il Contratto Domino',
      body: (
        <>
          <p>
            Qui non ci sono prese. Si parte dal <strong>{dominoStartValue(a)}</strong> di ogni fazione e si attaccano le carte vicine
            della stessa fazione, salendo o scendendo. Chi non può giocare passa.
          </p>
          <p>
            Chi finisce per primo chiude la mano e guadagna <strong>1 punto per ogni carta rimasta agli altri</strong>, che li perdono.
          </p>
          <DominoLesson a={a} b={b} c={c} />
        </>
      ),
    },
    {
      chapter: 'La partita',
      title: 'Serie e punteggio',
      body: (
        <>
          <p>Prima di iniziare scegli giocatori, Contratti e fazioni. Per i Contratti hai quattro formati:</p>
          <ul>
            <li>
              <strong>Serie casuale</strong>: 3, 5 o tutti i Contratti, estratti a caso.
            </li>
            <li>
              <strong>Serie a scelta</strong>: decidi tu quali Contratti e in che ordine.
            </li>
            <li>
              <strong>Un Contratto</strong>, casuale o a scelta: una sola mano da {TRICKS_PER_HAND} prese, per una partita veloce.
            </li>
          </ul>
          <p>
            In una serie, a ogni Contratto le carte si rimescolano e si ridistribuiscono, e i punti si sommano. I punti possono anche
            andare sotto zero. <strong>Vince chi chiude con il totale più alto.</strong>
          </p>
        </>
      ),
    },
    {
      chapter: 'La partita',
      title: 'Lo schermo di gioco',
      body: (
        <>
          <GameMap />
          <p className="tut-note">
            Alla fine di ogni presa vedi chi ha preso e quanti punti ha fatto il Contratto: premi “Presa successiva” per continuare. Il
            pulsante Regole riassume tutto anche durante la partita.
          </p>
        </>
      ),
    },
    {
      chapter: 'La partita',
      title: 'I modi di giocare',
      body: (
        <>
          <h3>Contro la CPU</h3>
          <p>
            Tu contro da 1 a 7 avversari. A ogni partita ognuno ha un livello a caso tra facile, normale e difficile, e non viene
            mostrato: sta a te capire chi hai davanti.
          </p>
          <h3>Multiplayer</h3>
          <p>
            Da 2 a 8 persone sullo stesso dispositivo. A ogni turno lo passi a chi deve giocare, che preme “Mostra la mia mano” solo
            quando l’ha in mano: così nessuno vede le carte degli altri.
          </p>
          <h3>Online</h3>
          <p>
            Ognuno dal proprio dispositivo, con l’accesso Google. Chi crea la stanza invita gli altri con il codice, il link o il QR, e i
            posti vuoti li gioca la CPU. Hai 60 secondi a turno, poi la CPU gioca per te. Se chi ha creato la stanza esce, la partita si
            ferma finché non rientra.
          </p>
        </>
      ),
    },
    {
      chapter: 'La partita',
      title: 'Monete, pacchetti e collezione',
      body: (
        <>
          <p>Con l’accesso Google, vincendo contro la CPU oppure online guadagni monete:</p>
          <ul>
            <li>
              <strong>{CONTRACT_WIN_COINS} monete</strong> per ogni Contratto vinto;
            </li>
            <li>
              <strong>{SERIES_WIN_COINS} monete</strong> in più se vinci una partita a più Contratti.
            </li>
          </ul>
          <p>
            Nel Negozio un pacchetto costa <strong>{PACK_PRICE} monete</strong> e contiene {PACK_SIZE} carte a caso; ogni doppione ti
            rende {DUPLICATE_COINS} monete. Le carte trovate finiscono nella Collezione.
          </p>
          <p className="tut-note">
            Le carte dei pacchetti hanno dei poteri, ma per ora servono solo alla collezione: non entrano nelle partite.
          </p>
        </>
      ),
    },
    {
      chapter: 'La partita',
      title: 'Ora sai giocare!',
      body: (
        <>
          <p>Le cose da ricordare sono tre:</p>
          <ol className="tut-rules">
            <li>
              <b>Leggi il Contratto:</b> ti dice se le prese ti convengono o no.
            </li>
            <li>
              <b>Segui la fazione d’apertura</b> se puoi.
            </li>
            <li>
              <b>Prende la carta più alta</b> della fazione d’apertura.
            </li>
          </ol>
          <p>Il resto lo imparerai giocando. Il tutorial resta nel menu principale e nel pannello Regole, se vuoi rivederlo.</p>
        </>
      ),
    },
  ];
}

interface Props {
  onClose(): void;
  /** Presente quando dal tutorial si può passare subito a una partita senza perdere niente. */
  onPlay?: () => void;
}

/** Il tutorial: si apre da solo la prima volta, poi dal menu o dalle Regole. Sta sopra allo schermo, senza chiuderlo. */
export function Tutorial({ onClose, onPlay }: Props) {
  useCatalogVersion();
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const steps = buildSteps();
  const step = steps[index]!;
  const last = index === steps.length - 1;
  const chapters = [...new Set(steps.map((s) => s.chapter))];

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  useEffect(() => {
    content.current?.scrollTo(0, 0);
  }, [index]);

  const close = () => {
    markTutorialSeen();
    onClose();
  };
  const play = () => {
    markTutorialSeen();
    onPlay?.();
  };

  return (
    <dialog
      ref={dialog}
      className="tutorial"
      aria-label="Tutorial"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="tut-frame">
        <header className="tut-head">
          <nav className="tut-chapters" aria-label="Capitoli">
            {chapters.map((chapter) => (
              <button
                key={chapter}
                type="button"
                className={`chip-option${chapter === step.chapter ? ' selected' : ''}`}
                aria-current={chapter === step.chapter ? 'step' : undefined}
                onClick={() => setIndex(steps.findIndex((s) => s.chapter === chapter))}
              >
                {chapter}
              </button>
            ))}
          </nav>
          <button type="button" className="btn small" onClick={close}>
            Esci
          </button>
        </header>
        <div className="tut-progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1} aria-label="Avanzamento">
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <div ref={content} className="tut-content">
          <span className="hint">
            Passo {index + 1} di {steps.length}
          </span>
          <h2>{step.title}</h2>
          {/* La chiave azzera le prove interattive quando si cambia passo. */}
          <div key={index} className="tut-body">
            {step.body}
          </div>
        </div>

        <footer className="tut-foot">
          <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ← Indietro
          </button>
          {!last ? (
            <button type="button" className="btn primary" onClick={() => setIndex(index + 1)}>
              Avanti →
            </button>
          ) : onPlay ? (
            <button type="button" className="btn primary" onClick={play}>
              Gioca contro la CPU
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={close}>
              Fine
            </button>
          )}
        </footer>
      </div>
    </dialog>
  );
}
