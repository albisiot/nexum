# NEXUM

Gioco di carte trick-taking a Contratti. Questa è la web app che sostituisce il simulatore a file unico
(`reference/Nexum_Simulatore_v0_9.html`, conservato come riferimento delle regole).

**Gioca online: https://albisiot.github.io/nexum/** (si aggiorna da solo a ogni push su `main`).

Oggi si gioca **contro la CPU** o **in più giocatori sullo stesso dispositivo** (pass-and-play).
Il progetto è organizzato in modo da aggiungere il **multiplayer online** senza riscrivere né le regole né l'interfaccia.

## Comandi

Serve Node.js 22 o più recente.

```bash
npm install        # una volta sola
npm run dev        # avvia l'app su http://localhost:5173
npm test           # test del motore (regole, poteri, Contratti, parità con v0.9)
npm run typecheck  # controllo dei tipi su tutto il progetto
npm run build      # versione di produzione in apps/web/dist
```

## Struttura

```
packages/engine/   Motore delle regole: TypeScript puro, nessuna dipendenza dal browser
  src/data/        Fazioni, carte e Contratti
  src/game.ts      Preparazione, mosse legali, risoluzione delle prese
  src/powers.ts    Poteri delle carte (quali sono implementati: IMPLEMENTED_POWERS)
  src/scoring.ts   Punteggio dei Contratti
  src/view.ts      PlayerView: ciò che un singolo giocatore può vedere
  src/bot.ts       CPU
  test/            Test, incluso il confronto mossa per mossa con il simulatore v0.9
apps/web/          Interfaccia React + Vite
  src/game/        GameClient (confine UI ↔ partita) e LocalGameClient
  src/components/  Schermate: menu, preparazione, tavolo, fine mano, patch notes
  src/patchNotes.ts  Storia degli aggiornamenti (aggiungere una voce in cima a ogni versione)
reference/         Simulatore originale v0.9
docs/              Questioni aperte sulle regole
```

## Editor di carte e Contratti

Fazioni, carte e Contratti sono un **catalogo** di dati (`packages/engine/src/catalog.ts`).
Il gioco parte dai dati predefiniti (`data/defaultCatalog.ts`) e all'avvio carica da Firestore
la versione pubblicata, se esiste.

- La voce **Editor** del menu compare solo all'account in `apps/web/src/auth/editor.ts`.
  A impedire davvero le modifiche agli altri sono le regole di `firebase/firestore.rules`.
- Le modifiche si salvano in bozza (`catalog/draft`) e diventano visibili ai giocatori con **Pubblica**
  (`catalog/published`). Il catalogo cambia solo tra una partita e l'altra.
- I Contratti sono elenchi di **regole di punteggio** (`ScoringRule`): punti per presa vinta o per carta
  catturata, con filtri (fazione, fazione bersaglio, valore minimo/massimo, carte con potere, carta precisa)
  e intervalli di prese.
- I poteri sono legati alla carta con una chiave (`CardDef.power`), non al nome. I poteri programmati sono in
  `powers.ts` / `powerList.ts`; un potere nuovo va programmato lì e poi assegnato dall'Editor.
- In sviluppo, `http://localhost:5173/?editor` apre l'Editor senza accesso (salvare resta bloccato dal database).

Configurazione una tantum su Firebase: creare il database Firestore e incollare `firebase/firestore.rules`
nella scheda **Regole**.

## Perché è pronta per l'online

1. **Il motore è puro e deterministico.** `createGame(config)` + `applyAction(state, action)` → nuovo stato.
   Stesso seme, stesse mosse, stessa partita. Lo stato è JSON semplice e può viaggiare in rete così com'è.
2. **Le mosse vengono validate dal motore.** `applyAction` rifiuta mosse fuori turno, carte non possedute
   o che non seguono la fazione: lo stesso codice girerà sul server, che sarà l'unico arbitro.
3. **Ognuno vede solo la propria PlayerView.** `getView(state, seat)` toglie le mani altrui.
   L'interfaccia disegna solo PlayerView, quindi online nessuno potrà sbirciare le carte degli altri.
4. **La CPU usa solo la PlayerView**, quindi non bara e può girare sia nel browser sia sul server.
5. **L'interfaccia parla con un `GameClient`.** `LocalGameClient` ha il motore nel browser; online c'è
   `OnlineHostClient` per chi crea la stanza e fa da arbitro, `OnlineGuestClient` per gli altri.

## Partite online

Chi crea la stanza fa da arbitro: il suo browser applica le regole e pubblica su Firestore a ogni giocatore solo la
propria vista (`apps/web/src/online`). Non serve un server, ma se l'arbitro esce la partita si ferma finché non rientra,
e lui potrebbe leggere il proprio stato salvato. Per passare a un server basterà spostare l'arbitro: viste e mosse restano uguali.

Per provare in locale, senza account: `http://localhost:5173/?fakeOnline=Anna` in una scheda e
`http://localhost:5173/?fakeOnline=Bruno` in un'altra.

## Stato rispetto al simulatore v0.9

- Regole, 10 Contratti, 19 poteri e CPU sono portati 1:1; un test confronta 300 mani casuali con il file originale.
- Bug del prototipo risolti: colori dell'interfaccia non definiti, colori delle fazioni incoerenti tra menu e carte,
  mosse della CPU che potevano finire nella partita successiva tornando al menu.
- Le carte con un potere non ancora implementato lo indicano con "potere non ancora attivo".
- Cosa resta da decidere sulle regole: [docs/questioni-aperte.md](docs/questioni-aperte.md).
