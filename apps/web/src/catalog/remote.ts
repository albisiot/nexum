// Lettura e scrittura del catalogo su Firestore (versione "lite": niente aggiornamenti in tempo reale,
// molto più leggera). Caricato con un import dinamico.
//
// catalog/published → dati usati da tutti i giocatori (lettura pubblica)
// catalog/draft     → bozza dell'Editor (solo l'account autorizzato)
// Le regole di sicurezza sono in firebase/firestore.rules.
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import type { Catalog } from '@nexum/engine';
import { firebaseApp } from '../auth/firebase';
import { FIREBASE_CONFIG } from '../auth/firebaseConfig';

export interface StoredCatalog {
  catalog: Catalog;
  updatedBy?: string;
}

function ref(name: 'published' | 'draft') {
  return doc(getFirestore(firebaseApp(FIREBASE_CONFIG!)), 'catalog', name);
}

/** Firestore non accetta campi `undefined`: il passaggio da JSON li toglie. */
const plain = (catalog: Catalog): Catalog => JSON.parse(JSON.stringify(catalog)) as Catalog;

export async function loadCatalog(name: 'published' | 'draft'): Promise<StoredCatalog | null> {
  const snap = await getDoc(ref(name));
  return snap.exists() ? (snap.data() as StoredCatalog) : null;
}

export async function saveDraft(catalog: Catalog, email: string | null): Promise<void> {
  await setDoc(ref('draft'), { catalog: plain(catalog), updatedBy: email, updatedAt: serverTimestamp() });
}

/** Pubblica la bozza come nuova versione per tutti i giocatori. Restituisce il numero di versione. */
export async function publish(catalog: Catalog, email: string | null): Promise<number> {
  const current = await loadCatalog('published');
  const version = (current?.catalog.version ?? 0) + 1;
  const next = plain({ ...catalog, version });
  await setDoc(ref('published'), { catalog: next, updatedBy: email, updatedAt: serverTimestamp() });
  await setDoc(ref('draft'), { catalog: next, updatedBy: email, updatedAt: serverTimestamp() });
  return version;
}
