import { applyMatchAction, chooseCard, createMatch, createRng, getMatchView, getView } from '@nexum/engine';
import type { CardId, MatchAction, MatchState, Rng } from '@nexum/engine';
import type { ClientSnapshot, GameClient, MatchSetup } from './GameClient';

const CPU_DELAY_MS = 550;

/** Partita interamente nel browser: contro la CPU o pass-and-play sullo stesso dispositivo. */
export class LocalGameClient implements GameClient {
  private state: MatchState;
  private snapshot: ClientSnapshot;
  private revealedFor: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private readonly listeners = new Set<() => void>();
  private readonly cpuRng: Rng;

  constructor(readonly setup: MatchSetup) {
    this.state = createMatch({
      playerNames: setup.seats.map((s) => s.name),
      factions: setup.factions,
      hands: setup.hands,
      seed: setup.seed,
    });
    this.cpuRng = createRng(setup.seed ^ 0x9e3779b9);
    this.snapshot = this.buildSnapshot();
    this.scheduleCpu();
  }

  getSnapshot = (): ClientSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  playCard(cardId: CardId): void {
    const { canPlay, perspective } = this.snapshot;
    if (!canPlay || perspective === null) return;
    this.apply({ type: 'play', player: perspective, cardId });
  }

  nextTrick(): void {
    if (!this.snapshot.canContinue) return;
    this.revealedFor = null;
    this.apply({ type: 'nextTrick' });
  }

  nextHand(): void {
    if (this.state.phase !== 'handEnd') return;
    this.revealedFor = null;
    this.apply({ type: 'nextHand' });
  }

  revealHand(): void {
    if (!this.snapshot.handHidden) return;
    this.revealedFor = this.state.game.turn;
    this.update();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  private apply(action: MatchAction): void {
    this.state = applyMatchAction(this.state, action);
    this.update();
  }

  private update(): void {
    if (this.disposed) return;
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
    this.scheduleCpu();
  }

  private scheduleCpu(): void {
    const g = this.state.game;
    if (this.disposed || this.timer || this.state.phase !== 'playing' || g.phase !== 'playing') return;
    const seat = g.turn;
    if (this.setup.seats[seat]?.kind !== 'cpu') return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const now = this.state.game;
      if (this.disposed || now.phase !== 'playing' || now.turn !== seat) return;
      this.apply({ type: 'play', player: seat, cardId: chooseCard(getView(now, seat), this.cpuRng) });
    }, CPU_DELAY_MS);
  }

  private buildSnapshot(): ClientSnapshot {
    const g = this.state.game;
    const { mode, seats } = this.setup;
    const humanTurn = this.state.phase === 'playing' && g.phase === 'playing' && seats[g.turn]?.kind === 'human';

    let perspective: number | null;
    if (mode === 'solo') perspective = seats.findIndex((seat) => seat.kind === 'human');
    else perspective = humanTurn ? g.turn : null;

    const handHidden = mode === 'local' && humanTurn && this.revealedFor !== g.turn;
    if (handHidden) perspective = null;

    const match = getMatchView(this.state, perspective);
    return {
      match,
      view: match.game,
      seats,
      perspective,
      handHidden,
      canPlay: humanTurn && perspective === g.turn,
      canContinue: g.phase === 'trickEnd',
    };
  }
}
