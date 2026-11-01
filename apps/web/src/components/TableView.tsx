import type { Play, PlayerView } from '@nexum/engine';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { plural, signed } from '../game/text';
import { CardView } from './CardView';
import { useElementWidth } from './useElementWidth';

interface Props {
  view: PlayerView;
  names: readonly string[];
  /** Punti della serie, mano in corso compresa. */
  totals: readonly number[];
  /** Posto disegnato in basso, davanti a chi guarda lo schermo. */
  anchor: number;
  plays: readonly Play[];
  /** Chi ha preso la presa appena conclusa, altrimenti null. */
  winner: number | null;
}

const RAD = Math.PI / 180;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Piccola rotazione fissa per posto: le carte sembrano appoggiate a mano. */
const CARD_TURN = [-2, -9, 4, 8, -5, 6, -4, 3];
/** A fine presa la carta vincente si alza più vicina al centro: quanto resta della distanza dal centro del tavolo. */
const TAKE_RING = 0.45;
/** Quanto dura il volo del mucchio verso chi ha preso (come trick-fly in styles.css). */
const FLY_MS = 450;

/** Il mucchio di una presa finita, con le posizioni già calcolate: il posto in basso può cambiare alla presa dopo. */
interface FlyingPile {
  trickNo: number;
  winner: number;
  cards: { play: Play; style: CSSProperties }[];
}

/**
 * Angolo di ogni posto attorno al tavolo, in gradi (90 = in basso, 270 = in fondo).
 * Il posto 0 è chi guarda; gli altri seguono l'ordine di gioco in senso orario lungo il lato lontano.
 */
export function seatAngles(n: number): number[] {
  const arc = Math.min(180, (360 * (n - 2)) / n);
  return Array.from({ length: n }, (_, r) => {
    if (r === 0) return 90;
    if (n === 2) return 270;
    return 270 - arc / 2 + ((r - 1) * arc) / (n - 2);
  });
}

type Density = 'full' | 'mini';

interface Geometry {
  phone: boolean;
  density: Density;
  tilt: number;
  perspective: number;
  height: number;
  originY: number;
  cx: number;
  cy: number;
  tw: number;
  th: number;
  rim: number;
  depth: number;
  cardW: number;
  cardH: number;
  seatW: number;
  seatH: number;
  /** Punto del piano (u, v dal centro, v positivo verso chi guarda) → coordinate sullo schermo. */
  project(u: number, v: number): { x: number; y: number };
}

/**
 * Misure del tavolo per una data larghezza. La prospettiva è calcolata qui, così i posti
 * (disegnati piatti, per restare nitidi) cadono esattamente sul bordo del piano inclinato.
 */
function geometry(width: number, n: number): Geometry {
  const phone = width < 640;
  const density: Density = phone && n >= 6 ? 'mini' : 'full';
  const tilt = phone ? 46 : 50;
  const perspective = phone ? 900 : 1400;
  const tw = Math.round(phone ? Math.min(width - 16, 440) : Math.min(width * 0.62, 760));
  const th = Math.round(tw * (phone ? 0.78 : 0.48));
  const rim = phone ? 9 : 14;
  const depth = phone ? 14 : 24;
  const lift = th / 2 + (phone ? 120 : 170);
  const cardW = Math.round(clamp(tw * (phone ? 0.165 : 0.115), 44, 96) * (n >= 6 ? 0.86 : 1));
  const cardH = Math.round(cardW * 1.45);
  const seatW = density === 'mini' ? 70 : phone ? 124 : 170;
  const seatH = density === 'mini' ? 52 : phone ? 84 : 104;

  const t = tilt * RAD;
  const rel = (u: number, v: number) => {
    const k = perspective / (perspective - v * Math.sin(t));
    return { x: u * k, y: -lift + (v * Math.cos(t) + lift) * k };
  };
  const cy = Math.round(seatH + 6 - rel(0, -(th / 2 + seatGap(phone))).y);
  // Sotto il bordo vicino si vede solo lo spessore del tavolo, che in prospettiva sporge di circa depth·sin(t).
  const height = Math.round(cy + rel(0, th / 2).y + depth * Math.sin(t) * 1.2 + 8);
  const cx = width / 2;

  return {
    phone,
    density,
    tilt,
    perspective,
    height,
    originY: cy - lift,
    cx,
    cy,
    tw,
    th,
    rim,
    depth,
    cardW,
    cardH,
    seatW,
    seatH,
    project(u, v) {
      const p = rel(u, v);
      return { x: cx + p.x, y: cy + p.y };
    },
  };
}

function seatGap(phone: boolean): number {
  return phone ? 4 : 12;
}

/**
 * Sul telefono i posti laterali salgono verso gli angoli in alto, come nel mockup: lasciano libere le carte.
 * Con 6 giocatori o più le etichette sono piccole e restano al loro angolo, altrimenti si sovrapporrebbero.
 */
function labelAngle(g: Geometry, angle: number): number {
  return g.phone && g.density === 'full' ? 270 + (angle - 270) * 0.62 : angle;
}

/** Riquadro di un avversario, appena fuori dal bordo del tavolo. */
function seatBox(g: Geometry, angle: number, width: number): { left: number; top: number } {
  const a = labelAngle(g, angle);
  const c = Math.cos(a * RAD);
  const s = Math.sin(a * RAD);
  const gap = seatGap(g.phone);
  const p = g.project(c * (g.tw / 2 + gap), s * (g.th / 2 + gap));
  if (g.phone) {
    const out = g.density === 'full' ? 0.3 : 0;
    return {
      left: clamp(p.x - g.seatW / 2 + c * g.seatW * out, 4, width - g.seatW - 4),
      top: p.y - g.seatH,
    };
  }
  return {
    left: clamp(p.x - g.seatW / 2 + (c * g.seatW) / 2, 4, width - g.seatW - 4),
    top: p.y - g.seatH / 2 + (s * g.seatH) / 2,
  };
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words.at(-1)![0]!).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

/** Ventaglio di carte coperte, usato per gli avversari e per le mani nascoste. */
export function CardBacks({ count, className = '' }: { count: number; className?: string }) {
  const mid = (count - 1) / 2;
  return (
    <div className={`backs ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, k) => (
        <span key={k} className="card-back" style={{ '--d': k - mid } as CSSProperties} />
      ))}
    </div>
  );
}

export function TableView({ view, names, totals, anchor, plays, winner }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const n = view.players.length;
  const g = width > 0 ? geometry(width, n) : null;
  const angles = seatAngles(n);
  /** Posizione relativa a chi guarda: 0 = in basso, poi in ordine di gioco. */
  const slot = (seat: number) => (seat - anchor + n) % n;
  const playing = winner === null && view.phase === 'playing';

  /** Centro della carta di un posto sul piano del tavolo. */
  const cardSpot = (seat: number, table: Geometry) => {
    const a = angles[slot(seat)]! * RAD;
    const ring = n < 6 ? 0.56 : table.phone ? 0.5 : 0.64;
    return {
      u: Math.cos(a) * ring * (table.tw / 2 - table.rim),
      v: Math.sin(a) * ring * (table.th / 2 - table.rim),
    };
  };

  const cardPlace = (seat: number): CSSProperties => {
    if (!g) return {};
    const { u, v } = cardSpot(seat, g);
    return {
      left: g.tw / 2 + u - g.cardW / 2,
      top: g.th / 2 + v - g.cardH / 2,
      width: g.cardW,
      height: g.cardH,
      '--turn': `${CARD_TURN[slot(seat) % CARD_TURN.length]}deg`,
    } as CSSProperties;
  };

  /** Dove va ogni carta a fine presa: la vincente in piedi, le altre ammucchiate ai suoi piedi. */
  const takeMove = (seat: number, order: number): CSSProperties => {
    if (!g || winner === null) return {};
    const from = cardSpot(seat, g);
    const foot = cardSpot(winner, g);
    const x = foot.u * TAKE_RING;
    // Dal lato lontano la carta in piedi andrebbe a coprire l'etichetta del posto: resta al centro del tavolo.
    const footV = foot.v > 0 ? foot.v * TAKE_RING : g.cardH * 0.12;
    const y = footV + (seat === winner ? -g.cardH / 2 : g.cardH * 0.1);
    // Il mucchio esce dal tavolo verso il posto di chi ha preso.
    const a = angles[slot(winner)]! * RAD;
    const flyX = Math.cos(a) * (g.tw / 2 + g.rim);
    const flyY = Math.sin(a) * (g.th / 2 + g.rim);
    return {
      '--to-x': `${x - from.u}px`,
      '--to-y': `${y - from.v}px`,
      '--fly-x': `${flyX - from.u}px`,
      '--fly-y': `${flyY - from.v}px`,
      '--pile': order,
    } as CSSProperties;
  };

  // Quando parte la presa successiva il mucchio di quella finita vola via, senza fermare il gioco.
  const [flying, setFlying] = useState<FlyingPile | null>(null);
  const pile = useRef<FlyingPile | null>(null);
  if (winner !== null) {
    pile.current = {
      trickNo: view.trickNo,
      winner,
      cards: plays.map((play, order) => ({ play, style: { ...cardPlace(play.player), ...takeMove(play.player, order) } })),
    };
  }
  useLayoutEffect(() => {
    if (winner !== null || !pile.current) return;
    setFlying(pile.current);
    pile.current = null;
  }, [winner]);
  useEffect(() => {
    if (!flying) return;
    const timer = setTimeout(() => setFlying(null), FLY_MS);
    return () => clearTimeout(timer);
  }, [flying]);

  const plane: CSSProperties | undefined = g
    ? { left: g.cx - g.tw / 2, top: g.cy - g.th / 2, width: g.tw, height: g.th }
    : undefined;
  const anchorPlayed = plays.some((pl) => pl.player === anchor);

  return (
    <div
      ref={ref}
      className={`table-stage${g?.phone ? ' phone' : ''}`}
      style={
        g
          ? { height: g.height, perspective: `${g.perspective}px`, perspectiveOrigin: `50% ${g.originY}px` }
          : undefined
      }
      role="group"
      aria-label="Tavolo"
    >
      {g && (
        <>
          <div
            className="table-under"
            style={{ ...plane, transform: `rotateX(${g.tilt}deg) translateZ(-${g.depth}px)` }}
          />
          <div
            className="table-plane"
            style={{ ...plane, transform: `rotateX(${g.tilt}deg)`, '--card-w': `${g.cardW}px`, '--tilt': `${g.tilt}deg` } as CSSProperties}
          >
            <div className="table-felt" style={{ borderWidth: g.rim }} />
            <div className="table-mark" style={{ fontSize: Math.round(g.tw * 0.06) }} aria-hidden="true">
              NEXUM
            </div>
            {playing && !anchorPlayed && (
              <div className="table-slot" style={cardPlace(anchor)}>
                La tua carta
              </div>
            )}
            {plays.map((pl, order) => (
              <div
                key={`${view.trickNo}-${pl.player}`}
                className={`table-card${winner === pl.player ? ' won' : winner !== null ? ` taken${pl.skipped ? ' skipped' : ''}` : ''}`}
                style={{ ...cardPlace(pl.player), ...takeMove(pl.player, order) }}
              >
                <span className="sr-only">{names[pl.player]}: </span>
                {pl.skipped ? (
                  <div className="table-skip">Salta la presa</div>
                ) : (
                  <CardView cardId={pl.cardId} final={pl.final} mini />
                )}
              </div>
            ))}
            {flying?.cards.map(({ play, style }) =>
              play.skipped ? null : (
                <div
                  key={`volo-${flying.trickNo}-${play.player}`}
                  className={`table-card flying${flying.winner === play.player ? ' won' : ''}`}
                  style={style}
                  aria-hidden="true"
                >
                  <CardView cardId={play.cardId} final={play.final} mini />
                </div>
              ),
            )}
          </div>

          {view.players.map((p, seat) => {
            if (seat === anchor) return null;
            const angle = angles[slot(seat)]!;
            const box = seatBox(g, angle, width);
            const side = Math.cos(labelAngle(g, angle) * RAD);
            const align = side < -0.3 ? ' left' : side > 0.3 ? ' right' : '';
            const current = playing && view.turn === seat;
            const won = winner === seat;
            const status = won ? 'prende' : current ? 'sta giocando…' : seat === view.leader ? 'primo di mano' : null;
            return (
              <div
                key={seat}
                className={`seat ${g.density}${align}${current ? ' current' : ''}${won ? ' won' : ''}`}
                style={{ left: box.left, top: box.top, width: g.seatW, height: g.seatH }}
              >
                {g.density === 'full' && <CardBacks count={p.handCount} />}
                <div className="seat-row">
                  <span className="seat-avatar">
                    {initials(names[seat]!)}
                    {p.nextModifier !== 0 && (
                      <span className="seat-mod" data-tip={`Prossima carta ${signed(p.nextModifier)}`}>
                        {signed(p.nextModifier)}
                      </span>
                    )}
                    {g.density === 'mini' && seat === view.leader && (
                      <span className="seat-lead" data-tip="Primo di mano">
                        1°
                      </span>
                    )}
                  </span>
                  <span className="seat-text">
                    <b>{names[seat]}</b>
                    {g.density === 'full' && (
                      <span>
                        {totals[seat]} pt · {plural(p.tricks, 'presa', 'prese')}
                      </span>
                    )}
                  </span>
                </div>
                {status && g.density === 'full' && <span className={`tag${won || current ? ' gold' : ''}`}>{status}</span>}
                {status && g.density === 'mini' && <span className="sr-only">{status}</span>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
