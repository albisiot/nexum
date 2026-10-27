// Caricato solo se FIREBASE_CONFIG è impostata, con un import dinamico:
// così l'SDK di Firebase non rallenta l'apertura del gioco.
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { User } from 'firebase/auth';

let app: FirebaseApp | null = null;

/** Un'unica app Firebase condivisa da accesso e database. */
export function firebaseApp(config: FirebaseOptions): FirebaseApp {
  app ??= initializeApp(config);
  return app;
}

export interface FirebaseAuthApi {
  signIn(): Promise<unknown>;
  signOut(): Promise<void>;
}

export function connect(config: FirebaseOptions, onUser: (user: User | null) => void): FirebaseAuthApi {
  const auth = getAuth(firebaseApp(config));
  auth.languageCode = 'it';
  onAuthStateChanged(auth, onUser);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return {
    // Popup invece di redirect: il sito è su github.io e il redirect di Firebase
    // non funziona nei browser che bloccano i cookie di terze parti.
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),
  };
}
