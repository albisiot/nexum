import { getCard, getFaction } from '@nexum/engine';
import type { CardId } from '@nexum/engine';
import type { CSSProperties, ReactNode } from 'react';
import { CardView } from './CardView';
import { useElementWidth } from './useElementWidth';

interface Props {
  /** Carte scoperte, già ordinate. Vuoto se la mano è coperta. */
  cards: readonly CardId[];
  /** Carte coperte da disegnare quando la mano non è visibile. */
  hiddenCount: number;
  legal: ReadonlySet<CardId>;
  canPlay: boolean;
  selected: CardId | null;
  onPick(cardId: CardId): void;
  onClear(): void;
  /** Riquadro della carta scelta: sta sopra il ventaglio senza spostarlo. */
  children?: ReactNode;
}

const RAD = Math.PI / 180;

/** Mano a ventaglio: le carte si sovrappongono quanto serve per stare nello schermo. */
export function HandFan({ cards, hiddenCount, legal, canPlay, selected, onPick, onClear, children }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const phone = width < 640;
  const cardW = phone ? 70 : 96;
  const cardH = Math.round(cardW * 1.45);
  const count = cards.length || hiddenCount;
  const mid = (count - 1) / 2;
  const turn = count > 1 ? Math.min(phone ? 1.2 : 3.2, (phone ? 16 : 40) / (count - 1)) : 0;
  const spill = cardH * Math.sin(mid * turn * RAD);
  const step = count > 1 ? Math.min(phone ? 40 : 62, (width - cardW - 2 * spill - 8) / (count - 1)) : 0;
  const drop = phone ? 8 : 18;
  // Il valore sta nella striscia che resta scoperta: si rimpicciolisce quando le carte sono tante.
  const index = Math.round(Math.min(cardW * 0.36, Math.max(13, step - 8)));

  const place = (k: number, raised: boolean): CSSProperties => {
    const d = k - mid;
    return {
      '--x': `${d * step}px`,
      '--y': `${mid ? drop * (d / mid) ** 2 : 0}px`,
      '--r': `${d * turn}deg`,
      width: cardW,
      height: cardH,
      marginLeft: -cardW / 2,
      zIndex: raised ? 99 : k,
    } as CSSProperties;
  };

  return (
    <div
      ref={ref}
      className={`hand-fan${phone ? ' phone' : ''}`}
      style={{ height: cardH + drop + 48, '--card-w': `${cardW}px`, '--index': `${index}px` } as CSSProperties}
      onKeyDown={(e) => e.key === 'Escape' && onClear()}
    >
      {children}
      {width > 0 &&
        (cards.length
          ? cards.map((id, k) => {
              const playable = canPlay && legal.has(id);
              const card = getCard(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`fan-card${canPlay ? (playable ? ' valid' : ' invalid') : ''}${selected === id ? ' selected' : ''}`}
                  style={place(k, selected === id)}
                  aria-pressed={selected === id}
                  aria-label={`${card.name}, ${getFaction(card.faction).name}, ${card.value}${canPlay && !playable ? ', non giocabile' : ''}`}
                  onClick={() => onPick(id)}
                >
                  <CardView cardId={id} mini />
                </button>
              );
            })
          : Array.from({ length: hiddenCount }, (_, k) => (
              <span key={k} className="fan-card card-back" style={place(k, false)} aria-hidden="true" />
            )))}
    </div>
  );
}
