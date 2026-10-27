import type { FirebaseOptions } from 'firebase/app';

// Configurazione web del progetto Firebase "NEXUM"
// (console Firebase → Impostazioni progetto → Le tue app → nexum-web).
// Questi valori sono pubblici per natura: identificano il progetto ma non danno accesso a nulla;
// la protezione viene dai domini autorizzati impostati in Firebase Authentication.
// Con null l'accesso con Google resta nascosto e si gioca come ospite.
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyDxzwMw4y_POlG921cwD2ZnPRTM3snfcks',
  authDomain: 'nexum-theproject.firebaseapp.com',
  projectId: 'nexum-theproject',
  storageBucket: 'nexum-theproject.firebasestorage.app',
  messagingSenderId: '403795622810',
  appId: '1:403795622810:web:c66d279fd473d4106b1823',
};
