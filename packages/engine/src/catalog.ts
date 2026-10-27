// Catalogo attivo: fazioni, carte e Contratti con cui si gioca.
// Parte dai dati predefiniti; l'app può sostituirlo con la versione pubblicata dall'Editor.
import {
  CARDS_PER_FACTION,
  MAX_CARD_VALUE,
  MAX_PLAYERS,
  MIN_CARD_VALUE,
  TRICKS_PER_HAND,
} from './constants';
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

function activate(catalog: Catalog): void {
  active = JSON.parse(JSON.stringify(catalog)) as Catalog;
  factionIndex = new Map(active.factions.map((f) => [f.id, f]));
  cardIndex = new Map(active.cards.map((c) => [c.id, c]));
  contractIndex = new Map(active.contracts.map((c) => [c.id, c]));
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

export function factionCards(faction: FactionId): CardDef[] {
  return active.cards.filter((c) => c.faction === faction);
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
  return contract.rules.some((r) => r.filter?.kind === 'faction' && r.filter.faction === 'target');
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

/** Il Contratto ha senso con queste fazioni: almeno una regola può assegnare punti. */
export function contractPlayableWith(contract: ContractDef, factions: readonly FactionId[]): boolean {
  return contract.rules.some((r) => {
    const f = ruleRequiredFaction(r);
    return f === null || factions.includes(f);
  });
}

export function cardMatches(filter: CardFilter, card: CardDef, targetFaction?: FactionId): boolean {
  switch (filter.kind) {
    case 'any':
      return true;
    case 'faction':
      return card.faction === (filter.faction === 'target' ? targetFaction : filter.faction);
    case 'minValue':
      return card.value >= filter.value;
    case 'maxValue':
      return card.value <= filter.value;
    case 'hasPower':
      return hasPowerText(card);
    case 'card':
      return card.id === filter.cardId;
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
  for (const c of catalog.cards) {
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
    if (!k.rules.length) errors.push(`Il Contratto “${label}” non ha regole di punteggio.`);
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
        } else if ((f.kind === 'minValue' || f.kind === 'maxValue') && !Number.isInteger(f.value)) {
          errors.push(`Nel Contratto “${label}” una regola ha un valore soglia non valido.`);
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
