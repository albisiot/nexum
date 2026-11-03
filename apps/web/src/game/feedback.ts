// Suoni e vibrazione del gioco. I suoni sono sintetizzati nel browser (Web Audio): niente file da scaricare.
// Se sono attivi lo decidono le Impostazioni (settings.ts).
import { getSettings } from './settings';

export type Sound = 'card' | 'take' | 'takeMine' | 'turn' | 'deal' | 'intro' | 'coins' | 'win';

/** Solo i telefoni che la supportano (non iPhone): altrove il pulsante non compare. Chrome sul computer ha vibrate ma non vibra. */
export const canVibrate =
  typeof navigator !== 'undefined' &&
  typeof navigator.vibrate === 'function' &&
  typeof matchMedia === 'function' &&
  matchMedia('(pointer: coarse)').matches;

let audio: AudioContext | null = null;

/** Il contesto audio nasce al primo suono: i browser lo lasciano partire solo dopo un tocco, e in partita c'è già stato. */
function context(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  audio ??= new AudioContext();
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

/** Una nota: forma d'onda, frequenza (anche in scivolata fino a `to`), inizio e durata in secondi, volume. */
function tone(ctx: AudioContext, type: OscillatorType, freq: number, start: number, length: number, volume: number, to?: number) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

/** Un fruscio breve, filtrato: carta che tocca il tavolo o che scivola. */
function rustle(ctx: AudioContext, start: number, length: number, volume: number, freq: number) {
  const t = ctx.currentTime + start;
  const samples = Math.ceil(ctx.sampleRate * length);
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples) ** 2;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(t);
}

const NOTES = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

export function playSound(sound: Sound): void {
  if (!getSettings().sound) return;
  const ctx = context();
  if (!ctx) return;
  switch (sound) {
    case 'card':
      rustle(ctx, 0, 0.09, 0.5, 1800);
      tone(ctx, 'sine', 170, 0, 0.09, 0.18, 90);
      break;
    case 'take':
      tone(ctx, 'triangle', NOTES.E5, 0, 0.18, 0.12);
      tone(ctx, 'triangle', NOTES.A5, 0.08, 0.26, 0.12);
      break;
    case 'takeMine':
      tone(ctx, 'triangle', NOTES.G5, 0, 0.16, 0.13);
      tone(ctx, 'triangle', NOTES.C6, 0.07, 0.18, 0.13);
      tone(ctx, 'triangle', NOTES.E6, 0.14, 0.32, 0.13);
      break;
    case 'turn':
      tone(ctx, 'sine', NOTES.A5, 0, 0.14, 0.1);
      tone(ctx, 'sine', NOTES.E6, 0.1, 0.22, 0.08);
      break;
    case 'deal':
      // Una carta ogni 55 ms, come la distribuzione sul tavolo.
      for (let i = 0; i < 18; i++) rustle(ctx, i * 0.055, 0.04, 0.3, 2600 + (i % 3) * 300);
      break;
    case 'intro':
      tone(ctx, 'sine', 220, 0, 0.7, 0.09, 330);
      tone(ctx, 'triangle', NOTES.C5, 0.25, 0.6, 0.06);
      break;
    case 'coins':
      [0, 0.09, 0.18].forEach((start, i) => {
        tone(ctx, 'square', NOTES.G6, start, 0.08, 0.04);
        tone(ctx, 'square', NOTES.G6 * 1.335, start + 0.04, 0.12, 0.04 - i * 0.008);
      });
      break;
    case 'win':
      [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((freq, i) => tone(ctx, 'triangle', freq, i * 0.11, i === 3 ? 0.6 : 0.16, 0.14));
      break;
  }
}

/** Una vibrazione breve sul telefono, se è attiva. */
export function vibrate(pattern: number | number[]): void {
  if (getSettings().vibrate && canVibrate) navigator.vibrate(pattern);
}
