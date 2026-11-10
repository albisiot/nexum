import {
  CARDS_PER_FACTION,
  HAND_LENGTHS,
  POWERS,
  contractNeedsTarget,
  dominoStartValue,
  factionDeck,
  getCard,
  getCatalog,
  getContract,
  getFaction,
  slamPoints,
} from '@nexum/engine';
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
  const long = view.cardsPerFaction !== CARDS_PER_FACTION;
  const extra = [
    contractNeedsTarget(c) && view.targetFaction ? `Fazione bersaglio: ${getFaction(view.targetFaction).name}.` : '',
    view.trump ? `Briscola: ${getFaction(view.trump).name}.` : '',
    c.mode === 'domino' && long && view.factions[0]
      ? `Con ${view.cardsPerFaction} carte si parte dal ${dominoStartValue(view.factions[0], view.cardsPerFaction)}.`
      : '',
  ];
  return [c.desc, ...extra].filter(Boolean).join(' ');
}

/** Nome del Contratto di una mano, con la fazione bersaglio; l'icona la disegna ContractIcon. */
export function handLabel(h: HandPlan): string {
  const c = getContract(h.contract);
  return `${c.name}${h.targetFaction ? ` (${getFaction(h.targetFaction).name})` : ''}`;
}

const factionName = (catalog: Catalog, id: string) => catalog.factions.find((f) => f.id === id)?.name ?? 'eliminata';
const cardName = (catalog: Catalog, id: string) =>
  [...catalog.cards, ...(catalog.packCards ?? [])].find((c) => c.id === id)?.name ?? 'una carta eliminata';

/**
 * Per chi descrive una regola: `long` per i Contratti delle mani lunghe (le prese finali diventano "le ultime"),
 * `cardsPerFaction` quando si sa la lunghezza della mano (si scrivono i valori delle carte più alte e i punti del Cappotto).
 */
export interface RuleContext {
  long?: boolean;
  cardsPerFaction?: number;
}

/** I valori delle `count` carte più alte di una fazione nella mano: "il 25", "23–25". Vuoto se non si sa la lunghezza. */
function topValues(count: number, ctx: RuleContext): string {
  const size = ctx.cardsPerFaction;
  const first = getCatalog().factions[0];
  if (size === undefined || !first) return '';
  const values = factionDeck(first.id, size)
    .map((c) => c.value)
    .sort((a, b) => b - a)
    .slice(0, count);
  if (!values.length) return '';
  return values.length === 1 ? ` (il ${values[0]})` : ` (${values.at(-1)}–${values[0]})`;
}

function filterText(filter: CardFilter, catalog: Catalog, ctx: RuleContext): string {
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
    case 'exactValue':
      return ` di valore ${filter.value}`;
    case 'targetValue':
      return ` di valore ${filter.value} della fazione bersaglio`;
    case 'hasPower':
      return ' con un potere';
    case 'card':
      return '';
    case 'top':
      return `${filter.count === 1 ? ' che è la più alta della sua fazione' : ` tra le ${filter.count} più alte della sua fazione`}${topValues(filter.count, ctx)}`;
    case 'targetTop':
      return `${filter.count === 1 ? ' che è la più alta della fazione bersaglio' : ` tra le ${filter.count} più alte della fazione bersaglio`}${topValues(filter.count, ctx)}`;
  }
}

/** Le prese di un intervallo. Nei Contratti per mani lunghe quelli che arrivano alla 13 sono "le ultime". */
function tricksText(rule: ScoringRule, ctx: RuleContext): string {
  if (!rule.tricks) return '';
  const { from, to } = rule.tricks;
  if (ctx.long && to >= CARDS_PER_FACTION) {
    if (from <= 1) return '';
    const count = to - from + 1;
    return count === 1 ? ' (solo l’ultima presa)' : ` (solo le ultime ${count} prese)`;
  }
  return from === to ? ` (solo presa ${from})` : ` (solo prese ${from}–${to})`;
}

/**
 * Una regola di punteggio in parole, es. "−1 per ogni carta catturata di valore 12 o più".
 * `catalog` serve all'Editor per descrivere regole che usano fazioni o carte non ancora pubblicate.
 */
export function describeRule(rule: ScoringRule, catalog: Catalog = getCatalog(), ctx: RuleContext = {}): string {
  if (rule.per === 'trick') {
    if (rule.tricks && ctx.long && rule.tricks.from === rule.tricks.to && rule.tricks.to >= CARDS_PER_FACTION) {
      return `${points(rule.points)} a chi vince l’ultima presa`;
    }
    if (rule.tricks && rule.tricks.from === rule.tricks.to) return `${points(rule.points)} a chi vince la presa ${rule.tricks.from}`;
    return `${points(rule.points)} per ogni presa vinta${tricksText(rule, ctx)}`;
  }
  const filter = rule.filter ?? { kind: 'any' };
  if (filter.kind === 'card') return `${points(rule.points)} a chi cattura ${cardName(catalog, filter.cardId)}${tricksText(rule, ctx)}`;
  if (filter.kind === 'targetValue') return `${points(rule.points)} a chi cattura il ${filter.value} della fazione bersaglio${tricksText(rule, ctx)}`;
  if (filter.kind === 'targetTop' && filter.count === 1) {
    return `${points(rule.points)} a chi cattura la più alta della fazione bersaglio${topValues(1, ctx)}${tricksText(rule, ctx)}`;
  }
  return `${points(rule.points)} per ogni carta catturata${filterText(filter, catalog, ctx)}${tricksText(rule, ctx)}`;
}

/** I punti del Cappotto: con le mani lunghe crescono con le carte per fazione. */
function slamText(contract: ContractDef, cardsPerFaction: number | undefined): string {
  if (!contract.slam) return '';
  if (cardsPerFaction !== undefined) return `${points(slamPoints(contract, cardsPerFaction)!)} a chi prende tutto`;
  if (!contract.long) return `${points(contract.slam)} a chi prende tutto`;
  const lengths = HAND_LENGTHS.filter((n) => n > CARDS_PER_FACTION);
  const low = slamPoints(contract, lengths[0]!)!;
  const high = slamPoints(contract, lengths.at(-1)!)!;
  return `da ${points(low)} a ${points(high)} a chi prende tutto, secondo le carte per fazione`;
}

/**
 * Il punteggio del Contratto in parole. Con `cardsPerFaction` (preparazione e partita) si scrivono i valori veri
 * della mano; senza (Editor) si descrive la regola per qualsiasi lunghezza.
 */
export function describeScoring(contract: ContractDef, catalog: Catalog = getCatalog(), cardsPerFaction?: number): string {
  if (contract.mode === 'domino') return '−1 per ogni carta rimasta in mano · quei punti vanno a chi finisce per primo';
  const ctx: RuleContext = { long: !!contract.long, cardsPerFaction };
  const extras = [
    contract.trump ? 'briscola scelta dal primo di mano' : '',
    slamText(contract, cardsPerFaction),
    contract.limits ? 'limiti del King' : '',
  ];
  return [...contract.rules.map((r) => describeRule(r, catalog, ctx)), ...extras].filter(Boolean).join(' · ');
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
    case 'shielded':
      return `${getCard(note.cardId).name}: ${names[note.player]} è protetto e non perde punti.`;
    case 'protectNext':
      return `${getCard(note.cardId).name}: la prossima carta di ${names[note.player]} è protetta.`;
    case 'borrowed':
      return `${getCard(note.cardId).name} di ${names[note.player]} prende il valore ${note.value}.`;
    case 'recovered': {
      const taken = getCard(note.taken).name;
      const discarded = getCard(note.discarded).name;
      return `${getCard(note.cardId).name}: ${names[note.player]} riprende in mano ${taken} e scarta ${discarded}.`;
    }
    case 'anchor':
      return `${getCard(note.cardId).name}: in questa presa nessuno può recuperare carte.`;
    case 'oblivion':
      return `${getCard(note.cardId).name}: tutti scartano una carta all’inizio del loro turno e la mano ha una presa in meno.`;
    case 'seen':
      return note.target === null
        ? `${getCard(note.cardId).name}: ${names[note.player]} guarda una carta di ogni avversario.`
        : `${getCard(note.cardId).name}: ${names[note.player]} guarda la mano di ${names[note.target]}.`;
  }
}

export function describeTrick(trick: TrickResult, names: readonly string[]): string {
  const card = getCard(trick.winningCardId);
  const name = names[trick.winner];
  // "Tu" è il nome di chi gioca senza account: la frase va alla seconda persona.
  const who = name === 'Tu' ? 'Prendi tu' : `${name} prende`;
  const how = card.faction === trick.leadFaction ? `fazione d’apertura ${getFaction(trick.leadFaction).name}` : `briscola, su fazione d’apertura ${getFaction(trick.leadFaction).name}`;
  return `${who} la presa ${trick.trickNo} con ${card.name} (${trick.winningValue}) · ${how}.`;
}
