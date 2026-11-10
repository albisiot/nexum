/** Prese di una mano normale. Con le mani lunghe le prese sono tante quante le carte per fazione (GameConfig). */
export const TRICKS_PER_HAND = 13;
/** Ogni fazione ha tante carte quante sono le prese: con N giocatori ci sono N fazioni e 13 carte a testa. */
export const CARDS_PER_FACTION = TRICKS_PER_HAND;
/** Le carte per fazione che si possono scegliere: 13 è la mano normale, le altre sono le mani lunghe. */
export const HAND_LENGTHS = [13, 15, 17, 19, 21, 23, 25] as const;
export const MAX_CARDS_PER_FACTION = 25;
/** Le mani lunghe si giocano da 5 giocatori in su: con meno le fazioni bastano già. */
export const LONG_HAND_MIN_PLAYERS = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const MIN_CARD_VALUE = 1;
export const MAX_CARD_VALUE = 99;
