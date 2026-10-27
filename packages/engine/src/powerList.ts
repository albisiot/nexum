import type { PowerId } from './types';

/**
 * Poteri programmati nel motore. Nell'Editor si può assegnare uno di questi a qualsiasi carta;
 * un potere nuovo va prima programmato in powers.ts e aggiunto qui.
 */
export const POWERS: Readonly<Record<PowerId, { name: string; summary: string }>> = {
  afterimage: { name: 'Afterimage', summary: '+20 se la tua carta precedente era 70 o più' },
  veritas: { name: 'Veritas', summary: 'Vale sempre 80' },
  invariant: { name: 'Invariant', summary: 'Vale sempre 50' },
  ascendant: { name: 'Ascendant', summary: 'Diventa 74 dopo due prese perse' },
  challenger: { name: 'Challenger', summary: 'Diventa 68 se prima di lei è uscita una carta oltre 70' },
  gravemind: { name: 'Gravemind', summary: '+3 per ogni carta che hai già giocato (massimo +15)' },
  axiom: { name: 'Axiom', summary: 'Annulla gli effetti di valore della presa' },
  switch: { name: 'Switch', summary: 'Diventa 91 se in presa ci sono un 80+ e un ≤20' },
  equalis: { name: 'Equalis', summary: 'Diventa 77 se i valori in presa differiscono al massimo di 20' },
  wildcard: { name: 'Wildcard', summary: 'Diventa il valore avversario più basso +1' },
  measure: { name: 'Measure', summary: 'Limita i valori della presa tra 10 e 90' },
  origin: { name: 'Origin', summary: 'Se vince la presa: +3 punti Contratto' },
  zero: { name: 'Zero', summary: 'Se vince la presa: +4 punti Contratto' },
  praetor: { name: 'Praetor', summary: 'Se vince la presa: +10 alla tua prossima carta' },
  bloodmark: { name: 'Bloodmark', summary: 'Se perde contro un 75+: +15 alla tua prossima carta' },
  'vesper-null': { name: 'Vesper Null', summary: 'Se vince la presa: −15 alla prossima carta dell’avversario in testa' },
  maledict: { name: 'Maledict', summary: 'Se non vince la presa: il vincitore perde 1 punto' },
  rebel: { name: 'Rebel', summary: 'Se non vince e il vincitore ha 80+: il vincitore perde 1 punto' },
  ravager: { name: 'Ravager', summary: 'Se vince la presa: l’avversario in testa perde 1 punto' },
};
