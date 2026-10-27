import { FACTIONS, getCard, hasPowerText, isPowerImplemented } from '@nexum/engine';
import type { CardId } from '@nexum/engine';
import type { CSSProperties } from 'react';

interface Props {
  cardId: CardId;
  /** Valore finale in presa, se diverso da quello stampato viene evidenziato. */
  final?: number;
  compact?: boolean;
}

export function CardView({ cardId, final, compact }: Props) {
  const card = getCard(cardId);
  const faction = FACTIONS[card.faction];
  const value = final ?? card.value;
  const changed = final !== undefined && final !== card.value;
  const pending = hasPowerText(card) && !isPowerImplemented(card);

  return (
    <div
      className={`card${compact ? ' compact' : ''}`}
      data-faction={card.faction}
      style={{ '--faction': faction.color } as CSSProperties}
    >
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
