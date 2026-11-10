import { getCard, getFaction } from '@nexum/engine';
import type { CardId } from '@nexum/engine';
import type { CSSProperties, ReactNode } from 'react';
import { CardView } from './CardView';
import { useViewportHeight } from './useElementSize';
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
/** Sotto questa striscia scoperta (px) una carta non si legge né si tocca bene: con le mani lunghe si va su due file. */
const MIN_STEP = 20;

/** Come si dispone una fila di `count` carte larghe `cardW` in uno spazio largo `width`. */
function fanRow(count: number, width: number, cardW: number, cardH: number, phone: boolean) {
  const mid = (count - 1) / 2;
  const turn = count > 1 ? Math.min(phone ? 1.2 : 3.2, (phone ? 16 : 40) / (count - 1)) : 0;
  const spill = cardH * Math.sin(mid * turn * RAD);
  const room = count > 1 ? (width - cardW - 2 * spill - 8) / (count - 1) : 0;
  return { mid, turn, room, step: count > 1 ? Math.min(phone ? 40 : 62, room) : 0 };
}

/**
 * Mano a ventaglio: le carte si sovrappongono quanto serve per stare nello schermo. Con le mani lunghe (fino a 25
 * carte) su uno schermo stretto le carte vanno su due file, come righe di testo: la prima metà dietro, più in alto,
 * e la seconda davanti. Così ogni carta lascia scoperto abbastanza per leggerla e toccarla, senza scorrere.
 */
export function HandFan({ cards, hiddenCount, legal, canPlay, selected, onPick, onClear, children }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const screenH = useViewportHeight();
  const phone = width < 640;
  // Sugli schermi bassi le carte si rimpiccioliscono: tavolo e mano devono stare entrambi nello schermo.
  const cardW = Math.max(48, Math.min(phone ? 70 : 96, Math.round(screenH * 0.125)));
  const cardH = Math.round(cardW * 1.45);
  const count = cards.length || hiddenCount;
  // Con 13 carte o meno resta sempre una fila sola, com'era.
  const rows = count > 13 && fanRow(count, width, cardW, cardH, phone).room < MIN_STEP ? 2 : 1;
  const perRow = Math.ceil(count / rows);
  const row = fanRow(perRow, width, cardW, cardH, phone);
  const { mid, turn, step } = row;
  const drop = phone ? 8 : 18;
  // Le carte ai lati scendono e ruotano: lo spazio sotto il ventaglio le tiene tutte dentro lo schermo.
  const sink = Math.max(8, Math.ceil(drop + (cardW / 2) * Math.sin(mid * turn * RAD)) + 4);
  // Quanto sale la fila dietro: lascia scoperti valore e simbolo della fazione.
  const rise = rows > 1 ? Math.round(cardH * 0.42) : 0;
  // Il valore sta nella striscia che resta scoperta: si rimpicciolisce quando le carte sono tante.
  const index = Math.round(Math.min(cardW * 0.36, Math.max(13, step - 8)));

  const place = (k: number, raised: boolean): CSSProperties => {
    // Nella seconda fila le carte si contano da capo; l'ultima fila può averne una in meno, centrata uguale.
    const r = Math.floor(k / perRow);
    const inRow = rows > 1 ? (r === 0 ? perRow : count - perRow) : count;
    const rowMid = (inRow - 1) / 2;
    const d = k - r * perRow - rowMid;
    return {
      '--x': `${d * step}px`,
      '--y': `${(rowMid ? drop * (d / rowMid) ** 2 : 0) - (r === 0 ? rise : 0)}px`,
      '--r': `${d * turn}deg`,
      width: cardW,
      height: cardH,
      marginLeft: -cardW / 2,
      zIndex: raised ? 99 : r * 50 + k,
      '--k': k,
    } as CSSProperties;
  };

  return (
    <div
      ref={ref}
      className={`hand-fan${phone ? ' phone' : ''}`}
      style={{ height: cardH + sink + 40 + rise, '--card-w': `${cardW}px`, '--index': `${index}px`, '--sink': `${sink}px` } as CSSProperties}
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
