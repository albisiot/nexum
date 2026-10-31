// Le due metà di una partita online. Chi crea la stanza fa da arbitro: tiene lo stato completo, applica le regole
// e pubblica a ognuno solo la propria vista. Gli altri disegnano quella vista e inviano le loro mosse.
import {
  applyMatchAction,
  botAction,
  canRequest,
  createMatch,
  createRng,
  discardableCards,
  getMatchView,
  pendingSeat,
  sortHand,
} from '@nexum/engine';
import type { CardId, MatchAction, MatchState, Rng } from '@nexum/engine';
import type { ClientSnapshot, DecisionAnswer, GameClient, MatchSetup } from '../game/GameClient';
import { fakeIdentity, roomErrorText } from './backend';
import type { RemoteAction, RoomBackend } from './backend';

const fastTurn = import.meta.env.DEV && fakeIdentity ? Number(new URLSearchParams(window.location.search).get('fakeTurn')) : 0;
/** Tempo per giocare: poi la CPU gioca al posto di chi non risponde, così nessuno blocca la partita. */
const TURN_MS = fastTurn || 60_000;
const CPU_DELAY_MS = 700;
/** Pausa per leggere l'esito della presa: chiunque può passare prima alla successiva. */
const TRICK_END_MS = 6_000;
const HAND_END_MS = 60_000;
/** Ogni turno dura al massimo TURN_MS: se non arriva niente da più tempo, chi fa da arbitro non c'è. */
const HOST_SILENT_MS = Math.max(TURN_MS, HAND_END_MS) + 15_000;
const ACTION_RETRY_MS = 4_000;

/** Ciò che chi fa da arbitro invia a un giocatore. */
interface ViewMessage {
  seed: number;
  /** Quanto resta per giocare, se tocca a questo giocatore. */
  turnMs: number | null;
  snapshot: Omit<ClientSnapshot, 'seats' | 'turnDeadline' | 'notice'>;
}

function seatSnapshot(state: MatchState, seat: number): ViewMessage['snapshot'] {
  const g = state.game;
  const match = getMatchView(state, seat);
  const myTurn = state.phase === 'playing' && g.phase === 'playing' && g.turn === seat && !g.decision;
  const mustDiscard = match.game.discardable.length > 0;
  const canDecide = g.decision?.player === seat;
  return {
    match,
    view: match.game,
    perspective: seat,
    handHidden: false,
    canPlay: myTurn && !mustDiscard,
    canDiscard: myTurn && mustDiscard,
    canDecide,
    decisionHand: canDecide && g.decision?.kind === 'recover' ? sortHand(discardableCards(match.game.hand)) : [],
    canContinue: g.phase === 'trickEnd' && !g.decision,
  };
}

export class OnlineHostClient implements GameClient {
  readonly leaveNote = 'La partita si ferma per tutti finché non rientri con lo stesso codice.';
  private state: MatchState;
  private snapshot: ClientSnapshot;
  private readonly seat: number;
  private readonly rng: Rng;
  private readonly listeners = new Set<() => void>();
  private readonly seen = new Set<string>();
  private consumed: string[] = [];
  private lastViews: Record<string, string> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private deadline: number | null = null;
  private publishing = false;
  private dirty = false;
  private notice: string | undefined;
  private disposed = false;
  private unwatch: (() => void) | null = null;

  constructor(
    readonly setup: MatchSetup,
    private readonly code: string,
    uid: string,
    private readonly backend: RoomBackend,
    resumed: MatchState | null,
  ) {
    this.seat = setup.seats.findIndex((s) => s.uid === uid);
    this.rng = createRng(setup.seed ^ Date.now());
    this.state =
      resumed ??
      createMatch({ playerNames: setup.seats.map((s) => s.name), factions: setup.factions, hands: setup.hands, seed: setup.seed });
    this.schedule();
    this.snapshot = this.buildSnapshot();
    this.publish();
    this.unwatch = backend.watchActions(
      code,
      (actions) => this.receive(actions),
      (error) => this.fail(error),
    );
  }

  getSnapshot = (): ClientSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  playCard(cardId: CardId, option = 0): void {
    if (this.snapshot.canPlay) this.apply({ type: 'play', player: this.seat, cardId, option });
  }

  discard(cardId: CardId): void {
    if (this.snapshot.canDiscard) this.apply({ type: 'discard', player: this.seat, cardId });
  }

  decide(answer: DecisionAnswer): void {
    if (this.snapshot.canDecide) this.apply({ type: 'decide', player: this.seat, ...answer });
  }

  nextTrick(): void {
    if (this.snapshot.canContinue) this.apply({ type: 'nextTrick' });
  }

  nextHand(): void {
    if (this.state.phase === 'handEnd') this.apply({ type: 'nextHand' });
  }

  revealHand(): void {}

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.unwatch?.();
    this.listeners.clear();
  }

  private receive(actions: RemoteAction[]): void {
    let fresh = false;
    for (const remote of actions) {
      if (this.seen.has(remote.id)) continue;
      this.seen.add(remote.id);
      this.consumed.push(remote.id);
      fresh = true;
      const seat = this.setup.seats.findIndex((s) => s.uid === remote.uid);
      if (remote.seed === this.setup.seed && seat >= 0 && canRequest(seat, remote.action)) this.tryApply(remote.action);
    }
    if (fresh) this.publish();
  }

  /** Una mossa che nel frattempo non è più valida (un doppio tocco, un turno scaduto) si ignora. */
  private tryApply(action: MatchAction): void {
    try {
      this.apply(action);
    } catch (error) {
      console.warn('Mossa ignorata:', error);
    }
  }

  private apply(action: MatchAction): void {
    this.state = applyMatchAction(this.state, action);
    this.afterChange();
  }

  private afterChange(): void {
    if (this.disposed) return;
    this.schedule();
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
    this.publish();
    if (this.state.phase === 'matchEnd') void this.backend.setStatus(this.code, 'ended').catch((error: unknown) => this.fail(error));
  }

  /** Il prossimo passo che non dipende da una mossa: la CPU, il tempo scaduto, la presa o la mano successiva. */
  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
    const run = (ms: number, step: () => void) => {
      this.timer = setTimeout(() => {
        this.timer = null;
        if (!this.disposed) step();
      }, ms);
    };
    const seat = pendingSeat(this.state);
    if (seat !== null) {
      const human = this.setup.seats[seat]?.kind === 'human';
      if (human) this.deadline = Date.now() + TURN_MS;
      // Chi non risponde in tempo viene sostituito da una CPU di livello normale.
      run(human ? TURN_MS : CPU_DELAY_MS, () => this.tryApply(botAction(this.state, seat, this.rng, this.setup.seats[seat]?.level)));
    } else if (this.state.phase === 'playing') {
      run(TRICK_END_MS, () => this.tryApply({ type: 'nextTrick' }));
    } else if (this.state.phase === 'handEnd') {
      run(HAND_END_MS, () => this.tryApply({ type: 'nextHand' }));
    }
  }

  private buildSnapshot(): ClientSnapshot {
    const own = seatSnapshot(this.state, this.seat);
    const mine = own.canPlay || own.canDiscard || own.canDecide;
    return { ...own, seats: this.setup.seats, turnDeadline: mine ? this.deadline : null, notice: this.notice };
  }

  /** Pubblica l'ultimo stato. Se ne arriva uno nuovo mentre si sta scrivendo, si scrive poi solo il più recente. */
  private publish(): void {
    if (this.publishing) {
      this.dirty = true;
      return;
    }
    this.publishing = true;
    this.dirty = false;
    const views: Record<string, string> = {};
    this.setup.seats.forEach((seat, i) => {
      if (seat.kind !== 'human' || !seat.uid || i === this.seat) return;
      const snapshot = seatSnapshot(this.state, i);
      const mine = snapshot.canPlay || snapshot.canDiscard || snapshot.canDecide;
      const message: ViewMessage = { seed: this.setup.seed, turnMs: mine && this.deadline ? this.deadline - Date.now() : null, snapshot };
      const json = JSON.stringify(message);
      if (json !== this.lastViews[seat.uid]) views[seat.uid] = json;
    });
    const consumed = this.consumed;
    this.consumed = [];
    let failed = false;
    this.backend
      .publish(this.code, JSON.stringify(this.state), views, consumed)
      .then(() => {
        Object.assign(this.lastViews, views);
        this.setNotice(undefined);
      })
      .catch((error: unknown) => {
        failed = true;
        this.consumed.push(...consumed);
        this.dirty = true;
        this.fail(error);
      })
      .finally(() => {
        this.publishing = false;
        if (!this.dirty || this.disposed) return;
        if (failed) setTimeout(() => !this.disposed && this.publish(), 2000);
        else this.publish();
      });
  }

  private fail(error: unknown): void {
    this.setNotice(`Problema di connessione: ${roomErrorText(error)}`);
  }

  private setNotice(notice: string | undefined): void {
    if (notice === this.notice || this.disposed) return;
    this.notice = notice;
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }
}

export class OnlineGuestClient implements GameClient {
  readonly leaveNote = 'Puoi rientrare con lo stesso codice: intanto, allo scadere del tempo, la CPU gioca al tuo posto.';
  private snapshot: ClientSnapshot;
  private readonly listeners = new Set<() => void>();
  private unwatch: (() => void) | null = null;
  private lastUpdate = Date.now();
  private retry: ReturnType<typeof setTimeout> | null = null;
  private readonly silence: ReturnType<typeof setInterval>;
  private disposed = false;

  private constructor(
    readonly setup: MatchSetup,
    private readonly code: string,
    private readonly uid: string,
    private readonly backend: RoomBackend,
    private readonly hostName: string,
    message: ViewMessage,
  ) {
    this.snapshot = this.toSnapshot(message);
    this.silence = setInterval(() => this.checkHost(), 5000);
  }

  /** Si collega e aspetta la prima vista di questa partita. */
  static connect(setup: MatchSetup, code: string, uid: string, backend: RoomBackend, hostName: string): Promise<OnlineGuestClient> {
    return new Promise((resolve, reject) => {
      let client: OnlineGuestClient | null = null;
      const unwatch = backend.watchView(
        code,
        uid,
        (json) => {
          const message = JSON.parse(json) as ViewMessage;
          if (message.seed !== setup.seed) return;
          if (client) {
            client.receive(message);
            return;
          }
          client = new OnlineGuestClient(setup, code, uid, backend, hostName, message);
          client.unwatch = unwatch;
          resolve(client);
        },
        (error) => {
          if (client) client.setNotice(`Problema di connessione: ${roomErrorText(error)}`);
          else reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }

  getSnapshot = (): ClientSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  playCard(cardId: CardId, option = 0): void {
    if (this.snapshot.canPlay) this.send({ type: 'play', player: this.seat(), cardId, option });
  }

  discard(cardId: CardId): void {
    if (this.snapshot.canDiscard) this.send({ type: 'discard', player: this.seat(), cardId });
  }

  decide(answer: DecisionAnswer): void {
    if (this.snapshot.canDecide) this.send({ type: 'decide', player: this.seat(), ...answer });
  }

  nextTrick(): void {
    if (this.snapshot.canContinue) this.send({ type: 'nextTrick' });
  }

  nextHand(): void {
    if (this.snapshot.match.phase === 'handEnd') this.send({ type: 'nextHand' });
  }

  revealHand(): void {}

  dispose(): void {
    this.disposed = true;
    this.unwatch?.();
    clearInterval(this.silence);
    if (this.retry) clearTimeout(this.retry);
    this.listeners.clear();
  }

  private seat(): number {
    return this.snapshot.perspective!;
  }

  /** Dopo una mossa si aspetta la risposta dell'arbitro: niente doppi invii, ma senza restare bloccati se va persa. */
  private send(action: MatchAction): void {
    const before = this.snapshot;
    this.update({ ...before, canPlay: false, canDiscard: false, canDecide: false, canContinue: false });
    if (this.retry) clearTimeout(this.retry);
    this.retry = setTimeout(() => {
      this.retry = null;
      if (this.snapshot.view === before.view) this.update(before);
    }, ACTION_RETRY_MS);
    this.backend.sendAction(this.code, this.uid, this.setup.seed, action).catch((error: unknown) => {
      this.setNotice(`Mossa non inviata: ${roomErrorText(error)}`);
    });
  }

  private receive(message: ViewMessage): void {
    if (this.disposed) return;
    this.lastUpdate = Date.now();
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    this.update(this.toSnapshot(message));
  }

  private toSnapshot(message: ViewMessage): ClientSnapshot {
    return {
      ...message.snapshot,
      seats: this.setup.seats,
      turnDeadline: message.turnMs === null ? null : Date.now() + message.turnMs,
    };
  }

  private checkHost(): void {
    if (this.snapshot.match.phase === 'matchEnd') return;
    const silent = Date.now() - this.lastUpdate > HOST_SILENT_MS;
    const notice = silent ? `Partita in pausa: aspettiamo ${this.hostName}, che ha creato la stanza. Riprende appena torna.` : undefined;
    if (notice !== this.snapshot.notice) this.setNotice(notice);
  }

  private setNotice(notice: string | undefined): void {
    this.update({ ...this.snapshot, notice });
  }

  private update(snapshot: ClientSnapshot): void {
    if (this.disposed) return;
    this.snapshot = snapshot;
    this.listeners.forEach((l) => l());
  }
}
