import { getCard, getFaction, hasPowerText, isPowerImplemented } from '@nexum/engine';
import type { CardId } from '@nexum/engine';
import type { CSSProperties } from 'react';

interface Props {
  cardId: CardId;
  /** Valore finale in presa, se diverso da quello stampato viene evidenziato. */
  final?: number;
  /** Carta piccola per il tavolo e il ventaglio: valore in alto come indice, senza testo del potere. */
  mini?: boolean;
}

/** Luminanza relativa (WCAG) di un colore "#rrggbb", o null se non è un colore valido. */
function luminance(hex: string): number | null {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return null;
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** Luminanza del blu scuro dei testi (--ink, #1c2340). */
const INK = 0.0182;

/**
 * Sul colore pieno della fazione il valore va in bianco o in blu scuro: il blu solo quando si legge
 * nettamente meglio (Auguria, Conflux, Concordia, Axiomata), così le fazioni intermedie restano in bianco.
 */
export function cardInk(hex: string): 'light' | 'dark' {
  const l = luminance(hex);
  if (l === null) return 'light';
  const onWhite = 1.05 / (l + 0.05);
  const onInk = (l + 0.05) / (INK + 0.05);
  return onInk > onWhite * 1.15 ? 'dark' : 'light';
}

export function CardView({ cardId, final, mini }: Props) {
  const card = getCard(cardId);
  const faction = getFaction(card.faction);
  const value = final ?? card.value;
  const changed = final !== undefined && final !== card.value;
  const pending = hasPowerText(card) && !isPowerImplemented(card);
  const className = `card${mini ? ' mini' : ''}${cardInk(faction.color) === 'dark' ? ' ink-dark' : ''}`;
  const style = { '--faction': faction.color } as CSSProperties;
  const valueClass = `card-value${changed ? ' changed' : ''}`;

  if (mini) {
    // Una parola lunga ("Convergence") non entra nella carta piccola: meglio rimpicciolirla che spezzarla.
    const long = Math.max(...card.name.split(/\s+/).map((w) => w.length)) >= 10;
    return (
      <div className={className} data-faction={card.faction} style={style}>
        <div className="card-top">
          <div className={valueClass}>{value}</div>
        </div>
        <div className="card-band">
          <div className={`card-name${long ? ' long' : ''}`}>{card.name}</div>
          <div className="card-suit">{faction.name}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} data-faction={card.faction} style={style}>
      <div className="card-top">
        <div className="card-suit">{faction.name}</div>
        <div className="card-name">{card.name}</div>
        <div className={valueClass}>{value}</div>
        {changed && <div className="card-printed">stampato {card.value}</div>}
      </div>
      <div className="card-band">
        <div className="card-effect">
          {card.effect || 'Nessun potere.'}
          {pending && <span className="card-pending">potere non ancora attivo</span>}
        </div>
      </div>
    </div>
  );
}
