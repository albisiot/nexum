# Controllo dei poteri (27 ottobre 2026)

Catalogo pubblicato: versione 1. Dei 51 personaggi con un potere scritto, **19 sono programmati** e **32 no**.

I numeri vengono da una simulazione di **8000 mani** con la CPU a ogni posto, da 2 a 8 giocatori e Contratti
casuali. La CPU gioca in modo semplice, quindi i valori sono indicativi: servono a vedere quali poteri
contano davvero e quali quasi mai.

- **Si attiva**: in quante giocate il potere cambia davvero qualcosa.
- **Vince**: quante volte la carta vince la presa quando segue la fazione d'apertura, confrontata con le carte
  senza potere di valore simile. Per riferimento, le carte senza potere vincono: 0–9 → 3%, 10–19 → 6%,
  20–29 → 7%, 30–39 → 10%, 40–49 → 14%, 50–59 → 19%, 60–69 → 29%, 70–79 → 43%, 80–89 → 63%, 90–99 → 95%.

## 1. Poteri programmati (19)

| Carta | Fazione | Val. | Si attiva (2 / 4 / 8 giocatori) | Vince (senza potere) | Giudizio |
|---|---|---|---|---|---|
| Invariant | Axiomata | 8 | 80% (94 / 88 / 73) | 27% (3%) | **Fortissimo**: un 8 che vale 50 |
| Ascendant | Dominari | 4 | 54% (26 / 47 / 61) | 23% (3%) | **Molto forte** |
| Maledict | Nullarii | 73 | 74% (38 / 66 / 85) | 37% (43%) | **Molto forte sui punti**: in media −0,74 al vincitore a ogni giocata |
| Rebel | Dominari | 12 | 44% (10 / 30 / 57) | 4% (6%) | Forte sui punti: −0,44 a giocata |
| Switch | Conflux | 51 | 32% (0 / 12 / 51) | 36% (19%) | Forte, ma **inutile in 2** e fortissimo in 8 |
| Axiom | Axiomata | 55 | 69% (27 / 53 / 82) | 24% (19%) | Buono, cresce con i giocatori |
| Afterimage | Reliquiae | 46 | 22% | 20% (14%) | Buono e stabile |
| Gravemind | Nullarii | 41 | 91% | 17% (14%) | Sempre attivo, effetto piccolo |
| Wildcard | Conflux | 11 | 98% | 11% (6%) | Sempre attivo, ma spesso diventa comunque basso |
| Bloodmark | Dominari | 35 | 53% (15 / 40 / 68) | 9% (10%) | Utile: prepara la carta successiva |
| Vesper Null | Nullarii | 88 | 44% (72 / 50 / 33) | 64% (63%) | Buono, più forte con pochi giocatori |
| Praetor | Dominari | 82 | 35% (67 / 45 / 24) | 49% (simile a un 82) | Buono, più forte con pochi giocatori |
| Ravager | Dominari | 74 | 24% (64 / 35 / 11) | 34% (43%) | Medio: −0,24 a giocata |
| Measure | Axiomata | 39 | 51% (20 / 47 / 60) | 9% (10%) | Medio, con un effetto collaterale (vedi sotto) |
| Challenger | Dominari | 28 | 39% (12 / 30 / 49) | 8% (7%) | **Quasi inutile**, vedi sotto |
| Equalis | Concordia | 7 | 6% (51 / 6 / 1) | 9% (3%) | **Funziona solo in 2** |
| Origin | Custodes | 3 | 2% (11 / 3 / 1) | 3% (3%) | **Quasi mai**: serve vincere una presa con un 3 |
| Zero | Nullarii | 1 | 2% (7 / 3 / 1) | 3% (3%) | **Quasi mai**: serve vincere una presa con un 1 |
| Veritas | Axiomata | 80 | 1% | 48% (come un 80 normale) | **Non fa quasi nulla** |

### Problemi trovati

1. **Origin, Zero e Veritas sono quasi carte senza potere.**
   - Origin (3) e Zero (1) danno punti solo se vincono la presa, cosa quasi impossibile con quei valori.
   - Veritas vale già 80 stampato, quindi "resta 80" cambia qualcosa solo quando la tua carta ha un bonus o un malus in sospeso (1% delle volte).
2. **Challenger si contraddice.** Diventa 68 solo se prima di lei è uscita una carta oltre 70. Ma se quella carta è della fazione d'apertura vince comunque lei, quindi Challenger serve solo quando la carta alta era fuori fazione.
3. **Equalis funziona solo in 2.** Con 4 giocatori è quasi impossibile che tutti i valori in presa stiano entro 20 punti.
4. **Maledict è il potere più pesante sui punti.** Toglie 1 punto al vincitore ogni volta che non vince, anche quando è giocata fuori fazione e non poteva vincere. In 8 giocatori succede nell'85% dei casi.
5. **Switch, Axiom, Bloodmark, Rebel e Challenger crescono molto con il numero di giocatori, mentre Praetor, Vesper Null e Ravager calano.** Il bilanciamento di una fazione cambia molto tra una partita in 2 e una in 8.
6. **Measure cambia chi vince tra le carte alte.** Porta a 90 tutte le carte sopra 90, e a parità vince il valore stampato più basso. Con Measure in presa, quindi, un 90 batte un 99.
7. **Testi ambigui** (il gioco oggi fa come il simulatore v0.9):
   - **Afterimage**: "la carta precedente" è l'ultima giocata **da te**, non quella appena giocata nella presa.
   - **Challenger**: conta solo "oltre 70" (70 escluso) e solo le carte giocate **prima** di lei.
   - **Vesper Null e Ravager**: "un avversario" è sempre quello in testa alla classifica, non lo sceglie chi gioca.
   - **Wildcard**: usa i valori stampati degli avversari, non quelli finali.

### Proposte

| Carta | Oggi | Proposta |
|---|---|---|
| Origin | +3 se vince la presa | **+2 a te se la presa la vince un'altra carta Custodes** (Origin "sostiene" la fazione) |
| Zero | +4 se vince la presa | **Chi cattura Zero perde 2 punti**: una carta da evitare, in tema con i Nullarii |
| Veritas | resta 80 | **Se è in presa, nessuna carta può valere più di 80** (blocca i valori alti) |
| Challenger | diventa 68 se prima è uscito un 70+ | **Diventa 85 se nella presa c'è un 70+ avversario** (controlla tutta la presa) |
| Equalis | 77 se il range è ≤20 | **77 se il range è ≤ 20 × (giocatori − 1)**, oppure una soglia fissa più larga (≤40) |
| Maledict | −1 al vincitore ogni volta che perde | **Solo se ha seguito la fazione d'apertura** |

## 2. Poteri non programmati (32)

Li ho divisi in base a cosa serve per programmarli.

### A. Si possono programmare subito, serve solo la regola esatta (10)

| Carta | Testo | Regola proposta |
|---|---|---|
| Balancer (Concordia, 71) | Se sei unico ultimo in classifica, +15 | Se sei **l'unico ultimo** nei punti della mano, vale 86 |
| Evenhand (Concordia, 47) | Se sei a pari merito ultimo, +15 | Se sei **ultimo a pari merito** con altri, vale 62 |
| Symmetra (Concordia, 39) | Se il range è 40+, diventa 69 | Se tra la carta più alta e la più bassa della presa ci sono **almeno 40 punti**, vale 69 (l'opposto di Equalis) |
| Morrowshade (Nullarii, 25) | Bonus se è la più bassa | Se è la carta di valore **più basso** della presa: **+1 punto** a chi l'ha giocata |
| Usurper (Dominari, 43) | Bonus se batte carte molto alte | Se nella presa c'è una carta avversaria **85+**, vale **+30** (73) |
| Metamorph (Conflux, 27) | Dipende dalla carta precedente | Prende il **valore stampato della carta giocata subito prima** nella presa; se apre, vale 27 |
| Paradox (Nullarii, 9) | Interagisce con valori identici | Se due carte della presa hanno lo **stesso valore finale**, Paradox vale 99 |
| Palimpsest (Reliquiae, 84) | Copia un effetto precedente | Copia il **potere programmato dell'ultima carta con potere** giocata nella presa |
| Reversal (Custodes, 44) | Può annullare effetti di vittoria | Se è in presa, i poteri **"se vince la presa"** (Origin, Praetor, Vesper Null, Ravager…) non si attivano |
| Vigil (Custodes, 76) | Controllo | Se **apre** la presa, chi segue deve giocare la sua carta **più alta** di quella fazione |

### B. Serve una scelta del giocatore: nuova finestra di gioco + logica della CPU (5)

| Carta | Testo | Regola proposta |
|---|---|---|
| Janus (Conflux, 83) | Può valere 83 oppure 17 | Quando la giochi scegli **83 o 17** |
| Split (Conflux, 19) | Può valere 19 oppure 79 | Quando la giochi scegli **19 o 79** |
| Shift (Conflux, 75) | Può applicare +15 o −15 | Quando la giochi scegli **90 o 60** |
| Ashen (Nullarii, 17) | Può aumentare pagando punti | Quando la giochi puoi **pagare 1 punto per +20**, al massimo 2 volte |
| Fury (Dominari, 20) | Può aumentare pagando punti | Uguale ad Ashen: meglio differenziarla, per esempio **paghi 2 punti e vale 75** |

Le scelte vanno fatte quando giochi la carta, senza vedere le carte che arrivano dopo.

### C. Serve una regola nuova sugli scarti e sui recuperi (9)

Oblivion, Black Echo, Nullchild, Echo Prime, Mnemos, Archivist, Unwritten, Faded One, Anchor.

Oggi ogni giocatore ha sempre esattamente 13 carte per 13 prese. Una carta che esce dalla mano (scartata,
o un turno saltato) o che ci torna (recuperata) rompe questo conto. Prima di programmarle va scelta una regola
generale:

- **Opzione 1, "scambio" (consigliata):** ogni recupero obbliga a scartare un'altra carta dalla mano, e ogni
  scarto è accompagnato da un recupero, così si resta sempre a 13.
  - Black Echo: la prima volta che perde, puoi riprenderla in mano scartando un'altra carta.
  - Echo Prime: una volta per mano, puoi riprenderla dopo averla giocata, scartando un'altra carta.
  - Mnemos: se vince, prendi in mano una carta ≤20 catturata nella presa, scartando una tua carta.
- **Opzione 2, "prese variabili":** chi ha meno carte salta le ultime prese. Così Oblivion (tutti scartano una
  carta) e Nullchild (un avversario salta una presa) funzionano come sono scritte. Il motore sa già far
  saltare una presa.

Una volta scelta l'opzione:
- Unwritten (bonus se scartata), Faded One (non può essere scartata), Archivist (usa un valore dagli scarti)
  e Anchor (blocca i recuperi) si definiscono di conseguenza.
- "Scarti" va definito: le carte uscite dalla mano per un potere, che non contano per i Contratti.

### D. Serve definire la "protezione" (3)

Aegiron, Locke, Pax. Proposta per "protetta": **i poteri avversari non possono cambiarne il valore**
(Vesper Null, Wildcard, Measure, Axiom) **né toglierti punti** (Maledict, Rebel, Ravager).

| Carta | Testo | Regola proposta |
|---|---|---|
| Aegiron (Custodes, 84) | Se prende la presa, la tua prossima carta è protetta | Come scritto, con la definizione sopra |
| Locke (Custodes, 57) | Se prende, limita modifiche nella presa successiva | Nella presa successiva **nessun potere cambia i valori** (un Axiom ritardato) |
| Pax (Concordia, 15) | Protegge dalle perdite di punti | Nella presa in cui la giochi, **i poteri avversari non ti tolgono punti** |

### E. Informazione e pronostici: serve una finestra che mostri o chieda qualcosa (5)

| Carta | Testo | Regola proposta |
|---|---|---|
| Sibyl (Auguria, 78) | Predizione | Quando la giochi, **pronostica chi vincerà la presa**: se indovini, +2 punti |
| Decima (Auguria, 70) | Predizione sopra/sotto 50 | Pronostica se la carta vincente sarà **sopra o sotto 50**: se indovini, +1 punto |
| Foreseer (Custodes, 63) | Predizione | **Vedi la mano** del giocatore che gioca dopo di te, per questa presa |
| Second Sight (Custodes, 29) | Informazione futura | Vedi **una carta a caso** della mano di ogni avversario |
| The Witness (Custodes, 12) | Informazione se molto bassa | Se è la carta più bassa della presa, **vedi la mano del vincitore** |

**Auguria** ha solo 2 poteri su 13, ed entrambi da definire. È la fazione del pronostico: si potrebbero dare
pronostici simili a Sibyl e Decima anche ad altre sue carte, per esempio Omen (8) o Last Oracle (2), così le
carte basse diventano utili.

## 3. Ordine consigliato

1. **Gruppo A e le proposte della sezione 1:** sono solo regole, si programmano e si testano subito, e
   l'Editor permette poi di assegnarle alle carte.
2. **Gruppo D (protezione):** automatico, nessuna finestra nuova.
3. **Gruppo B (scelte):** serve la finestra di scelta, utile anche per Vesper Null e Ravager.
4. **Gruppi E e C:** richiedono le decisioni più grandi.

## 4. Decisioni dell'autore (file Excel, 28 ottobre 2026)

Tutte le 104 carte hanno una decisione e il foglio "Decisioni generali" è completo. Le modifiche alle carte stanno
in `packages/engine/src/data/catalogUpdates.ts` e si applicano al catalogo pubblicato dall'Editor.

### Decisioni generali

1. **Pareggio**: resta così (vince il valore stampato più basso).
2. **Scarti e recuperi**: scambio (chi recupera una carta ne scarta un'altra), tranne le carte che fanno scartare a
   tutti lo stesso numero di carte (Oblivion): lì la mano ha meno prese. Il recupero si decide **prima** di contare i
   punti, così la carta recuperata non conta tra le catturate.
3. **Protetta**: i poteri avversari non cambiano il valore della carta e in quella presa non tolgono punti.
4. **Quando si sceglie**: quando giochi la carta.
5. **Pronostici**: solo premio (nessuna carta li usa più).
6. **"Un avversario"** (Vesper Null, Ravager, Nullchild): lo sceglie chi gioca; la CPU sceglie chi è in testa.
7. **"Carta precedente"**: Afterimage guarda la tua, Metamorph quella giocata subito prima nella presa.
8. **Carte fuori fazione**: i poteri si attivano sempre, a meno che non chiedano di seguire la fazione d'apertura.
9. **Classifica** (Balancer, Evenhand): punti della mano in corso.

Con Oblivion la mano si accorcia: le regole dei Contratti che arrivano fino all'ultima presa ("presa 13",
"ultime 3 prese") si spostano con lei e valgono sull'ultima presa vera.

### Carte

| Carta | Decisione | Stato |
| --- | --- | --- |
| Vigil | Se apre la presa, chi segue gioca la sua carta più alta di quella fazione | Programmato (0.18.0) |
| Nullchild | Se vince, un avversario scelto da chi gioca salta la presa successiva; la carta avanzata si scarta a fine mano | Programmato (0.18.0, scelta 0.20.0) |
| Gravemind | +3 per carta già giocata, massimo +36; testo nuovo | Programmato (0.18.0) |
| Morrowshade | Se è la più bassa della presa, +1 punto a chi l'ha giocata (a pari merito vale) | Programmato (0.18.0) |
| Paradox | Se due carte della presa hanno lo stesso valore finale (lei compresa), vale 99 | Programmato (0.18.0) |
| Palimpsest | Copia il potere programmato dell'ultima carta con potere giocata prima di lei nella presa | Programmato (0.18.0) |
| Balancer | +15 se sei l'unico ultimo nei punti della mano | Programmato (0.18.0) |
| Evenhand | +15 se sei ultimo a pari merito con altri | Programmato (0.18.0) |
| Symmetra | Vale 69 se tra il valore più alto e il più basso della presa ci sono 40 punti o più | Programmato (0.18.0) |
| Foreseer, Locke, Sibyl, Decima, Usurper | Potere tolto | Fatto (0.18.0) |
| Janus, Split | Potere tolto | Fatto (0.20.0) |
| Zero | Va bene così | — |
| Fury | Paghi 2 punti Contratto: vale 75 | Programmato (0.19.0) |
| Ashen | Paghi 1 punto per +20, fino a 4 volte (97) | Programmato (0.19.0) |
| Reversal | Chi la cattura può annullare i punti nati da quella presa, per tutti (non quelli guadagnati da chi è protetto) | Programmato (0.19.0) |
| Vesper Null, Ravager | L'avversario lo sceglie chi gioca (Ravager non può puntare chi è protetto) | Programmato (0.20.0) |
| Aegiron | Se vince, la tua prossima carta è protetta | Programmato (0.20.0) |
| Pax | Nella presa in cui la giochi, i poteri avversari non ti tolgono punti; testo nuovo | Programmato (0.20.0) |
| Shift | Giocandola scegli +15 o −15 | Programmato (0.20.0) |
| Metamorph | Prende il valore stampato della carta giocata subito prima nella presa; se apre, vale 27 | Programmato (0.20.0) |
| Black Echo | La prima volta che perde (una volta per mano) torna in mano scartando un'altra carta | Programmato (0.20.0) |
| Echo Prime | Una volta per mano, a fine presa, torna in mano scartando un'altra carta (anche se ha vinto) | Programmato (0.20.0) |
| Mnemos | Se vince, prende in mano una carta catturata di valore 20 o meno, scartandone una | Programmato (0.20.0) |
| Archivist | Giocandola prende il valore stampato di una carta già giocata in questa mano o scartata; testo nuovo | Programmato (0.20.0) |
| Unwritten | Se un potere la fa scartare, chi la possedeva guadagna 2 punti | Programmato (0.20.0) |
| Faded One | Nessun potere può farla scartare | Programmato (0.20.0) |
| Anchor | Nella presa in cui è giocata nessuno recupera carte | Programmato (0.20.0) |
| Oblivion | Se vince, tutti scartano una carta all'inizio del loro turno e la mano ha una presa in meno | Programmato (0.20.0) |
| Second Sight | Giocandola vedi una carta a caso della mano di ogni avversario | Programmato (0.20.0) |
| The Witness | Se è la più bassa della presa, vedi la mano di chi vince | Programmato (0.20.0) |
