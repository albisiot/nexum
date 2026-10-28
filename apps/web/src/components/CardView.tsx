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

/** Le fazioni molto chiare usano una carta bianca, quelle molto scure un bordo più chiaro. */
export function colorTone(hex: string): 'light' | 'dark' | null {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return null;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.82 ? 'light' : luminance < 0.16 ? 'dark' : null;
}

export function CardView({ cardId, final, mini }: Props) {
  const card = getCard(cardId);
  const faction = getFaction(card.faction);
  const value = final ?? card.value;
  const changed = final !== undefined && final !== card.value;
  const pending = hasPowerText(card) && !isPowerImplemented(card);
  const tone = colorTone(faction.color);
  const className = `card${mini ? ' mini' : ''}${tone ? ` ${tone}` : ''}`;
  const style = { '--faction': faction.color } as CSSProperties;

  if (mini) {
    // Una parola lunga ("Convergence") non entra nella carta piccola: meglio rimpicciolirla che spezzarla.
    const long = Math.max(...card.name.split(/\s+/).map((w) => w.length)) >= 10;
    return (
      <div className={className} data-faction={card.faction} style={style}>
        <div className={`card-value${changed ? ' changed' : ''}`}>{value}</div>
        <div className={`card-name${long ? ' long' : ''}`}>{card.name}</div>
        <div className="card-suit">{faction.name}</div>
      </div>
    );
  }

  return (
    <div className={className} data-faction={card.faction} style={style}>
      <div>
        <div className="card-suit">
          <span className="dot" />
          {faction.name}
        </div>
        <div className="card-name">{card.name}</div>
      </div>
      <div>
        <div className={`card-value${changed ? ' changed' : ''}`}>{value}</div>
        {changed && <div className="card-printed">stampato {card.value}</div>}
        <div className="card-effect">
          {card.effect || 'Nessun potere.'}
          {pending && <span className="card-pending">potere non ancora attivo</span>}
        </div>
      </div>
    </div>
  );
}
