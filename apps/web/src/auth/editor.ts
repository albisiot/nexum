import type { AuthState } from './auth';

/**
 * Account Google che vedono la voce "Editor" nel menu.
 * Nascondere la voce è solo comodità: a impedire davvero le modifiche agli altri
 * sono le regole di sicurezza di Firestore (firebase/firestore.rules), che usano lo stesso indirizzo.
 */
export const EDITOR_EMAILS = ['albividal2@gmail.com'];

export function isEditor(auth: AuthState): boolean {
  return auth.status === 'signedIn' && !!auth.account.email && EDITOR_EMAILS.includes(auth.account.email.toLowerCase());
}
