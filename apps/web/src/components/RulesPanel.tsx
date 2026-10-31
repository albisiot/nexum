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
      <p className="hint">
        Le carte con i poteri non sono nei mazzi delle fazioni: si troveranno nei pacchetti, in arrivo.
      </p>
    </section>
  );
}
