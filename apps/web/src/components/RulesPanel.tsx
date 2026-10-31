export function RulesPanel() {
  return (
    <section className="panel rules">
      <h2>Regole base</h2>
      <p>
        Le fazioni sono i <strong>semi</strong> di Nexum: ognuna ha 13 carte con valori da 1 a 13. Si mettono nel
        mazzo tante fazioni quanti sono i giocatori (con 4 giocatori, 52 carte), si mescolano e ognuno riceve 13 carte.
      </p>
      <p>
        Il primo di mano apre con qualsiasi carta. Gli altri devono seguire la stessa fazione se ne hanno almeno una,
        altrimenti possono giocare qualsiasi carta. Vince la carta di valore finale più alto della
        fazione d’apertura; a parità vince quella con il valore stampato più basso. Chi vince apre la presa successiva.
      </p>
      <p>
        Una <strong>mano</strong> dura 13 prese con lo stesso <strong>Contratto</strong>, che stabilisce cosa conviene
        fare: prendere più prese, meno prese, evitare una fazione, le ultime prese e così via. Si può giocare un
        solo Contratto oppure una <strong>serie</strong>: a ogni Contratto le carte si rimescolano e si ridistribuiscono,
        e i punti si sommano. Vince chi chiude con il punteggio più alto.
      </p>
      <p>
        <strong>Limiti del King</strong> (nei Contratti che lo indicano): alla prima presa chi non può seguire non scarta
        carte che fanno penalità, se ne ha altre; e non si apre con la fazione bersaglio finché qualcuno non l’ha giocata.{' '}
        <strong>Cappotto</strong>: chi prende tutto ciò che il Contratto penalizza riceve +13 invece delle penalità.
      </p>
      <p>
        <strong>Briscola</strong>: chi è primo di mano sceglie una fazione che batte la fazione d’apertura.{' '}
        <strong>Domino</strong>: niente prese, si parte dai 7 e si attaccano le carte vicine della stessa fazione; chi non
        può giocare passa, e chi finisce per primo prende 1 punto per ogni carta rimasta agli altri, che li perdono.
      </p>
      <p className="hint">
        Le carte con i poteri non sono nei mazzi delle fazioni: si trovano nei pacchetti del negozio e per ora servono alla collezione. Le monete si guadagnano vincendo: 5 per ogni Contratto, più 25 per una partita a più Contratti.
      </p>
    </section>
  );
}
