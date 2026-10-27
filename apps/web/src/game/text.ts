import { CONTRACTS, FACTIONS, getCard } from '@nexum/engine';
import type { PlayerView, TrickNote, TrickResult } from '@nexum/engine';

export const plural = (n: number, one: string, many: string) => `${n} ${Math.abs(n) === 1 ? one : many}`;
export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function contractTitle(view: PlayerView): string {
  const c = CONTRACTS[view.contract];
  return `${c.icon} ${c.name}`;
}

export function contractDescription(view: PlayerView): string {
  const c = CONTRACTS[view.contract];
  return c.needsTarget && view.targetFaction ? `${c.desc} Fazione bersaglio: ${FACTIONS[view.targetFaction].name}.` : c.desc;
}

export function describeNote(note: TrickNote, names: readonly string[]): string {
  switch (note.type) {
    case 'axiom':
      return 'Axiom annulla gli altri effetti di valore della presa.';
    case 'measure':
      return 'Measure limita i valori finali tra 10 e 90.';
    case 'tieBreak':
      return 'Pareggio di valore finale: vince la carta con il valore stampato più basso.';
    case 'valueChanged':
      return `${names[note.player]}: ${getCard(note.cardId).name} diventa ${note.value}.`;
    case 'scoreChanged': {
      const card = getCard(note.cardId).name;
      return note.points > 0
        ? `${card}: ${names[note.target]} ${signed(note.points)} punti Contratto.`
        : `${card}: ${names[note.target]} perde ${plural(-note.points, 'punto', 'punti')} Contratto.`;
    }
    case 'nextModifier':
      return `${getCard(note.cardId).name}: ${signed(note.amount)} alla prossima carta di ${names[note.target]}.`;
  }
}

export function describeTrick(trick: TrickResult, names: readonly string[]): string {
  const card = getCard(trick.winningCardId);
  return `${names[trick.winner]} prende la presa ${trick.trickNo} con ${card.name} (${trick.winningValue}) · fazione d’apertura ${FACTIONS[trick.leadFaction].name}.`;
}
