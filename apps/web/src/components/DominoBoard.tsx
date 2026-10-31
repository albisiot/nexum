import { dominoCards, getCard, getFaction } from '@nexum/engine';
import type { DominoState, FactionId, PublicPlayer } from '@nexum/engine';
import type { CSSProperties } from 'react';
import { cardInk } from './CardView';

interface Props {
  domino: DominoState;
  factions: readonly FactionId[];
  players: readonly PublicPlayer[];
  names: readonly string[];
  turn: number;
}

/** Il tavolo del Contratto Domino: una fila per fazione, con le carte già attaccate. */
export function DominoBoard({ domino, factions, players, names, turn }: Props) {
  return (
    <div className="domino">
      <div className="domino-seats">
        {players.map((p, i) => (
          <span key={i} className={`domino-seat${i === turn ? ' turn' : ''}`} aria-current={i === turn}>
            <b>{names[i]}</b> · {p.handCount} in mano
          </span>
        ))}
      </div>
      <div className="domino-rows">
        {factions.map((id) => {
          const faction = getFaction(id);
          const line = domino.table[id];
          return (
            <div key={id} className="domino-row" role="group" aria-label={faction.name} style={{ '--faction': faction.color } as CSSProperties}>
              <span className="dot" />
              {dominoCards(id).map((cardId, rank) => {
                const placed = !!line && rank >= line.low && rank <= line.high;
                return (
                  <span key={cardId} className={`domino-slot${placed ? ` placed${cardInk(faction.color) === 'dark' ? ' ink-dark' : ''}` : ''}`}>
                    {placed ? getCard(cardId).value : ''}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
