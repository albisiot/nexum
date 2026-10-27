# Questioni aperte sulle regole

Decisioni di design da prendere prima di implementare il resto. Finché non sono decise,
il motore si comporta esattamente come il simulatore v0.9.

## 1. Struttura della partita — decisa (v0.13.0)

Una partita è un solo Contratto (casuale o a scelta) oppure una **serie** (casuale da 3, 5 o tutti i Contratti,
oppure a scelta e in ordine). A ogni Contratto si rimescola e si ridistribuisce; i punti si sommano.
Resta aperto il punto 4 sulle scale di punteggio molto diverse tra i Contratti, che in una serie pesa di più.

## 2. Poteri non ancora implementati (32 su 51)

Hanno un testo sulla carta ma il motore non li applica.

| Fazione | Carte | Problema |
|---|---|---|
| Custodes | Aegiron, Vigil, Foreseer, Locke, Reversal, Second Sight, Anchor, The Witness | Vigil ("Controllo."), Foreseer ("Predizione."), Second Sight ("Informazione futura.") non descrivono una regola |
| Nullarii | Oblivion, Black Echo, Nullchild, Morrowshade, Ashen, Paradox | Ashen: quanti punti si pagano e per quanto aumenta? Paradox: cosa succede con valori identici? |
| Auguria | Sibyl, Decima | Sibyl ("Predizione.") non è una regola; con solo 2 poteri su 13 la fazione è quasi senza identità |
| Reliquiae | Palimpsest, Echo Prime, Mnemos, Archivist, Unwritten, Faded One | Dipendono da "scarti" e "recuperi", che oggi non esistono nel gioco |
| Dominari | Usurper, Fury | "Bonus" di Usurper: quanto vale? "Molto alte": da che valore? |
| Concordia | Balancer, Evenhand, Symmetra, Pax | Symmetra: "range" significa massimo − minimo dei valori in presa (come per Equalis)? |
| Conflux | Janus, Shift, Metamorph, Split | Richiedono una scelta del giocatore: quando si sceglie, prima o dopo aver visto le altre carte? |

I poteri con una scelta (Janus, Shift, Split, Ashen, Fury, Black Echo, Echo Prime, Mnemos…)
richiedono anche una schermata di scelta e una logica per la CPU.

## 3. Ambiguità nei poteri già implementati

- **Afterimage** — "Se la carta precedente era 70+": il prototipo guarda l'ultima carta giocata **da te**,
  non quella giocata subito prima nella stessa presa. Quale delle due?
- **Challenger** — "Se affronta un 70+": il prototipo controlla "più di 70" (quindi 70 non conta)
  e solo le carte giocate **prima** di lui. Va bene così?
- **Vesper Null / Ravager** — "un avversario": il prototipo sceglie sempre quello con più punti.
  Deve sceglierlo chi gioca la carta?
- **Maledict** — si attiva anche se Maledict è stata giocata fuori fazione (non poteva vincere). Voluto?
- **Pareggio** — a parità di valore finale vince il valore stampato più basso. È una regola definitiva?

## 4. Contratti

- **Evita The Unmade** e in parte **Tutto negativo** dipendono dai Nullarii: senza quella fazione nel mazzo
  il Contratto non assegna punti. L'app ora mostra un avviso; meglio obbligare i Nullarii nel mazzo?
- **Scale di punteggio molto diverse**: nelle simulazioni "Carte con potere" arriva a −36,
  "Evita The Unmade" resta tra −7 e +4. Va bene per una mano singola, non per una serie di mani sommate.
- **2 giocatori**: tutte le 26 carte vengono distribuite, quindi ognuno conosce la mano dell'altro.
  Si vuole lasciare così?

## 5. Grafica

I colori delle fazioni nel menu del prototipo (#2E75B6, #7F58AF…) erano diversi da quelli sulle carte.
L'app usa ovunque quelli delle carte. Se esiste una palette ufficiale, va sostituita in
`packages/engine/src/data/factions.ts`.
