// Solo in sviluppo (?fakeOnline=Nome): le stanze vivono nel localStorage e i giocatori sono schede dello stesso
// browser. Serve a provare una partita online vera, con più giocatori, senza account e senza toccare il database.
import { MAX_MEMBERS, newRoomCode } from './backend';
import type { RemoteAction, Room, RoomBackend } from './backend';

const PREFIX = 'nexum-fake:';
const roomKey = (code: string) => `${PREFIX}room:${code}`;
const viewKey = (code: string, uid: string) => `${PREFIX}view:${code}:${uid}`;
const stateKey = (code: string) => `${PREFIX}state:${code}`;
const actionKey = (code: string) => `${PREFIX}action:${code}:`;

const readRoom = (code: string) => {
  const json = localStorage.getItem(roomKey(code));
  return json ? (JSON.parse(json) as Room) : null;
};

/** I cambiamenti arrivano alle altre schede con l'evento storage, a questa con una chiamata diretta. */
const listeners = new Set<() => void>();
window.addEventListener('storage', () => listeners.forEach((l) => l()));
const changed = () => setTimeout(() => listeners.forEach((l) => l()), 0);

function write(key: string, value: string) {
  localStorage.setItem(key, value);
  changed();
}

function watch(read: () => string | null, emit: (value: string | null) => void): () => void {
  let last: string | null | undefined;
  const check = () => {
    const now = read();
    if (now !== last) {
      last = now;
      emit(now);
    }
  };
  listeners.add(check);
  setTimeout(check, 0);
  return () => listeners.delete(check);
}

function updateRoom(code: string, change: (room: Room) => void) {
  const room = readRoom(code);
  if (!room) throw new Error('Non esiste nessuna stanza con questo codice.');
  change(room);
  write(roomKey(code), JSON.stringify(room));
}

export const localBackend: RoomBackend = {
  async createRoom(uid, name) {
    const code = newRoomCode();
    const room: Room = { code, hostUid: uid, status: 'lobby', members: { [uid]: { name, at: Date.now() } } };
    write(roomKey(code), JSON.stringify(room));
    return code;
  },

  async joinRoom(code, uid, name) {
    const room = readRoom(code);
    if (!room) throw new Error('Non esiste nessuna stanza con questo codice.');
    if (room.members[uid]) return;
    if (room.status === 'closed') throw new Error('Questa stanza è stata chiusa.');
    if (room.status !== 'lobby') throw new Error('In questa stanza la partita è già iniziata.');
    if (Object.keys(room.members).length >= MAX_MEMBERS) throw new Error('Questa stanza è piena.');
    updateRoom(code, (r) => (r.members[uid] = { name, at: Date.now() }));
  },

  async leaveRoom(room, uid) {
    updateRoom(room.code, (r) => {
      if (r.hostUid === uid) r.status = 'closed';
      else delete r.members[uid];
    });
  },

  watchRoom(code, onRoom) {
    return watch(
      () => localStorage.getItem(roomKey(code)),
      (json) => onRoom(json ? (JSON.parse(json) as Room) : null),
    );
  },

  async startMatch(code, setup, catalog) {
    updateRoom(code, (r) => {
      r.status = 'playing';
      r.setup = setup;
      r.catalog = catalog;
    });
  },

  async setStatus(code, status) {
    updateRoom(code, (r) => (r.status = status));
  },

  watchView(code, uid, onView) {
    return watch(
      () => localStorage.getItem(viewKey(code, uid)),
      (json) => {
        if (json) onView(json);
      },
    );
  },

  async sendAction(code, uid, seed, action) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    write(`${actionKey(code)}${id}`, JSON.stringify({ id, uid, seed, action }));
  },

  watchActions(code, onActions) {
    const read = () =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith(actionKey(code)))
        .sort()
        .map((k) => localStorage.getItem(k))
        .join('\n');
    return watch(read, (text) => {
      onActions(text ? text.split('\n').filter(Boolean).map((line) => JSON.parse(line) as RemoteAction) : []);
    });
  },

  async publish(code, state, views, consumed) {
    localStorage.setItem(stateKey(code), state);
    for (const [uid, json] of Object.entries(views)) localStorage.setItem(viewKey(code, uid), json);
    for (const id of consumed) localStorage.removeItem(`${actionKey(code)}${id}`);
    changed();
  },

  async loadState(code) {
    return localStorage.getItem(stateKey(code));
  },
};
