// Novità in arrivo mostrate nella pagina "Prossimamente".
// Quando una voce viene rilasciata, toglierla da qui e raccontarla nelle patch notes.

export type RoadmapStatus = 'inProgress' | 'planned' | 'idea';

export interface RoadmapItem {
  icon: string;
  title: string;
  status: RoadmapStatus;
  text: string;
}

export const ROADMAP_STATUS: Record<RoadmapStatus, { label: string; hint: string }> = {
  inProgress: { label: 'In sviluppo', hint: 'Ci stiamo lavorando adesso.' },
  planned: { label: 'In programma', hint: 'È deciso: arriverà.' },
  idea: { label: 'Idea', hint: 'Da valutare.' },
};

export const ROADMAP: RoadmapItem[] = [
  {
    icon: '⚡',
    title: 'Nuovi poteri',
    status: 'planned',
    text: 'Le carte con i poteri sono già programmate: torneranno in partita con i pacchetti e il deckbuilding, insieme a qualche ritocco.',
  },
  {
    icon: '🃏',
    title: 'Deckbuilding',
    status: 'planned',
    text: 'Componi il tuo mazzo personale scegliendo le carte da portare in partita, invece di usare solo fazioni intere.',
  },
  {
    icon: '🎁',
    title: 'Pacchetti da aprire',
    status: 'planned',
    text: 'Apri pacchetti di carte e scopri nuovi personaggi da aggiungere alla tua collezione.',
  },
  {
    icon: '📚',
    title: 'Collezione',
    status: 'planned',
    text: 'Un album con tutte le carte che hai trovato, i loro poteri e quelle che ti mancano.',
  },
  {
    icon: '🌐',
    title: 'Gioca online',
    status: 'planned',
    text: 'Partite con gli amici, ognuno dal proprio dispositivo, in stanze private.',
  },
  {
    icon: '📊',
    title: 'Statistiche',
    status: 'idea',
    text: 'Partite giocate e vinte, Contratti e fazioni preferite, legate al tuo account Google.',
  },
];
