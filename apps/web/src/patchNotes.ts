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
