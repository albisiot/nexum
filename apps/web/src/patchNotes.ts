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
