# NEXUM

Gioco di carte trick-taking a Contratti. Questa è la web app che sostituisce il simulatore a file unico
(`reference/Nexum_Simulatore_v0_9.html`, conservato come riferimento delle regole).

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
  src/components/  Schermate: preparazione, tavolo, fine mano
reference/         Simulatore originale v0.9
docs/              Questioni aperte sulle regole
```

## Perché è pronta per l'online

1. **Il motore è puro e deterministico.** `createGame(config)` + `applyAction(state, action)` → nuovo stato.
   Stesso seme, stesse mosse, stessa partita. Lo stato è JSON semplice e può viaggiare in rete così com'è.
2. **Le mosse vengono validate dal motore.** `applyAction` rifiuta mosse fuori turno, carte non possedute
   o che non seguono la fazione: lo stesso codice girerà sul server, che sarà l'unico arbitro.
3. **Ognuno vede solo la propria PlayerView.** `getView(state, seat)` toglie le mani altrui.
   L'interfaccia disegna solo PlayerView, quindi online nessuno potrà sbirciare le carte degli altri.
4. **La CPU usa solo la PlayerView**, quindi non bara e può girare sia nel browser sia sul server.
5. **L'interfaccia parla con un `GameClient`.** Oggi c'è `LocalGameClient` (motore nel browser);
   per l'online basterà un `OnlineGameClient` che invia le azioni al server e riceve le PlayerView,
   senza toccare i componenti React.

## Stato rispetto al simulatore v0.9

- Regole, 10 Contratti, 19 poteri e CPU sono portati 1:1; un test confronta 300 mani casuali con il file originale.
- Bug del prototipo risolti: colori dell'interfaccia non definiti, colori delle fazioni incoerenti tra menu e carte,
  mosse della CPU che potevano finire nella partita successiva tornando al menu.
- Le carte con un potere non ancora implementato lo indicano con "potere non ancora attivo".
- Cosa resta da decidere sulle regole: [docs/questioni-aperte.md](docs/questioni-aperte.md).
