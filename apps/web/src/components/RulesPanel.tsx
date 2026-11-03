import { Icon } from './Icon';
import { Sheet } from './Sheet';

interface ContentProps {
  /** Assente nelle partite online: lì il tempo del turno scorre anche durante il tutorial. */
  onTutorial?: () => void;
}

/** Le regole base, divise in sezioni che si aprono e si chiudono. Stanno nella finestra Regole e nella scheda Regole di Info. */
export function RulesContent({ onTutorial }: ContentProps) {
  return (
    <div className="rules">
      <details open>
        <summary>Carte e fazioni</summary>
        <p>
          Le fazioni sono i <strong>semi</strong> di Nexum: ognuna ha 13 carte con valori da 1 a 13. Si mettono nel
          mazzo tante fazioni quanti sono i giocatori (con 4 giocatori, 52 carte), si mescolano e ognuno riceve 13 carte.
        </p>
      </details>
      <details>
        <summary>Come si gioca una presa</summary>
        <p>
          Il primo di mano apre con qualsiasi carta. Gli altri devono seguire la stessa fazione se ne hanno almeno una,
          altrimenti possono giocare qualsiasi carta. Vince la carta di valore finale più alto della
          fazione d’apertura; a parità vince quella con il valore stampato più basso. Chi vince apre la presa successiva.
        </p>
      </details>
      <details>
        <summary>Contratti e serie</summary>
        <p>
          Una <strong>mano</strong> dura 13 prese con lo stesso <strong>Contratto</strong>, che stabilisce cosa conviene
          fare: prendere più prese, meno prese, evitare una fazione, le ultime prese e così via. Si può giocare un
          solo Contratto oppure una <strong>serie</strong>: a ogni Contratto le carte si rimescolano e si ridistribuiscono,
          e i punti si sommano. Vince chi chiude con il punteggio più alto.
        </p>
      </details>
      <details>
        <summary>Limiti del King e Cappotto</summary>
        <p>
          <strong>Limiti del King</strong> (nei Contratti che lo indicano): alla prima presa chi non può seguire non scarta
          carte che fanno penalità, se ne ha altre; e non si apre con la fazione bersaglio finché qualcuno non l’ha giocata.
        </p>
        <p>
          <strong>Cappotto</strong>: chi prende tutto ciò che il Contratto penalizza riceve +13 invece delle penalità.
        </p>
      </details>
      <details>
        <summary>Briscola e Domino</summary>
        <p>
          <strong>Briscola</strong>: chi è primo di mano sceglie una fazione che batte la fazione d’apertura.
        </p>
        <p>
          <strong>Domino</strong>: niente prese, si parte dai 7 e si attaccano le carte vicine della stessa fazione; chi non
          può giocare passa, e chi finisce per primo prende 1 punto per ogni carta rimasta agli altri, che li perdono.
        </p>
      </details>
      <details>
        <summary>Poteri e monete</summary>
        <p>
          Le carte con i poteri non sono nei mazzi delle fazioni: si trovano nei pacchetti del negozio e per ora servono
          alla collezione. Le monete si guadagnano vincendo: 5 per ogni Contratto, più 25 per una partita a più Contratti.
        </p>
      </details>
      {onTutorial && (
        <button type="button" className="btn small" onClick={onTutorial}>
          Rivedi il tutorial
        </button>
      )}
    </div>
  );
}

interface DialogProps extends ContentProps {
  onClose(): void;
}

/** La finestra Regole: si apre dalla testata, e in partita dal menu ☰. */
export function RulesDialog({ onTutorial, onClose }: DialogProps) {
  return (
    <Sheet className="rules-sheet" label="Regole" onClose={onClose}>
      <div className="sheet-frame">
        <header className="sheet-head">
          <h2>
            <Icon name="regole" size={22} /> Regole base
          </h2>
          <button type="button" className="btn small icon-toggle" aria-label="Chiudi" onClick={onClose}>
            <Icon name="chiudi" size={18} />
          </button>
        </header>
        <div className="sheet-body">
          <RulesContent onTutorial={onTutorial} />
        </div>
      </div>
    </Sheet>
  );
}
