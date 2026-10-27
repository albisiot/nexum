import { applyAction, chooseCard, createGame, createRng, getView } from '@nexum/engine';
import type { Action, CardId, GameState, Rng } from '@nexum/engine';
import type { ClientSnapshot, GameClient, MatchSetup } from './GameClient';

const CPU_DELAY_MS = 550;

/** Partita interamente nel browser: contro la CPU o pass-and-play sullo stesso dispositivo. */
export class LocalGameClient implements GameClient {
  private state: GameState;
  private snapshot: ClientSnapshot;
  private revealedFor: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private readonly listeners = new Set<() => void>();
  private readonly cpuRng: Rng;

  constructor(readonly setup: MatchSetup) {
    this.state = createGame({
      playerNames: setup.seats.map((s) => s.name),
      factions: setup.factions,
      contract: setup.contract,
      targetFaction: setup.targetFaction,
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

  revealHand(): void {
    if (!this.snapshot.handHidden) return;
    this.revealedFor = this.state.turn;
    this.update();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  private apply(action: Action): void {
    this.state = applyAction(this.state, action);
    this.update();
  }

  private update(): void {
    if (this.disposed) return;
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
    this.scheduleCpu();
  }

  private scheduleCpu(): void {
    if (this.disposed || this.timer || this.state.phase !== 'playing') return;
    const seat = this.state.turn;
    if (this.setup.seats[seat]?.kind !== 'cpu') return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.disposed || this.state.phase !== 'playing' || this.state.turn !== seat) return;
      this.apply({ type: 'play', player: seat, cardId: chooseCard(getView(this.state, seat), this.cpuRng) });
    }, CPU_DELAY_MS);
  }

  private buildSnapshot(): ClientSnapshot {
    const s = this.state;
    const { mode, seats } = this.setup;
    const humanTurn = s.phase === 'playing' && seats[s.turn]?.kind === 'human';

    let perspective: number | null;
    if (mode === 'solo') perspective = seats.findIndex((seat) => seat.kind === 'human');
    else perspective = humanTurn ? s.turn : null;

    const handHidden = mode === 'local' && humanTurn && this.revealedFor !== s.turn;
    if (handHidden) perspective = null;

    return {
      view: getView(s, perspective),
      seats,
      perspective,
      handHidden,
      canPlay: humanTurn && perspective === s.turn,
      canContinue: s.phase === 'trickEnd',
    };
  }
}
