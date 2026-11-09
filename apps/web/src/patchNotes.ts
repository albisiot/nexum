// Storia degli aggiornamenti mostrata nella pagina "Patch notes".
// Ogni nuova versione va aggiunta IN CIMA alla lista: la prima voce è anche la versione mostrata nel menu.

export type ChangeType = 'new' | 'change' | 'fix';

export interface PatchNote {
  version: string;
  /** Data di uscita in formato AAAA-MM-GG (assente se non nota). */
  date?: string;
  title: string;
  changes: { type: ChangeType; text: string }[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.42.3',
    date: '2026-11-09',
    title: 'Menu fermo su iPhone dalla Home',
    changes: [
      {
        type: 'fix',
        text: 'Con NEXUM aperto dalla Home dell’iPhone il menu principale non scorre più col dito: ora si stringe in base allo spazio che resta tra la tacca e la linea della Home, non all’altezza dello schermo intero.',
      },
      {
        type: 'fix',
        text: 'Aprendo il gioco con l’accesso Google fatto, il menu non salta più quando l’accesso viene confermato: mentre lo verifica, il riquadro dell’account ha già la sua forma.',
      },
    ],
  },
  {
    version: '0.42.2',
    date: '2026-11-09',
    title: 'Menu fermo anche sui telefoni stretti',
    changes: [
      {
        type: 'fix',
        text: 'Sui telefoni più stretti (come iPhone SE di prima generazione, o con lo zoom dello schermo) il menu con “Riprendi la partita” o “Rigioca l’ultima” in cima sta di nuovo tutto nello schermo, senza scorrere: via i sottotitoli dei modi di giocare e, se lo schermo è anche basso, il sottotitolo in cima su una riga sola.',
      },
    ],
  },
  {
    version: '0.42.1',
    date: '2026-11-04',
    title: 'Il menu sta fermo',
    changes: [
      {
        type: 'fix',
        text: 'Il menu principale non si può più trascinare né far scorrere, come la partita: niente rimbalzo su iPhone e niente “tira per aggiornare” su Android.',
      },
      {
        type: 'change',
        text: 'Sui telefoni bassi, o con le barre del browser in vista, il menu si stringe per starci tutto: corona e logo più piccoli, pulsanti più bassi e, se serve, meno scritte. Con il telefono in orizzontale va su due colonne.',
      },
    ],
  },
  {
    version: '0.42.0',
    date: '2026-11-03',
    title: 'Menu in uno schermo e partite più veloci',
    changes: [
      {
        type: 'change',
        text: 'Il menu principale sta tutto in uno schermo, anche su un telefono piccolo. In cima c’è da dove ripartire, poi i modi di giocare (contro la CPU, multiplayer, online), tre riquadri per Tutorial, Negozio e Collezione e in fondo i link a Prossimamente, Patch notes, Regole e Impostazioni.',
      },
      {
        type: 'new',
        text: 'Partita veloce: accanto a “Contro la CPU”, un tocco e la partita parte subito, con la preparazione dell’ultima volta o, la prima volta, con quella iniziale (4 giocatori e una serie casuale di 5 Contratti).',
      },
      {
        type: 'new',
        text: 'Rigioca l’ultima: quando non c’è una partita da riprendere, in cima al menu trovi l’ultima partita che hai giocato, contro la CPU o multiplayer, pronta a ripartire con la stessa preparazione.',
      },
      {
        type: 'new',
        text: 'La preparazione si ricorda: giocatori, nomi, Contratti e fazioni scelte restano anche dopo aver chiuso la pagina. Le fazioni che non hai scelto tu si pescano di nuovo a caso a ogni partita. Se una fazione o un Contratto non c’è più, quella parte torna ai valori iniziali.',
      },
      {
        type: 'change',
        text: 'Nella preparazione puoi partire da qualsiasi passaggio con “Inizia”: quelli che salti restano come sono. I pulsanti per andare avanti e per iniziare stanno sempre in fondo; se un passaggio non ci sta, scorre dentro il riquadro.',
      },
      {
        type: 'change',
        text: 'A fine Contratto i Contratti della serie sono in una striscia compatta: sul telefono icona, numero e i tuoi punti. In una serie lunga la striscia scorre di lato e parte dal prossimo Contratto.',
      },
      {
        type: 'change',
        text: '“Le tue prese” a fine Contratto si apre e si chiude toccando il titolo, che mostra sempre quante prese hai fatto e i punti della mano. Sul telefono parte chiuso, così vedi subito la classifica. Monete vinte, Cappotto e Domino si leggono sotto la classifica.',
      },
    ],
  },
  {
    version: '0.41.3',
    date: '2026-11-03',
    title: 'Fine Contratto senza scorrere',
    changes: [
      {
        type: 'change',
        text: 'Anche la schermata tra un Contratto e l’altro di una serie sta tutta nello schermo e non scorre: il Contratto appena concluso in alto, il prossimo con i pulsanti sempre in fondo. Contratti della serie, classifica e prese stanno in mezzo e, se non ci stanno, scorrono dentro.',
      },
      {
        type: 'change',
        text: 'Sul telefono il prossimo Contratto mostra solo il nome: regole e punteggio li vedi nella presentazione appena parte.',
      },
      {
        type: 'fix',
        text: 'L’icona del Contratto concluso non compare più nell’angolo in alto a sinistra dello schermo.',
      },
    ],
  },
  {
    version: '0.41.2',
    date: '2026-11-03',
    title: 'Fine partita senza scorrere',
    changes: [
      {
        type: 'change',
        text: 'Anche la schermata di fine partita sta tutta nello schermo e non scorre: il vincitore in alto, i pulsanti per rigiocare sempre in fondo. Se classifica e punti di ogni Contratto non ci stanno, scorrono dentro il riquadro.',
      },
    ],
  },
  {
    version: '0.41.1',
    date: '2026-11-03',
    title: 'La partita sta ferma',
    changes: [
      {
        type: 'fix',
        text: 'In partita la pagina non si può più trascinare: niente rimbalzo su iPhone e niente “tira per aggiornare” su Android. Dentro i pannelli lunghi, come Info e Regole, si scorre ancora.',
      },
      {
        type: 'fix',
        text: 'Mentre è aperta una finestra (tutorial, Regole, Impostazioni…) la pagina sotto resta ferma.',
      },
      {
        type: 'fix',
        text: 'Due tocchi veloci su una carta, per sceglierla e giocarla, non ingrandiscono più la pagina.',
      },
    ],
  },
  {
    version: '0.41.0',
    date: '2026-11-03',
    title: 'Riprendi la partita e Impostazioni',
    changes: [
      {
        type: 'new',
        text: 'Le partite contro la CPU e quelle multiplayer sullo stesso dispositivo si salvano dopo ogni mossa. Se la pagina si ricarica o il telefono chiude il browser, nel menu compare “Riprendi la partita” con il punto raggiunto (ad esempio “Contratto 2 di 5 · Presa 7/13”) e si riparte esattamente da lì, anche a metà di una serie o dalla fine di un Contratto.',
      },
      {
        type: 'change',
        text: 'La partita salvata si cancella a fine serie e quando esci dalla partita; iniziarne una nuova prende il suo posto. Le partite online non si salvano.',
      },
      {
        type: 'new',
        text: 'Presa successiva automatica: a fine presa la partita va avanti da sola dopo 4 secondi (oppure 2, oppure mai: si sceglie nelle Impostazioni). Una barra nel riquadro della presa mostra il tempo che manca, e si ferma mentre è aperta una finestra come Info o il menu ☰.',
      },
      {
        type: 'change',
        text: 'A fine presa basta toccare il tavolo o il riquadro della presa per passare subito alla successiva.',
      },
      {
        type: 'new',
        text: 'Nuova pagina Impostazioni, dal menu principale e dal menu ☰ in partita: suoni, vibrazione, presa successiva automatica e il tuo nome. Le scelte restano anche dopo aver chiuso la pagina.',
      },
      {
        type: 'new',
        text: 'Chi gioca senza accesso può scegliere nelle Impostazioni il nome con cui siede al tavolo, al posto di “Tu”. Con l’accesso Google si usa sempre il nome dell’account.',
      },
    ],
  },
  {
    version: '0.40.1',
    date: '2026-11-03',
    title: 'Barra nitida su iPhone',
    changes: [
      {
        type: 'fix',
        text: 'Su iPhone e iPad Safari sfuma tutto ciò che sta vicino al bordo alto dello schermo, e la barra in alto della partita risultava sfocata. Ora la barra e i pulsanti in alto delle altre schermate stanno un po’ più in basso, fuori dalla sfumatura.',
      },
      {
        type: 'fix',
        text: 'Su iPhone la mano e i pannelli che salgono dal basso lasciano libera la linea della Home.',
      },
    ],
  },
  {
    version: '0.40.0',
    date: '2026-11-03',
    title: 'Il tavolo sta tutto nello schermo',
    changes: [
      {
        type: 'change',
        text: 'In partita la pagina non scorre più, su telefono, tablet e computer: in alto c’è una barra sottile con il Contratto e la presa, al centro il tavolo si adatta allo spazio libero e in fondo la tua mano resta sempre visibile.',
      },
      {
        type: 'new',
        text: 'Il pulsante Info apre classifica, prese (con l’ultima presa carta per carta), Contratto e regole. Sul telefono il pannello sale dal basso, sul computer si apre di lato. Sui computer grandi classifica e prese restano anche accanto al tavolo.',
      },
      {
        type: 'new',
        text: 'Il menu ☰ raccoglie suoni, vibrazione, Regole ed “Esci dalla partita”.',
      },
      {
        type: 'change',
        text: 'L’esito della presa e le scelte da fare (Briscola, Reversal, recupero…) compaiono in alto sul tavolo, senza spingere giù la mano.',
      },
      {
        type: 'change',
        text: 'Con 6 giocatori o più sul telefono, ogni avversario ha un’etichetta piccola con iniziali e punti, che non copre più il tavolo.',
      },
      {
        type: 'change',
        text: 'Nel gioco sullo stesso dispositivo, “Passa il dispositivo a…” ora copre tutto lo schermo: chi riceve il telefono non vede la mano di chi ha appena giocato.',
      },
      {
        type: 'change',
        text: 'Le Regole si aprono in una finestra, divise in sezioni che si aprono e si chiudono.',
      },
    ],
  },
  {
    version: '0.39.0',
    date: '2026-11-03',
    title: 'Dai un nome alla CPU',
    changes: [
      {
        type: 'new',
        text: 'Prima della partita puoi scegliere come si chiamano gli avversari della CPU: i campi sono nel primo passaggio, sotto il numero di giocatori. Se ne lasci uno vuoto resta il nome predefinito.',
      },
      {
        type: 'new',
        text: 'Online, chi ha creato la stanza può dare un nome ai posti gestiti dalla CPU.',
      },
    ],
  },
  {
    version: '0.38.0',
    date: '2026-11-02',
    title: 'Suoni e vibrazione',
    changes: [
      {
        type: 'new',
        text: 'Il gioco ha i suoi suoni: carte giocate, prese, distribuzione, il tuo turno, monete e vittoria. Si tolgono e si rimettono con il pulsante dell’altoparlante, accanto a Regole.',
      },
      {
        type: 'new',
        text: 'Sui telefoni che lo supportano, il telefono vibra quando tocca a te. Anche la vibrazione ha il suo pulsante per toglierla.',
      },
    ],
  },
  {
    version: '0.37.0',
    date: '2026-11-02',
    title: 'Punti, turni e coriandoli',
    changes: [
      {
        type: 'new',
        text: 'A fine presa i punti del Contratto (+1, −2…) salgono dal posto di chi l’ha presa.',
      },
      {
        type: 'new',
        text: 'Il posto di chi deve giocare ha un alone dorato che pulsa, e quando tocca a te un lampo scorre sulle carte che puoi giocare.',
      },
      {
        type: 'new',
        text: 'Coriandoli quando vinci la partita.',
      },
    ],
  },
  {
    version: '0.36.0',
    date: '2026-11-02',
    title: 'Presentazione del Contratto',
    changes: [
      {
        type: 'new',
        text: 'All’inizio di ogni Contratto compare una schermata che lo presenta a tutti: nome, punteggio e regole. Poi le carte vengono distribuite ai giocatori e solo allora si comincia a giocare.',
      },
      {
        type: 'new',
        text: 'Contro la CPU e in multiplayer locale la presentazione si può chiudere prima con “Si parte”. Online dura qualche secondo per tutti e la partita parte insieme per ognuno.',
      },
    ],
  },
  {
    version: '0.35.0',
    date: '2026-11-01',
    title: 'Il mucchio vola da chi ha preso',
    changes: [
      {
        type: 'new',
        text: 'Quando parte la presa successiva, il mucchio di carte vola verso il posto di chi ha preso la presa.',
      },
      {
        type: 'new',
        text: 'Anche nel tutorial la carta che prende si alza e le altre le finiscono sotto.',
      },
    ],
  },
  {
    version: '0.34.0',
    date: '2026-11-01',
    title: 'Presa animata e logo scintillante',
    changes: [
      {
        type: 'new',
        text: 'A fine presa la carta vincente si alza in piedi sul tavolo e tutte le altre finiscono ammucchiate ai suoi piedi, così si vede subito chi ha preso.',
      },
      {
        type: 'new',
        text: 'Nel menu principale un riflesso di luce attraversa il logo NEXUM e sulla corona compaiono delle scintille.',
      },
    ],
  },
  {
    version: '0.33.0',
    date: '2026-11-01',
    title: 'Tutorial',
    changes: [
      {
        type: 'new',
        text: 'Nuovo tutorial: spiega passo per passo prese, Contratti, Briscola, Domino, punteggio, modi di gioco e monete, con delle prove da fare direttamente sulle carte.',
      },
      {
        type: 'new',
        text: 'Il tutorial si apre da solo la prima volta che entri nel gioco. Puoi rivederlo quando vuoi dal menu principale o dal pannello Regole.',
      },
    ],
  },
  {
    version: '0.32.0',
    date: '2026-10-31',
    title: 'CPU di livelli diversi',
    changes: [
      {
        type: 'new',
        text: 'Ora le CPU hanno tre livelli: facile, normale e difficile. A ogni partita il livello di ogni CPU è casuale, non si sceglie e non viene mostrato: sta a te capire chi hai davanti.',
      },
      {
        type: 'change',
        text: 'La CPU normale gioca meglio: non spreca le carte alte e prova a vincere con il minimo. La difficile ricorda anche le carte già uscite.',
      },
    ],
  },
  {
    version: '0.31.0',
    date: '2026-10-31',
    title: 'Pacchetto gratis in arrivo',
    changes: [
      {
        type: 'new',
        text: 'Nel negozio compare il pacchetto gratis: per ora è segnato come “Prossimamente” e non si può ancora aprire.',
      },
    ],
  },
  {
    version: '0.30.0',
    date: '2026-10-31',
    title: 'Negozio e collezione',
    changes: [
      {
        type: 'new',
        text: 'Nuovo negozio: un pacchetto costa 150 monete e contiene 5 carte casuali. Ogni doppione vale 5 monete.',
      },
      {
        type: 'new',
        text: 'Le monete si guadagnano vincendo, contro la CPU o online: 5 per ogni Contratto, più 25 se vinci una partita a più Contratti. Serve l’accesso con Google.',
      },
      {
        type: 'new',
        text: 'Nuova pagina Collezione: le carte trovate, i loro poteri e quelle che mancano. Per ora non cambiano le partite.',
      },
    ],
  },
  {
    version: '0.29.0',
    date: '2026-10-31',
    title: 'Il logo di NEXUM',
    changes: [
      {
        type: 'new',
        text: 'NEXUM ha il suo logo: la carta d’oro sul velluto blu. Lo vedi sulla schermata Home dell’iPhone, dopo “Aggiungi alla schermata Home”, e sulla scheda del browser.',
      },
    ],
  },
  {
    version: '0.28.0',
    date: '2026-10-31',
    title: 'QR per entrare nella stanza',
    changes: [
      {
        type: 'new',
        text: 'Chi crea la stanza vede un QR: basta inquadrarlo con il telefono per entrare.',
      },
      {
        type: 'change',
        text: 'Aprendo il QR o il link di invito si entra da soli nella stanza, appena fatto l’accesso con Google.',
      },
    ],
  },
  {
    version: '0.27.0',
    date: '2026-10-31',
    title: 'Partite online',
    changes: [
      {
        type: 'new',
        text: 'Gioca online: crea una stanza, condividi il codice o il link e giocate ognuno dal proprio dispositivo. Serve l’accesso con Google.',
      },
      {
        type: 'new',
        text: 'I posti vuoti li gioca la CPU. Chi non gioca entro 60 secondi viene sostituito dalla CPU per quel turno, così nessuno blocca la partita.',
      },
      {
        type: 'new',
        text: 'Chi crea la stanza fa da arbitro: se esce, la partita si ferma finché non rientra. Tutti possono rientrare con lo stesso codice.',
      },
    ],
  },
  {
    version: '0.26.0',
    date: '2026-10-31',
    title: 'Contratti dal King',
    changes: [
      {
        type: 'new',
        text: 'Nuovi Contratti: Non prendere 11 e 13, Non prendere i 12, Non prendere il 13 della fazione, Non prendere l’8 della fazione, Evita le ultime due e Più prese doppie.',
      },
      {
        type: 'new',
        text: 'Briscola: chi è primo di mano sceglie una fazione che batte la fazione d’apertura.',
      },
      {
        type: 'new',
        text: 'Domino: niente prese, si parte dai 7 e si attaccano le carte vicine. Chi finisce per primo prende i punti delle carte rimaste agli altri.',
      },
      {
        type: 'new',
        text: 'Cappotto: in Meno prese e Non prendere una fazione, chi prende tutto fa +13 invece delle penalità.',
      },
      {
        type: 'change',
        text: 'Limiti del King nei Contratti che penalizzano delle carte: alla prima presa niente scarti di penalità, e non si apre con la fazione bersaglio finché qualcuno non l’ha giocata.',
      },
      {
        type: 'new',
        text: 'Editor: regola sul numero nella fazione bersaglio, e nei Contratti le scelte Briscola, Limiti del King e Cappotto.',
      },
    ],
  },
  {
    version: '0.25.0',
    date: '2026-10-31',
    title: 'Finestre tutte nello stile del gioco',
    changes: [
      {
        type: 'change',
        text: 'Le richieste di conferma, come “Abbandonare la partita?”, ora sono finestre di Nexum e non più quelle grigie del browser.',
      },
      {
        type: 'change',
        text: 'Anche gli elenchi a tendina e i suggerimenti al passaggio del mouse hanno lo stile del gioco.',
      },
      {
        type: 'fix',
        text: 'L’esito della presa, il riquadro “Hai visto” e il pulsante per pagare i punti sono uniformi alle altre finestre.',
      },
      {
        type: 'new',
        text: 'Editor: nuova scelta del colore delle fazioni, con una tavolozza e il codice del colore.',
      },
    ],
  },
  {
    version: '0.24.0',
    date: '2026-10-31',
    title: 'Contratti con i numeri',
    changes: [
      {
        type: 'change',
        text: 'I Contratti dicono il numero invece di “alte” e “basse”: ora ci sono Non prendere 12 o più e Non prendere 3 o meno.',
      },
      {
        type: 'change',
        text: 'Tutto negativo conta le carte di valore 12 o più.',
      },
      {
        type: 'new',
        text: 'Nuovo Contratto: Non prendere i 9.',
      },
      {
        type: 'new',
        text: 'Editor: le regole dei Contratti possono contare le carte di un numero preciso.',
      },
    ],
  },
  {
    version: '0.23.0',
    date: '2026-10-31',
    title: 'Mazzi da 1 a 13',
    changes: [
      {
        type: 'change',
        text: 'Ogni fazione ora ha 13 carte, da 1 a 13, senza effetti.',
      },
      {
        type: 'change',
        text: 'Le carte con nomi e poteri escono dai mazzi delle fazioni: non sono state eliminate, si troveranno nei pacchetti.',
      },
      {
        type: 'change',
        text: 'Per ora non si propongono i Contratti che con questi mazzi non assegnerebbero mai punti: Non prendere carte alte, Evita The Unmade e Non prendere carte con potere.',
      },
      {
        type: 'new',
        text: 'Editor: nuova scheda “Carte dei pacchetti” per modificare le carte fuori dai mazzi.',
      },
    ],
  },
  {
    version: '0.22.0',
    date: '2026-10-29',
    title: 'Simboli delle fazioni',
    changes: [
      {
        type: 'new',
        text: 'Ogni fazione ha il suo simbolo, in filigrana sulla parte colorata delle carte: Scudo per Custodes, Eclissi per Nullarii, Volo per Auguria, Clessidra per Reliquiae, Alloro per Dominari, Bilancia per Concordia, Colonna per Axiomata e Farfalla per Conflux.',
      },
    ],
  },
  {
    version: '0.21.0',
    date: '2026-10-28',
    title: 'Nuovo stile: Pop Reale',
    changes: [
      {
        type: 'change',
        text: 'Tutto il gioco ha un nuovo aspetto: fondo avorio, contorni blu reale, ombre piene e l’oro per ciò che scegli.',
      },
      {
        type: 'change',
        text: 'Le carte sono a colore pieno: il colore della fazione con il valore grande in alto, nome e fazione nella fascia in basso. Il valore cambiato da un potere compare in un tassello d’oro.',
      },
      {
        type: 'change',
        text: 'Il tavolo è di velluto blu con il bordo d’oro, e i dorsi delle carte sono blu a righe d’oro.',
      },
      {
        type: 'change',
        text: 'Nuovo carattere, Rubik, incluso nel gioco: si vede uguale su tutti i dispositivi.',
      },
    ],
  },
  {
    version: '0.20.0',
    date: '2026-10-28',
    title: 'Tutti i poteri in gioco',
    changes: [
      {
        type: 'new',
        text: 'Ogni carta con un potere ora lo applica: niente più “potere non ancora attivo”.',
      },
      {
        type: 'new',
        text: 'Vesper Null, Ravager e Nullchild: l’avversario lo scegli tu, con un pulsante per ciascuno. La CPU sceglie chi è in testa.',
      },
      {
        type: 'new',
        text: 'Protezione: se Aegiron vince, la tua prossima carta è protetta dai poteri avversari; Pax ti protegge nella presa in cui la giochi. Chi è protetto non perde punti per i poteri degli altri.',
      },
      {
        type: 'new',
        text: 'Shift: giocandola scegli +15 o −15. Metamorph prende il valore stampato della carta giocata subito prima di lei.',
      },
      {
        type: 'new',
        text: 'Scarti e recuperi: Black Echo, Echo Prime e Mnemos riportano una carta in mano scartandone un’altra, prima che si contino i punti. Archivist prende il valore di una carta già giocata o scartata. Unwritten scartata vale 2 punti, Faded One non si scarta, Anchor blocca i recuperi.',
      },
      {
        type: 'new',
        text: 'Oblivion: se vince, tutti scartano una carta all’inizio del loro turno e la mano ha una presa in meno. Le regole sull’ultima presa valgono sull’ultima presa vera.',
      },
      {
        type: 'new',
        text: 'Second Sight e The Witness: le carte avversarie che hai visto restano nel riquadro “Hai visto” finché non vengono giocate.',
      },
      {
        type: 'change',
        text: 'Janus e Split non hanno più un potere. Pax e Archivist hanno un testo nuovo.',
      },
    ],
  },
  {
    version: '0.19.0',
    date: '2026-10-28',
    title: 'Poteri con una scelta',
    changes: [
      {
        type: 'new',
        text: 'Fury: quando la giochi puoi pagare 2 punti Contratto e farla valere 75. Nel riquadro della carta trovi il pulsante “Paga 2 punti”.',
      },
      {
        type: 'new',
        text: 'Ashen: quando la giochi puoi pagare 1 punto Contratto per ogni +20, fino a 4 volte (97). Ogni scelta ha il suo pulsante con il valore che otterrai.',
      },
      {
        type: 'new',
        text: 'Reversal: chi la cattura può annullare i punti nati da quella presa, per tutti. A fine presa compaiono “Annulla i punti” e “Tienili”; la CPU decide da sola.',
      },
      {
        type: 'change',
        text: 'Anche Palimpsest può pagare, se copia Fury o Ashen.',
      },
    ],
  },
  {
    version: '0.18.0',
    date: '2026-10-28',
    title: 'Nuovi poteri',
    changes: [
      {
        type: 'new',
        text: 'Otto poteri prendono vita: Vigil, Nullchild, Morrowshade, Paradox, Palimpsest, Balancer, Evenhand e Symmetra.',
      },
      {
        type: 'new',
        text: 'Vigil: se apre la presa, chi segue deve giocare la sua carta più alta di quella fazione. Il gioco te lo dice e solleva solo quella carta.',
      },
      {
        type: 'new',
        text: 'Nullchild: se vince la presa, l’avversario in testa salta la presa successiva; la carta che gli avanza viene scartata a fine mano.',
      },
      {
        type: 'new',
        text: 'Quando scegli una carta, sotto il suo testo vedi la regola esatta del potere.',
      },
      {
        type: 'change',
        text: 'Gravemind cresce fino a +36 invece di +15.',
      },
      {
        type: 'change',
        text: 'Foreseer, Locke, Sibyl, Decima e Usurper non hanno più un potere. Reversal, Black Echo e Gravemind hanno un testo nuovo.',
      },
      {
        type: 'change',
        text: 'Editor: le modifiche alle carte decise fuori dall’Editor compaiono in un riquadro e si applicano alla bozza con un pulsante, prima di pubblicarle.',
      },
    ],
  },
  {
    version: '0.17.0',
    date: '2026-10-28',
    title: 'Icone disegnate e nuova fine mano',
    changes: [
      {
        type: 'new',
        text: 'Nuova schermata tra due Contratti: vedi a che punto è la serie, chi sale e chi scende in classifica, le prese che hai vinto con le carte che hanno contato e il prossimo Contratto con le sue regole.',
      },
      {
        type: 'change',
        text: 'Menu, Contratti e formati della serie hanno icone disegnate per NEXUM al posto delle emoji.',
      },
      {
        type: 'change',
        text: 'I formati della serie si riconoscono a colpo d’occhio: il dado vuol dire casuale e la spunta a scelta; due elementi indicano una serie, uno solo un Contratto.',
      },
      {
        type: 'change',
        text: 'Editor: i Contratti predefiniti mostrano la loro icona disegnata, quelli nuovi continuano a usare un’emoji.',
      },
    ],
  },
  {
    version: '0.16.0',
    date: '2026-10-28',
    title: 'Tavolo 3D',
    changes: [
      {
        type: 'new',
        text: 'La partita si gioca su un tavolo in prospettiva: gli avversari siedono attorno con il ventaglio delle loro carte coperte, e ogni carta giocata finisce sul panno davanti a chi l’ha giocata.',
      },
      {
        type: 'new',
        text: 'La tua mano è un ventaglio. Scegli una carta per leggerne il potere, poi sceglila di nuovo (o premi “Gioca”) per giocarla; Esc la rimette giù.',
      },
      {
        type: 'new',
        text: 'Nel multiplayer sullo stesso dispositivo il tavolo gira: in basso siede sempre chi ha il dispositivo, e la sua mano resta coperta finché non la mostra.',
      },
      {
        type: 'change',
        text: 'La carta che prende la presa si illumina d’oro e accanto al giocatore compare “prende”; l’avatar di chi sta giocando è evidenziato.',
      },
      {
        type: 'change',
        text: 'In partita il pulsante “Regole” è nel riquadro del Contratto, per lasciare più spazio al tavolo.',
      },
      {
        type: 'fix',
        text: 'L’esito della presa dice “Prendi tu la presa…” invece di “Tu prende la presa…”.',
      },
    ],
  },
  {
    version: '0.15.0',
    date: '2026-10-27',
    title: 'Prossimamente',
    changes: [
      {
        type: 'new',
        text: 'Nuova voce “Prossimamente” nel menu principale: le novità in arrivo, come deckbuilding, pacchetti da aprire, collezione e gioco online.',
      },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-10-27',
    title: 'Editor di carte e Contratti',
    changes: [
      {
        type: 'new',
        text: 'Editor per l’autore del gioco: modifica di fazioni, carte e Contratti, creazione di nuove fazioni da 13 carte e di nuovi Contratti.',
      },
      {
        type: 'new',
        text: 'Le modifiche restano in bozza finché non vengono pubblicate; da quel momento valgono per le nuove partite di tutti.',
      },
      {
        type: 'change',
        text: 'I Contratti sono fatti di regole di punteggio combinabili. I 10 Contratti esistenti assegnano esattamente gli stessi punti di prima.',
      },
      { type: 'change', text: 'La CPU legge le regole di ogni Contratto, quindi sa giocare anche quelli nuovi.' },
      { type: 'change', text: 'Il testo dei punti di ogni Contratto viene scritto automaticamente dalle sue regole.' },
      {
        type: 'change',
        text: 'Con la serie casuale, “Tutto negativo” resta disponibile anche senza Nullarii nel mazzo: le altre sue regole contano comunque.',
      },
    ],
  },
  {
    version: '0.13.0',
    date: '2026-10-27',
    title: 'Serie di Contratti',
    changes: [
      {
        type: 'new',
        text: 'Nuova preparazione in tre passi: prima quanti giocatori, poi come giocare i Contratti, infine le fazioni.',
      },
      {
        type: 'new',
        text: 'Serie di Contratti: casuale (3, 5 o tutti) oppure a scelta, nell’ordine che preferisci. I punti si sommano e vince chi ha il totale più alto.',
      },
      { type: 'new', text: 'Si può giocare anche un solo Contratto, estratto a caso o scelto.' },
      {
        type: 'new',
        text: 'Tra un Contratto e l’altro: classifica della serie e anteprima del prossimo Contratto. A fine serie: tabella con i punti di ogni Contratto.',
      },
      {
        type: 'change',
        text: 'I Contratti casuali escludono quelli che riguardano fazioni assenti dal mazzo (es. Evita The Unmade senza Nullarii).',
      },
      {
        type: 'change',
        text: 'In “Non prendere una fazione” la fazione bersaglio può essere scelta o estratta a caso.',
      },
    ],
  },
  {
    version: '0.12.0',
    date: '2026-10-27',
    title: 'Accesso con Google',
    changes: [
      { type: 'new', text: 'Dal menu principale si può accedere con il proprio account Google. È facoltativo: si gioca anche senza.' },
      { type: 'new', text: 'Chi ha fatto l’accesso gioca con il proprio nome, contro la CPU e in multiplayer.' },
      { type: 'new', text: 'L’accesso resta attivo anche alla riapertura del sito, finché non si preme “Esci”.' },
    ],
  },
  {
    version: '0.11.0',
    date: '2026-10-27',
    title: 'Menu principale',
    changes: [
      {
        type: 'new',
        text: 'All’apertura del sito c’è il menu principale: Gioca contro la CPU, Gioca multiplayer, Gioca online (prossimamente) e Patch notes.',
      },
      { type: 'new', text: 'Pagina Patch notes con la storia di tutti gli aggiornamenti.' },
      { type: 'new', text: 'A fine mano si può tornare direttamente al menu principale.' },
      {
        type: 'change',
        text: 'La modalità di gioco si sceglie dal menu: la preparazione mostra solo giocatori, Contratto e fazioni.',
      },
    ],
  },
  {
    version: '0.10.0',
    date: '2026-10-27',
    title: 'Nexum diventa una web app',
    changes: [
      { type: 'new', text: 'Prima versione online, giocabile dal browser di computer e telefono.' },
      {
        type: 'new',
        text: 'Due modalità: contro la CPU e più giocatori sullo stesso dispositivo, con la mano coperta tra un turno e l’altro.',
      },
      { type: 'new', text: 'Nomi personalizzabili per i giocatori sullo stesso dispositivo.' },
      {
        type: 'change',
        text: 'Stesse regole del simulatore v0.9: 8 fazioni, 10 Contratti e 19 poteri attivi.',
      },
      { type: 'change', text: 'Le carte con un potere non ancora attivo lo indicano sulla carta.' },
      { type: 'fix', text: 'I colori delle fazioni sono gli stessi nel menu e sulle carte.' },
      {
        type: 'fix',
        text: 'Uscendo durante il turno della CPU, la sua mossa non finisce più nella partita successiva.',
      },
      {
        type: 'fix',
        text: 'Avviso quando il Contratto riguarda una fazione assente dal mazzo (es. Evita The Unmade senza Nullarii).',
      },
    ],
  },
  {
    version: '0.9',
    title: 'Simulatore',
    changes: [
      {
        type: 'new',
        text: 'Prototipo in un unico file: mazzo comune, 13 carte a giocatore, 10 Contratti, partite contro la CPU e sullo stesso dispositivo.',
      },
    ],
  },
];
