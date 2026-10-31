// Le stanze su Firestore. Caricato solo quando si apre il gioco online, perché questo SDK è pesante.
// Regole di sicurezza: firebase/firestore.rules.
//
// rooms/{code}             la stanza: chi c'è, la partita, il catalogo
// rooms/{code}/views/{uid} la vista privata di un giocatore (la legge solo lui)
// rooms/{code}/actions/*   le mosse inviate all'arbitro (le legge solo lui)
// rooms/{code}/host/state  lo stato completo con tutte le mani (lo legge solo l'arbitro)
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebaseApp } from '../auth/firebase';
import { FIREBASE_CONFIG } from '../auth/firebaseConfig';
import { MAX_MEMBERS, newRoomCode } from './backend';
import type { RemoteAction, Room, RoomBackend } from './backend';

const db = () => getFirestore(firebaseApp(FIREBASE_CONFIG!));
const roomRef = (code: string) => doc(db(), 'rooms', code);

export const firestoreBackend: RoomBackend = {
  async createRoom(uid, name) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newRoomCode();
      if ((await getDoc(roomRef(code))).exists()) continue;
      const room: Room = { code, hostUid: uid, status: 'lobby', members: { [uid]: { name, at: Date.now() } } };
      await setDoc(roomRef(code), room);
      return code;
    }
    throw new Error('Non è stato possibile creare la stanza: riprova.');
  },

  async joinRoom(code, uid, name) {
    const snap = await getDoc(roomRef(code));
    if (!snap.exists()) throw new Error('Non esiste nessuna stanza con questo codice.');
    const room = snap.data() as Room;
    if (room.members[uid]) return;
    if (room.status === 'closed') throw new Error('Questa stanza è stata chiusa.');
    if (room.status !== 'lobby') throw new Error('In questa stanza la partita è già iniziata.');
    if (Object.keys(room.members).length >= MAX_MEMBERS) throw new Error('Questa stanza è piena.');
    await updateDoc(roomRef(code), { [`members.${uid}`]: { name, at: Date.now() } });
  },

  async leaveRoom(room, uid) {
    if (room.hostUid === uid) await updateDoc(roomRef(room.code), { status: 'closed' });
    else await updateDoc(roomRef(room.code), { [`members.${uid}`]: deleteField() });
  },

  watchRoom(code, onRoom, onError) {
    return onSnapshot(roomRef(code), (snap) => onRoom(snap.exists() ? (snap.data() as Room) : null), onError);
  },

  async startMatch(code, setup, catalog) {
    await updateDoc(roomRef(code), { status: 'playing', setup, catalog });
  },

  async setStatus(code, status) {
    await updateDoc(roomRef(code), { status });
  },

  watchView(code, uid, onView, onError) {
    return onSnapshot(
      doc(db(), 'rooms', code, 'views', uid),
      (snap) => {
        if (snap.exists()) onView((snap.data() as { json: string }).json);
      },
      onError,
    );
  },

  async sendAction(code, uid, seed, action) {
    await addDoc(collection(db(), 'rooms', code, 'actions'), { uid, seed, action: JSON.stringify(action), at: Date.now() });
  },

  watchActions(code, onActions, onError) {
    return onSnapshot(
      collection(db(), 'rooms', code, 'actions'),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as { uid: string; seed: number; action: string; at: number }) }));
        docs.sort((a, b) => a.at - b.at);
        onActions(docs.map<RemoteAction>((d) => ({ id: d.id, uid: d.uid, seed: d.seed, action: JSON.parse(d.action) as RemoteAction['action'] })));
      },
      onError,
    );
  },

  async publish(code, state, views, consumed) {
    const batch = writeBatch(db());
    batch.set(doc(db(), 'rooms', code, 'host', 'state'), { json: state });
    for (const [uid, json] of Object.entries(views)) batch.set(doc(db(), 'rooms', code, 'views', uid), { json });
    for (const id of consumed) batch.delete(doc(db(), 'rooms', code, 'actions', id));
    await batch.commit();
  },

  async loadState(code) {
    const snap = await getDoc(doc(db(), 'rooms', code, 'host', 'state'));
    return snap.exists() ? (snap.data() as { json: string }).json : null;
  },
};
