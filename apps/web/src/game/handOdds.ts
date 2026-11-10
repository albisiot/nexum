// Quante mani partono senza almeno una fazione, per la scelta delle carte per fazione nella preparazione.
// È il calcolo esatto dietro alla simulazione in docs/simulazione-fazioni.md: con 4 giocatori × 13 carte è il 5%.

/** Coefficiente binomiale: in quanti modi si scelgono `k` cose tra `n`. */
function binomial(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/**
 * Probabilità che una mano non abbia nemmeno una carta di almeno una fazione, con `players` fazioni da `cards` carte
 * e `cards` carte in mano. Inclusione-esclusione: si sommano, con segni alterni, le mani senza k fazioni precise.
 */
export function missingFactionChance(players: number, cards: number): number {
  const total = players * cards;
  let chance = 0;
  for (let k = 1; k < players; k++) {
    // Tutte le carte in mano vengono dalle altre players − k fazioni.
    let without = 1;
    for (let i = 0; i < cards; i++) without *= ((players - k) * cards - i) / (total - i);
    chance += (k % 2 === 1 ? 1 : -1) * binomial(players, k) * without;
  }
  return chance;
}
