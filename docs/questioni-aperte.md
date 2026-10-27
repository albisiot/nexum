# Questioni aperte sulle regole

Decisioni di design da prendere prima di implementare il resto. Finché non sono decise,
il motore si comporta esattamente come il simulatore v0.9.

## 1. Struttura della partita — decisa (v0.13.0)

Una partita è un solo Contratto (casuale o a scelta) oppure una **serie** (casuale da 3, 5 o tutti i Contratti,
oppure a scelta e in ordine). A ogni Contratto si rimescola e si ridistribuisce; i punti si sommano.
Resta aperto il punto 4 sulle scale di punteggio molto diverse tra i Contratti, che in una serie pesa di più.

## 2–3. Poteri

Il controllo completo dei 51 poteri (programmati e non, con i numeri di una simulazione su 8000 mani,
le ambiguità e le regole proposte) è in [poteri.md](poteri.md).

- **Pareggio**: a parità di valore finale vince il valore stampato più basso. È una regola definitiva?

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
`packages/engine/src/data/defaultCatalog.ts` (o dall'Editor).
