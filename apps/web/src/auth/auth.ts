import { useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import type { FirebaseAuthApi } from './firebase';
import { FIREBASE_CONFIG } from './firebaseConfig';

export interface Account {
  name: string;
  firstName: string;
  email: string | null;
  photoUrl: string | null;
}

export type AuthState =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signedOut'; error?: string }
  | { status: 'signedIn'; account: Account };

function toAccount(user: User): Account {
  const name = user.displayName?.trim() || user.email?.split('@')[0] || 'Giocatore';
  return { name, firstName: name.split(/\s+/)[0]!, email: user.email, photoUrl: user.photoURL };
}

function errorMessage(error: unknown): string | undefined {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return undefined;
  if (code === 'auth/popup-blocked') return 'Il browser ha bloccato la finestra di accesso: consenti i popup per questo sito.';
  if (code === 'auth/unauthorized-domain') return 'Questo indirizzo non è autorizzato in Firebase.';
  if (code === 'auth/network-request-failed') return 'Connessione assente: riprova quando sei online.';
  return 'Accesso non riuscito. Riprova.';
}

/** Stato dell'account Google, condiviso da tutta l'app. */
class AuthStore {
  private state: AuthState;
  private readonly listeners = new Set<() => void>();
  private readonly api: Promise<FirebaseAuthApi> | null = null;

  constructor() {
    if (!FIREBASE_CONFIG) {
      this.state = { status: 'disabled' };
      return;
    }
    const config = FIREBASE_CONFIG;
    this.state = { status: 'loading' };
    this.api = import('./firebase').then((m) =>
      m.connect(config, (user) => this.set(user ? { status: 'signedIn', account: toAccount(user) } : { status: 'signedOut' })),
    );
    this.api.catch(() => this.set({ status: 'signedOut', error: 'Accesso non disponibile in questo momento.' }));
  }

  getSnapshot = (): AuthState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async signIn(): Promise<void> {
    if (!this.api) return;
    if (this.state.status === 'signedOut' && this.state.error) this.set({ status: 'signedOut' });
    try {
      await (await this.api).signIn();
    } catch (error) {
      this.set({ status: 'signedOut', error: errorMessage(error) });
    }
  }

  async signOut(): Promise<void> {
    if (!this.api) return;
    await (await this.api).signOut();
  }

  private set(state: AuthState): void {
    this.state = state;
    this.listeners.forEach((l) => l());
  }
}

export const authStore = new AuthStore();

export function useAuth(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
}
