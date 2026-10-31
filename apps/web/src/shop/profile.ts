// Monete e collezione del giocatore, salvate sul suo account (profiles/{uid}, regole in firebase/firestore.rules).
// Senza un server è il browser a estrarre le carte: le regole limitano gli abusi, ma non li impediscono del tutto.
import { useSyncExternalStore } from 'react';
import { PACK_PRICE, duplicateCoins, openPack } from '@nexum/engine';
import type { CardId, PackPull } from '@nexum/engine';
import { authStore } from '../auth/auth';
import { FIREBASE_CONFIG } from '../auth/firebaseConfig';
import { fakeIdentity } from '../online/backend';

export interface Profile {
  coins: number;
  cards: Record<CardId, true>;
  /** Gli ultimi premi incassati: rientrando in una partita non si incassano due volte. */
  rewarded: string[];
}

export type ProfileState =
  | { status: 'signedOut' }
  | { status: 'loading' }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; message: string };

const EMPTY: Profile = { coins: 0, cards: {}, rewarded: [] };
const REWARDS_KEPT = 50;

interface ProfileBackend {
  load(uid: string): Promise<Profile>;
  /** Legge e riscrive insieme, così due dispositivi non si sovrascrivono. Se `change` non cambia niente, non scrive. */
  update(uid: string, change: (profile: Profile) => Profile): Promise<Profile>;
}

async function firestoreBackend(): Promise<ProfileBackend> {
  const [{ doc, getDoc, getFirestore, runTransaction }, { firebaseApp }] = await Promise.all([
    import('firebase/firestore/lite'),
    import('../auth/firebase'),
  ]);
  const db = getFirestore(firebaseApp(FIREBASE_CONFIG!));
  const ref = (uid: string) => doc(db, 'profiles', uid);
  return {
    async load(uid) {
      const snap = await getDoc(ref(uid));
      return snap.exists() ? (snap.data() as Profile) : EMPTY;
    },
    update(uid, change) {
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref(uid));
        const current = snap.exists() ? (snap.data() as Profile) : EMPTY;
        const next = change(current);
        if (next !== current) tx.set(ref(uid), next);
        return next;
      });
    },
  };
}

/** Solo in sviluppo, con ?fakeOnline=Nome: il profilo vive nel localStorage. */
const localBackend: ProfileBackend = {
  async load(uid) {
    const json = localStorage.getItem(`nexum-fake:profile:${uid}`);
    return json ? (JSON.parse(json) as Profile) : EMPTY;
  },
  async update(uid, change) {
    const next = change(await this.load(uid));
    localStorage.setItem(`nexum-fake:profile:${uid}`, JSON.stringify(next));
    return next;
  },
};

class ProfileStore {
  private state: ProfileState = { status: 'signedOut' };
  private uid: string | null = null;
  private backend: Promise<ProfileBackend> | null = null;
  /** Una scrittura alla volta, nell'ordine in cui arrivano. */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<() => void>();

  constructor() {
    authStore.subscribe(() => this.sync());
    this.sync();
  }

  getSnapshot = (): ProfileState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Incassa un premio, una volta sola. Senza account non succede niente. */
  award(key: string, amount: number): void {
    if (!this.uid) return;
    void this.write((p) =>
      p.rewarded.includes(key) ? p : { ...p, coins: p.coins + amount, rewarded: [...p.rewarded, key].slice(-REWARDS_KEPT) },
    ).catch((error: unknown) => console.warn('Premio non incassato:', error));
  }

  /** Compra e apre un pacchetto: restituisce le carte trovate. */
  async buyPack(): Promise<PackPull[]> {
    let pulls: PackPull[] = [];
    await this.write((p) => {
      if (p.coins < PACK_PRICE) throw new Error('Non hai abbastanza monete.');
      pulls = openPack(p.cards, Math.random);
      const cards = { ...p.cards };
      for (const pull of pulls) cards[pull.cardId] = true;
      return { ...p, coins: p.coins - PACK_PRICE + duplicateCoins(pulls), cards };
    });
    return pulls;
  }

  private write(change: (profile: Profile) => Profile): Promise<Profile> {
    const uid = this.uid!;
    const task = this.queue.then(async () => {
      const next = await (await this.loadBackend()).update(uid, change);
      if (uid === this.uid) this.set({ status: 'ready', profile: next });
      return next;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }

  private loadBackend(): Promise<ProfileBackend> {
    this.backend ??= fakeIdentity ? Promise.resolve(localBackend) : firestoreBackend();
    return this.backend;
  }

  private sync(): void {
    const auth = authStore.getSnapshot();
    const uid = fakeIdentity?.uid ?? (auth.status === 'signedIn' ? auth.account.uid : null);
    if (uid === this.uid) return;
    this.uid = uid;
    if (!uid) {
      this.set({ status: 'signedOut' });
      return;
    }
    this.set({ status: 'loading' });
    this.loadBackend()
      .then((b) => b.load(uid))
      .then((profile) => {
        if (uid === this.uid) this.set({ status: 'ready', profile });
      })
      .catch((error: unknown) => {
        if (uid !== this.uid) return;
        console.warn('Profilo non disponibile:', error);
        this.set({ status: 'error', message: 'Monete e collezione non disponibili: riprova più tardi.' });
      });
  }

  private set(state: ProfileState): void {
    this.state = state;
    this.listeners.forEach((l) => l());
  }
}

export const profileStore = new ProfileStore();

export function useProfile(): ProfileState {
  return useSyncExternalStore(profileStore.subscribe, profileStore.getSnapshot);
}
