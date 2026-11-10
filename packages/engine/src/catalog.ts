// Catalogo attivo: fazioni, carte e Contratti con cui si gioca.
// Parte dai dati predefiniti; l'app può sostituirlo con la versione pubblicata dall'Editor.
import {
  CARDS_PER_FACTION,
  MAX_CARD_VALUE,
  MAX_CARDS_PER_FACTION,
  MAX_PLAYERS,
  MIN_CARD_VALUE,
  TRICKS_PER_HAND,
} from './constants';
import { LONG_HANDS_UPDATE } from './data/catalogUpdates';
import { DEFAULT_CATALOG } from './data/defaultCatalog';
import { POWERS } from './powerList';
import type {
  CardDef,
  CardFilter,
  Catalog,
  ContractDef,
  ContractId,
  FactionDef,
  FactionId,
  ScoringRule,
} from './types';

let active: Catalog;
let factionIndex = new Map<FactionId, FactionDef>();
let cardIndex = new Map<string, CardDef>();
let contractIndex = new Map<ContractId, ContractDef>();
/** Per fazione: le carte del catalogo e dopo le carte base aggiunte per le mani lunghe, fino a MAX_CARDS_PER_FACTION. */
let longDecks = new Map<FactionId, CardDef[]>();

function activate(catalog: Catalog): void {
  active = withLongContracts(JSON.parse(JSON.stringify(catalog)) as Catalog);
  factionIndex = new Map(active.factions.map((f) => [f.id, f]));
  longDecks = new Map(active.factions.map((f) => [f.id, longDeck(f)]));
  // Anche le carte dei pacchetti e quelle delle mani lunghe si possono cercare per codice,
  // ma nei mazzi finiscono solo le carte delle fazioni (factionDeck).
  cardIndex = new Map(
    [...active.cards, ...(active.packCards ?? []), ...[...longDecks.values()].flat()].map((c) => [c.id, c]),
  );
  contractIndex = new Map(active.contracts.map((c) => [c.id, c]));
}

/**
 * I Contratti per le mani lunghe arrivano anche con un catalogo pubblicato prima che esistessero, senza ripubblicarlo.
 * Quando l'autore applica l'aggiornamento nell'Editor (appliedUpdates), vale quello che ha pubblicato lui.
 */
function withLongContracts(catalog: Catalog): Catalog {
  if (catalog.appliedUpdates?.includes(LONG_HANDS_UPDATE.id)) return catalog;
  const missing = (LONG_HANDS_UPDATE.contracts ?? []).filter((k) => !catalog.contracts.some((c) => c.id === k.id));
  if (!missing.length) return catalog;
  return { ...catalog, contracts: [...catalog.contracts, ...(JSON.parse(JSON.stringify(missing)) as ContractDef[])] };
}

/**
 * Le carte della fazione per le mani lunghe: quelle del catalogo, poi carte base senza poteri con i valori che
 * mancano, dal più basso. Con i mazzi da 1 a 13 sono le carte dal 14 al 25, chiamate come le altre ("Axiomata 14").
 * Non stanno nel catalogo: così funzionano anche con un catalogo pubblicato prima delle mani lunghe.
 */
function longDeck(faction: FactionDef): CardDef[] {
  const own = active.cards.filter((c) => c.faction === faction.id);
  const values = new Set(own.map((c) => c.value));
  const ids = new Set([...active.cards, ...(active.packCards ?? [])].map((c) => c.id));
  const extra: CardDef[] = [];
  for (let value = MIN_CARD_VALUE; own.length + extra.length < MAX_CARDS_PER_FACTION && value <= MAX_CARD_VALUE; value++) {
    if (values.has(value)) continue;
    let id = `${faction.id}-n${value}`;
    while (ids.has(id)) id += '+';
    extra.push({ id, faction: faction.id, name: `${faction.name} ${value}`, value, effect: '' });
  }
  return [...own, ...extra];
}

activate(DEFAULT_CATALOG);

/** Sostituisce il catalogo attivo. Lancia un errore se non è valido. */
export function setCatalog(catalog: Catalog): void {
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(`Catalogo non valido: ${errors.join(' ')}`);
  activate(catalog);
}

export function getCatalog(): Catalog {
  return active;
}

export function factions(): FactionDef[] {
  return active.factions;
}

export function factionIds(): FactionId[] {
  return active.factions.map((f) => f.id);
}

export function getFaction(id: FactionId): FactionDef {
  const faction = factionIndex.get(id);
  if (!faction) throw new Error(`Fazione sconosciuta: ${id}`);
  return faction;
}

/** Le 13 carte della fazione nel catalogo. */
export function factionCards(faction: FactionId): CardDef[] {
  return active.cards.filter((c) => c.faction === faction);
}

/** Le carte della fazione in una mano da `cardsPerFaction` carte: le 13 del catalogo e, nelle mani lunghe, quelle dal 14 in su. */
export function factionDeck(faction: FactionId, cardsPerFaction: number = CARDS_PER_FACTION): CardDef[] {
  if (cardsPerFaction <= CARDS_PER_FACTION) return factionCards(faction);
  const deck = longDecks.get(faction);
  if (!deck) throw new Error(`Fazione sconosciuta: ${faction}`);
  return deck.slice(0, cardsPerFaction);
}

/** Quante carte della fazione, nella mano da `cardsPerFaction` carte, sono più alte di questa (0 = la più alta). */
function rankFromTop(card: CardDef, cardsPerFaction: number): number {
  return factionDeck(card.faction, cardsPerFaction).filter((c) => c.value > card.value).length;
}

/** Il Contratto è della sezione giusta: i normali con 13 carte per fazione, quelli delle mani lunghe con di più. */
export function contractFitsHand(contract: ContractDef, cardsPerFaction: number = CARDS_PER_FACTION): boolean {
  return !!contract.long === cardsPerFaction > CARDS_PER_FACTION;
}

/** I punti del Cappotto crescono con le carte: +13 con 13 carte diventa +25 con 25. */
export function slamPoints(contract: ContractDef, cardsPerFaction: number = CARDS_PER_FACTION): number | undefined {
  if (contract.slam === undefined) return undefined;
  return Math.round((contract.slam * cardsPerFaction) / CARDS_PER_FACTION);
}

/** Le carte fuori dai mazzi, che si troveranno nei pacchetti. */
export function packCards(): CardDef[] {
  return active.packCards ?? [];
}

export function getCard(id: string): CardDef {
  const card = cardIndex.get(id);
  if (!card) throw new Error(`Carta sconosciuta: ${id}`);
  return card;
}

export function contracts(): ContractDef[] {
  return active.contracts;
}

export function getContract(id: ContractId): ContractDef {
  const contract = contractIndex.get(id);
  if (!contract) throw new Error(`Contratto sconosciuto: ${id}`);
  return contract;
}

export function hasPowerText(card: CardDef): boolean {
  return card.effect.trim() !== '';
}

/** Il Contratto conta le carte della fazione bersaglio, che va scelta a inizio mano. */
export function contractNeedsTarget(contract: ContractDef): boolean {
  return contract.rules.some(
    (r) =>
      (r.filter?.kind === 'faction' && r.filter.faction === 'target') ||
      r.filter?.kind === 'targetValue' ||
      r.filter?.kind === 'targetTop',
  );
}

/** Fazione senza la quale la regola non assegna mai punti (null se funziona con qualsiasi mazzo). */
export function ruleRequiredFaction(rule: ScoringRule, catalog: Catalog = active): FactionId | null {
  const f = rule.filter;
  if (rule.per !== 'card' || !f) return null;
  if (f.kind === 'faction' && f.faction !== 'target') return f.faction;
  if (f.kind === 'card') return catalog.cards.find((c) => c.id === f.cardId)?.faction ?? null;
  return null;
}

/** Fazioni senza le quali almeno una regola del Contratto non assegnerebbe mai punti. */
export function contractRequiredFactions(contract: ContractDef, catalog: Catalog = active): FactionId[] {
  const needed = contract.rules.map((r) => ruleRequiredFaction(r, catalog)).filter((f) => f !== null);
  return [...new Set(needed)];
}

/** Il Contratto ha senso con queste fazioni: almeno una regola può assegnare punti con le carte di quei mazzi. */
export function contractPlayableWith(contract: ContractDef, factions: readonly FactionId[]): boolean {
  if (contract.mode === 'domino') return factions.length > 0;
  return contract.rules.some((r) => {
    if (r.per === 'trick') return true;
    const filter = r.filter ?? { kind: 'any' };
    if ((filter.kind === 'faction' && filter.faction === 'target') || filter.kind === 'top' || filter.kind === 'targetTop') {
      return factions.length > 0;
    }
    if (filter.kind === 'targetValue') return active.cards.some((c) => factions.includes(c.faction) && c.value === filter.value);
    return active.cards.some((c) => factions.includes(c.faction) && cardMatches(filter, c));
  });
}

/** La carta rispetta il filtro? `cardsPerFaction` serve ai filtri sulle carte più alte, che dipendono dalla lunghezza della mano. */
export function cardMatches(
  filter: CardFilter,
  card: CardDef,
  targetFaction?: FactionId,
  cardsPerFaction: number = CARDS_PER_FACTION,
): boolean {
  switch (filter.kind) {
    case 'any':
      return true;
    case 'faction':
      return card.faction === (filter.faction === 'target' ? targetFaction : filter.faction);
    case 'minValue':
      return card.value >= filter.value;
    case 'maxValue':
      return card.value <= filter.value;
    case 'exactValue':
      return card.value === filter.value;
    case 'targetValue':
      return card.value === filter.value && card.faction === targetFaction;
    case 'hasPower':
      return hasPowerText(card);
    case 'card':
      return card.id === filter.cardId;
    case 'top':
      return rankFromTop(card, cardsPerFaction) < filter.count;
    case 'targetTop':
      return card.faction === targetFaction && rankFromTop(card, cardsPerFaction) < filter.count;
  }
}

const COLOR = /^#[0-9a-fA-F]{6}$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;

/** Controlla un catalogo e restituisce i problemi in italiano (vuoto se è valido). */
export function validateCatalog(catalog: Catalog): string[] {
  const errors: string[] = [];
  const factionIdsSeen = new Set<string>();

  if (catalog.factions.length < MAX_PLAYERS) {
    errors.push(`Servono almeno ${MAX_PLAYERS} fazioni, perché si può giocare fino in ${MAX_PLAYERS}.`);
  }
  for (const f of catalog.factions) {
    const label = f.name || f.id;
    if (!ID.test(f.id)) errors.push(`La fazione “${label}” ha un codice non valido.`);
    if (factionIdsSeen.has(f.id)) errors.push(`Il codice di fazione “${f.id}” è usato due volte.`);
    factionIdsSeen.add(f.id);
    if (!f.name.trim()) errors.push(`Una fazione (${f.id}) non ha nome.`);
    if (!COLOR.test(f.color)) errors.push(`La fazione “${label}” ha un colore non valido.`);

    const cards = catalog.cards.filter((c) => c.faction === f.id);
    if (cards.length !== CARDS_PER_FACTION) {
      errors.push(`La fazione “${label}” ha ${cards.length} carte invece di ${CARDS_PER_FACTION}.`);
    }
    const values = new Set<number>();
    for (const c of cards) {
      if (values.has(c.value)) errors.push(`Nella fazione “${label}” il valore ${c.value} è usato due volte.`);
      values.add(c.value);
    }
  }

  const cardIds = new Set<string>();
  for (const c of [...catalog.cards, ...(catalog.packCards ?? [])]) {
    const label = c.name || c.id;
    if (cardIds.has(c.id)) errors.push(`Il codice di carta “${c.id}” è usato due volte.`);
    cardIds.add(c.id);
    if (!factionIdsSeen.has(c.faction)) errors.push(`La carta “${label}” appartiene a una fazione che non esiste.`);
    if (!c.name.trim()) errors.push(`Una carta (${c.id}) non ha nome.`);
    if (!Number.isInteger(c.value) || c.value < MIN_CARD_VALUE || c.value > MAX_CARD_VALUE) {
      errors.push(`La carta “${label}” deve valere un numero intero tra ${MIN_CARD_VALUE} e ${MAX_CARD_VALUE}.`);
    }
    if (c.power !== undefined && !(c.power in POWERS)) errors.push(`La carta “${label}” ha un potere sconosciuto.`);
  }

  if (!catalog.contracts.length) errors.push('Serve almeno un Contratto.');
  const contractIds = new Set<string>();
  for (const k of catalog.contracts) {
    const label = k.name || k.id;
    if (!ID.test(k.id)) errors.push(`Il Contratto “${label}” ha un codice non valido.`);
    if (contractIds.has(k.id)) errors.push(`Il codice di Contratto “${k.id}” è usato due volte.`);
    contractIds.add(k.id);
    if (!k.name.trim()) errors.push(`Un Contratto (${k.id}) non ha nome.`);
    if (!k.rules.length && k.mode !== 'domino') errors.push(`Il Contratto “${label}” non ha regole di punteggio.`);
    if (k.slam !== undefined && (!Number.isInteger(k.slam) || Math.abs(k.slam) > 50)) {
      errors.push(`Nel Contratto “${label}” i punti del cappotto devono essere un intero tra −50 e 50.`);
    }
    for (const r of k.rules) {
      if (!Number.isInteger(r.points) || r.points === 0 || Math.abs(r.points) > 50) {
        errors.push(`Nel Contratto “${label}” i punti di una regola devono essere un intero tra −50 e 50, diverso da 0.`);
      }
      if (r.per !== 'trick' && r.per !== 'card') errors.push(`Nel Contratto “${label}” una regola ha un tipo sconosciuto.`);
      if (r.per === 'card') {
        const f = r.filter;
        if (!f) errors.push(`Nel Contratto “${label}” una regola per carta non dice quali carte contare.`);
        else if (f.kind === 'faction' && f.faction !== 'target' && !factionIdsSeen.has(f.faction)) {
          errors.push(`Nel Contratto “${label}” una regola usa una fazione che non esiste.`);
        } else if (f.kind === 'card' && !cardIds.has(f.cardId)) {
          errors.push(`Nel Contratto “${label}” una regola usa una carta che non esiste.`);
        } else if ((f.kind === 'minValue' || f.kind === 'maxValue' || f.kind === 'exactValue' || f.kind === 'targetValue') && !Number.isInteger(f.value)) {
          errors.push(`Nel Contratto “${label}” una regola ha un valore non valido.`);
        } else if ((f.kind === 'top' || f.kind === 'targetTop') && (!Number.isInteger(f.count) || f.count < 1 || f.count > CARDS_PER_FACTION)) {
          errors.push(`Nel Contratto “${label}” le carte più alte da contare devono essere da 1 a ${CARDS_PER_FACTION}.`);
        }
      }
      if (r.tricks) {
        const { from, to } = r.tricks;
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > TRICKS_PER_HAND || from > to) {
          errors.push(`Nel Contratto “${label}” l’intervallo di prese deve andare da 1 a ${TRICKS_PER_HAND}.`);
        }
      }
    }
  }
  return [...new Set(errors)];
}
