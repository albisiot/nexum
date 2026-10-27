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
