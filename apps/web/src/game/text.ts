import { POWERS, contractNeedsTarget, getCard, getCatalog, getContract, getFaction } from '@nexum/engine';
import type {
  CardFilter,
  Catalog,
  ContractDef,
  HandPlan,
  PlayerView,
  ScoringRule,
  TrickNote,
  TrickResult,
} from '@nexum/engine';

export const plural = (n: number, one: string, many: string) => `${n} ${Math.abs(n) === 1 ? one : many}`;
export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
/** Punti con il segno meno tipografico, per i testi delle regole. */
const points = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Nome del Contratto in gioco; l'icona la disegna ContractIcon. */
export function contractTitle(view: PlayerView): string {
  return getContract(view.contract).name;
}

export function contractDescription(view: PlayerView): string {
  const c = getContract(view.contract);
  return contractNeedsTarget(c) && view.targetFaction
    ? `${c.desc} Fazione bersaglio: ${getFaction(view.targetFaction).name}.`
    : c.desc;
}

/** Nome del Contratto di una mano, con la fazione bersaglio; l'icona la disegna ContractIcon. */
export function handLabel(h: HandPlan): string {
  const c = getContract(h.contract);
  return `${c.name}${h.targetFaction ? ` (${getFaction(h.targetFaction).name})` : ''}`;
}

const factionName = (catalog: Catalog, id: string) => catalog.factions.find((f) => f.id === id)?.name ?? 'eliminata';
const cardName = (catalog: Catalog, id: string) => catalog.cards.find((c) => c.id === id)?.name ?? 'una carta eliminata';

function filterText(filter: CardFilter, catalog: Catalog): string {
  switch (filter.kind) {
    case 'any':
      return '';
    case 'faction':
      return filter.faction === 'target'
        ? ' della fazione bersaglio'
        : ` della fazione ${factionName(catalog, filter.faction)}`;
    case 'minValue':
      return ` di valore ${filter.value} o più`;
    case 'maxValue':
      return ` di valore ${filter.value} o meno`;
    case 'hasPower':
      return ' con un potere';
    case 'card':
      return '';
  }
}

function tricksText(rule: ScoringRule): string {
  if (!rule.tricks) return '';
  const { from, to } = rule.tricks;
  return from === to ? ` (solo presa ${from})` : ` (solo prese ${from}–${to})`;
}

/**
 * Una regola di punteggio in parole, es. "−1 per ogni carta catturata di valore 80 o più".
 * `catalog` serve all'Editor per descrivere regole che usano fazioni o carte non ancora pubblicate.
 */
export function describeRule(rule: ScoringRule, catalog: Catalog = getCatalog()): string {
  if (rule.per === 'trick') {
    if (rule.tricks && rule.tricks.from === rule.tricks.to) return `${points(rule.points)} a chi vince la presa ${rule.tricks.from}`;
    return `${points(rule.points)} per ogni presa vinta${tricksText(rule)}`;
  }
  const filter = rule.filter ?? { kind: 'any' };
  if (filter.kind === 'card') return `${points(rule.points)} a chi cattura ${cardName(catalog, filter.cardId)}${tricksText(rule)}`;
  return `${points(rule.points)} per ogni carta catturata${filterText(filter, catalog)}${tricksText(rule)}`;
}

export function describeScoring(contract: ContractDef, catalog: Catalog = getCatalog()): string {
  return contract.rules.map((r) => describeRule(r, catalog)).join(' · ');
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
        ? `${card}: ${names[note.target]} +${plural(note.points, 'punto', 'punti')} Contratto.`
        : `${card}: ${names[note.target]} perde ${plural(-note.points, 'punto', 'punti')} Contratto.`;
    }
    case 'nextModifier':
      return `${getCard(note.cardId).name}: ${signed(note.amount)} alla prossima carta di ${names[note.target]}.`;
    case 'powerCopied':
      return `${getCard(note.cardId).name} di ${names[note.player]} copia il potere di ${POWERS[note.power]?.name ?? note.power}.`;
    case 'skipNext':
      return `${getCard(note.cardId).name}: ${names[note.target]} salta la prossima presa.`;
    case 'pointsPaid': {
      const who = names[note.player] === 'Tu' ? 'paghi' : `${names[note.player]} paga`;
      return `${getCard(note.cardId).name}: ${who} ${plural(note.points, 'punto', 'punti')} Contratto per potenziarla.`;
    }
    case 'reversal': {
      const you = names[note.player] === 'Tu';
      const verb = note.cancelled ? (you ? 'annulli' : 'annulla') : you ? 'tieni' : 'tiene';
      return `${getCard(note.cardId).name}: ${you ? '' : `${names[note.player]} `}${verb} i punti di questa presa.`;
    }
  }
}

export function describeTrick(trick: TrickResult, names: readonly string[]): string {
  const card = getCard(trick.winningCardId);
  const name = names[trick.winner];
  // "Tu" è il nome di chi gioca senza account: la frase va alla seconda persona.
  const who = name === 'Tu' ? 'Prendi tu' : `${name} prende`;
  return `${who} la presa ${trick.trickNo} con ${card.name} (${trick.winningValue}) · fazione d’apertura ${getFaction(trick.leadFaction).name}.`;
}
