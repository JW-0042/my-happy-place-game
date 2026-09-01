/** Tiny Web Audio stingers — Win95-adjacent, no binary assets. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function unlockAudio() {
  const c = audio();
  if (c && c.state === "suspended") void c.resume();
}

function prefersQuiet() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  gain: number,
  type: OscillatorType = "triangle",
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function volumeGain(volume: number) {
  return Math.max(0, Math.min(1, volume / 100)) * 0.11;
}

/** Startup chord (C–E–G arpeggio). */
export function playStartup(volume = 72) {
  if (prefersQuiet() || volume <= 0) return;
  const c = audio();
  if (!c) return;
  void c.resume();
  const t = c.currentTime + 0.02;
  const g = volumeGain(volume);
  tone(c, 261.63, t, 0.55, g);
  tone(c, 329.63, t + 0.08, 0.55, g * 0.9);
  tone(c, 392.0, t + 0.16, 0.7, g * 0.85);
  tone(c, 523.25, t + 0.28, 0.85, g * 0.55, "sine");
}

/** Toast ding. */
export function playDing(volume = 72) {
  if (prefersQuiet() || volume <= 0) return;
  const c = audio();
  if (!c) return;
  void c.resume();
  const t = c.currentTime;
  const g = volumeGain(volume) * 1.2;
  tone(c, 880, t, 0.12, g, "sine");
  tone(c, 1174.66, t + 0.08, 0.18, g * 0.7, "sine");
}

/** BSOD — lower, longer chord. */
export function playBsod(volume = 72) {
  if (prefersQuiet() || volume <= 0) return;
  const c = audio();
  if (!c) return;
  void c.resume();
  const t = c.currentTime;
  const g = volumeGain(volume) * 1.1;
  tone(c, 196.0, t, 0.9, g, "sawtooth");
  tone(c, 146.83, t + 0.12, 1.1, g * 0.8, "triangle");
  tone(c, 98.0, t + 0.22, 1.3, g * 0.7, "sine");
}
