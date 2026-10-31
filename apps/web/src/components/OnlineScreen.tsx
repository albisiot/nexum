import { useEffect, useRef, useState } from 'react';
import { getCatalog, randomBotLevel } from '@nexum/engine';
import type { Catalog, MatchState } from '@nexum/engine';
import { useAuth } from '../auth/auth';
import { catalogStore } from '../catalog/store';
import type { GameClient, MatchSetup, Seat } from '../game/GameClient';
import { fakeIdentity, loadBackend, normalizeCode, roomErrorText } from '../online/backend';
import type { Room, RoomBackend } from '../online/backend';
import { OnlineGuestClient, OnlineHostClient } from '../online/OnlineClients';
import { AccountPanel } from './AccountPanel';
import { askConfirm } from './ConfirmDialog';
import { RoomQr } from './RoomQr';
import { SetupScreen, defaultSetup } from './SetupScreen';
import type { SetupValues } from './SetupScreen';

const SAVED_ROOM = 'nexum.room';

/** Un link di invito vale una volta sola: chi esce dalla stanza non deve rientrarci da solo. */
let inviteUsed = false;

function forgetInvite() {
  inviteUsed = true;
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  window.history.replaceState(null, '', url);
}

const inviteLink = (code: string) => `${window.location.origin}${window.location.pathname}?room=${code}`;

function savedRoom(): string | null {
  try {
    return localStorage.getItem(SAVED_ROOM);
  } catch {
    return null;
  }
}

function saveRoom(code: string | null) {
  try {
    if (code) localStorage.setItem(SAVED_ROOM, code);
    else localStorage.removeItem(SAVED_ROOM);
  } catch {
    // Senza localStorage si rientra scrivendo di nuovo il codice.
  }
}

/** I membri in ordine di arrivo: è anche l'ordine dei posti. */
function orderedMembers(room: Room) {
  return Object.entries(room.members)
    .map(([uid, m]) => ({ uid, ...m }))
    .sort((a, b) => a.at - b.at);
}

/** I posti della partita: prima chi è nella stanza, con nomi tutti diversi, poi la CPU. */
function buildSeats(room: Room, count: number): Seat[] {
  const used = new Map<string, number>();
  const humans = orderedMembers(room).map<Seat>((m) => {
    const times = (used.get(m.name) ?? 0) + 1;
    used.set(m.name, times);
    return { name: times > 1 ? `${m.name} ${times}` : m.name, kind: 'human', uid: m.uid };
  });
  const cpus = Array.from({ length: Math.max(0, count - humans.length) }, (_, i): Seat => ({ name: `CPU ${i + 1}`, kind: 'cpu', level: randomBotLevel(Math.random) }));
  return [...humans, ...cpus];
}

interface Props {
  /** Il codice arrivato con un link di invito. */
  invite: string | null;
  onEnter(client: GameClient): void;
  onBack(): void;
}

/** Il gioco online: si crea una stanza o si entra con un codice, si aspettano gli altri e si inizia. */
export function OnlineScreen({ invite, onEnter, onBack }: Props) {
  const auth = useAuth();
  const me = fakeIdentity ?? (auth.status === 'signedIn' ? { uid: auth.account.uid, firstName: auth.account.firstName } : null);
  const [backend, setBackend] = useState<RoomBackend | null>(null);
  const [code, setCode] = useState<string | null>(savedRoom);
  const [room, setRoom] = useState<Room | null>(null);
  const [input, setInput] = useState(invite ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState(false);
  const [copied, setCopied] = useState(false);
  const [values, setValues] = useState<SetupValues>(() => ({ ...defaultSetup(), mode: 'online' }));
  const lastStatus = useRef<Room['status'] | null>(null);
  const uid = me?.uid ?? null;

  useEffect(() => {
    let cancelled = false;
    loadBackend()
      .then((b) => {
        if (!cancelled) setBackend(b);
      })
      .catch((e: unknown) => setError(roomErrorText(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  const leaveToHome = (message: string | null) => {
    saveRoom(null);
    setCode(null);
    setRoom(null);
    setConfiguring(false);
    setBusy(null);
    lastStatus.current = null;
    setError(message);
  };

  /** Entra in partita: stesso catalogo per tutti; chi fa da arbitro riprende lo stato salvato, se è di questa partita. */
  const enterGame = async (b: RoomBackend, r: Room, myUid: string) => {
    const setup = JSON.parse(r.setup!) as MatchSetup;
    if (!setup.seats.some((s) => s.uid === myUid)) {
      setError('Questa partita è iniziata senza di te.');
      return;
    }
    setBusy('Collegamento alla partita…');
    try {
      catalogStore.override(JSON.parse(r.catalog!) as Catalog);
      if (r.hostUid === myUid) {
        const saved = await b.loadState(r.code);
        const state = saved ? (JSON.parse(saved) as MatchState) : null;
        onEnter(new OnlineHostClient(setup, r.code, myUid, b, state?.config.seed === setup.seed ? state : null));
      } else {
        const host = r.members[r.hostUid]?.name ?? 'chi ha creato la stanza';
        onEnter(await OnlineGuestClient.connect(setup, r.code, myUid, b, host));
      }
    } catch (e) {
      catalogStore.setGameRunning(false);
      setBusy(null);
      setError(roomErrorText(e));
    }
  };
  const enterRef = useRef(enterGame);
  enterRef.current = enterGame;

  useEffect(() => {
    if (!backend || !code || !uid) return;
    return backend.watchRoom(
      code,
      (r) => {
        if (!r) return leaveToHome('Questa stanza non esiste più.');
        if (r.status === 'closed') return leaveToHome('Chi ha creato la stanza l’ha chiusa.');
        if (!r.members[uid]) return leaveToHome(null);
        // Si entra da soli solo quando la partita parte; chi torna a partita in corso sceglie di rientrare.
        const started = lastStatus.current !== null && lastStatus.current !== 'playing' && r.status === 'playing';
        lastStatus.current = r.status;
        setRoom(r);
        if (started) void enterRef.current(backend, r, uid);
      },
      (e) => leaveToHome(roomErrorText(e)),
    );
  }, [backend, code, uid]);

  const members = room ? orderedMembers(room) : [];
  const memberCount = members.length;
  useEffect(() => {
    if (memberCount > values.playerCount) setValues((v) => ({ ...v, playerCount: memberCount }));
  }, [memberCount, values.playerCount]);

  const run = async (label: string, task: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(roomErrorText(e));
    }
    setBusy(null);
  };

  const create = () =>
    run('Creazione della stanza…', async () => {
      const newCode = await backend!.createRoom(me!.uid, me!.firstName);
      saveRoom(newCode);
      setCode(newCode);
    });

  const join = (target: string) =>
    run('Ingresso nella stanza…', async () => {
      await backend!.joinRoom(target, me!.uid, me!.firstName);
      saveRoom(target);
      setCode(target);
    });

  // Chi arriva dal QR o da un link entra da solo, appena ha fatto l'accesso.
  const joinRef = useRef(join);
  joinRef.current = join;
  useEffect(() => {
    if (!backend || !uid || !invite || inviteUsed) return;
    forgetInvite();
    const target = normalizeCode(invite);
    if (target.length === 5) void joinRef.current(target);
  }, [backend, uid, invite]);

  const start = (setup: MatchSetup) => {
    const r = room!;
    const seats = buildSeats(r, setup.seats.length);
    setConfiguring(false);
    void run('Avvio della partita…', () =>
      backend!.startMatch(r.code, JSON.stringify({ ...setup, seats }), JSON.stringify(getCatalog())),
    );
  };

  const leave = async () => {
    const r = room!;
    const isHost = r.hostUid === uid;
    const ok = await askConfirm({
      title: isHost ? 'Chiudere la stanza?' : 'Uscire dalla stanza?',
      text: isHost ? 'La stanza si chiude per tutti.' : undefined,
      confirm: isHost ? 'Chiudi la stanza' : 'Esci',
      cancel: 'Resta',
      danger: true,
    });
    if (!ok) return;
    void run('Uscita…', async () => {
      await backend!.leaveRoom(r, uid!);
      leaveToHome(null);
    });
  };

  const copyLink = async () => {
    const link = inviteLink(room!.code);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(`Copia il link a mano: ${link}`);
    }
  };

  if (room && configuring) {
    return (
      <SetupScreen
        values={values}
        onChange={setValues}
        onStart={start}
        onBack={() => setConfiguring(false)}
        members={members.map((m) => m.name)}
      />
    );
  }

  const status = (
    <>
      {busy && <p className="status">{busy}</p>}
      {error && <p className="status bad">{error}</p>}
    </>
  );

  if (!me) {
    return (
      <section className="panel online">
        <button type="button" className="back" onClick={onBack}>
          ← Menu principale
        </button>
        <h2>Gioca online</h2>
        <p className="hint">Per giocare online serve l’accesso con Google: così gli altri vedono il tuo nome.</p>
        <AccountPanel required />
      </section>
    );
  }

  if (!room) {
    const ready = !!backend && !busy;
    return (
      <section className="panel online">
        <button type="button" className="back" onClick={onBack}>
          ← Menu principale
        </button>
        <h2>Gioca online</h2>
        <p className="hint">Ognuno dal proprio dispositivo. Crea una stanza e condividi il codice con gli amici.</p>
        <div className="controls">
          <button type="button" className="btn primary" disabled={!ready} onClick={() => void create()}>
            Crea una stanza
          </button>
        </div>
        <h3 className="step">Hai un codice?</h3>
        <form
          className="room-join"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && normalizeCode(input).length === 5) void join(normalizeCode(input));
          }}
        >
          <label className="field grow">
            <span className="label">Codice della stanza</span>
            <input
              value={input}
              maxLength={5}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCDE"
              onChange={(e) => setInput(normalizeCode(e.target.value))}
            />
          </label>
          <button type="submit" className="btn" disabled={!ready || normalizeCode(input).length !== 5}>
            Entra
          </button>
        </form>
        {status}
      </section>
    );
  }

  const isHost = room.hostUid === uid;
  const hostName = room.members[room.hostUid]?.name ?? 'chi ha creato la stanza';

  return (
    <section className="panel online">
      <button type="button" className="back" onClick={onBack}>
        ← Menu principale
      </button>
      <span className="hint">Codice della stanza</span>
      <div className="room-code-row">
        <strong className="room-code">{room.code}</strong>
        <button type="button" className="btn small" onClick={() => void copyLink()}>
          {copied ? 'Link copiato' : 'Copia il link di invito'}
        </button>
      </div>
      {isHost && room.status === 'lobby' && <RoomQr link={inviteLink(room.code)} />}

      <h3 className="step">Nella stanza ({memberCount})</h3>
      <ul className="room-members">
        {members.map((m) => (
          <li key={m.uid} className={m.uid === uid ? 'me' : undefined}>
            <b>{m.name}</b>
            {m.uid === room.hostUid && <span className="pill">Arbitro</span>}
          </li>
        ))}
      </ul>

      {room.status === 'lobby' && (
        <p className="hint">
          {isHost ? 'Quando ci siete tutti, scegli le regole. I posti vuoti li gioca la CPU.' : `Aspettiamo che ${hostName} inizi la partita.`}
        </p>
      )}
      {room.status === 'playing' && <p className="hint">La partita è in corso.</p>}
      {room.status === 'ended' && (
        <p className="hint">{isHost ? 'La partita è finita. Volete rigiocare?' : `La partita è finita. Aspettiamo che ${hostName} ne prepari un’altra.`}</p>
      )}

      <div className="controls">
        {room.status === 'lobby' && isHost && (
          <button type="button" className="btn primary" disabled={!!busy} onClick={() => setConfiguring(true)}>
            Scegli le regole
          </button>
        )}
        {room.status === 'playing' && (
          <button type="button" className="btn primary" disabled={!!busy} onClick={() => void enterGame(backend!, room, uid!)}>
            Rientra nella partita
          </button>
        )}
        {room.status === 'ended' && isHost && (
          <button
            type="button"
            className="btn primary"
            disabled={!!busy}
            onClick={() => void run('Un momento…', () => backend!.setStatus(room.code, 'lobby'))}
          >
            Nuova partita
          </button>
        )}
        <button type="button" className="btn danger" disabled={!!busy} onClick={() => void leave()}>
          {isHost ? 'Chiudi la stanza' : 'Esci dalla stanza'}
        </button>
      </div>
      {status}
    </section>
  );
}
