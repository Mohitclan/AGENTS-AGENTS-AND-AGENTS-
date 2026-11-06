#!/usr/bin/env node
// Makes three short instrumental tracks for the office speaker, so it has something to play before anyone adds
// their own songs. They are composed here from scratch (a dhol-style beat, plucked tumbi-like strings and a drone),
// so nothing is downloaded and there is no copyright to worry about. They go in music/, which git ignores.
//
//   node scripts/make-demo-music.mjs          write the tracks (skips ones that are already there)
//   node scripts/make-demo-music.mjs --force  write them again
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from './_shared.mjs';

const RATE = 22050;

// Each track: tempo, key (the frequency of Sa), the scale's steps in semitones, and a melody in scale degrees
// (0 is Sa; null is a rest), one entry per eighth note, looped with small changes.
export const TRACKS = [
  { file: '01 Office Bhangra (demo).wav', bpm: 112, sa: 220, scale: [0, 2, 4, 5, 7, 9, 11], bars: 40, melody: [4, 4, 5, 4, 2, null, 0, 2, 4, 5, 7, 5, 4, null, 2, null] },
  { file: '02 Chai Break Groove (demo).wav', bpm: 100, sa: 196, scale: [0, 2, 3, 5, 7, 9, 10], bars: 36, melody: [0, 2, 3, null, 3, 5, 3, 2, 0, null, 7, 5, 3, 2, 0, null] },
  { file: '03 Launch Day Dhol (demo).wav', bpm: 124, sa: 247, scale: [0, 1, 4, 5, 7, 8, 11], bars: 44, melody: [7, 8, 7, 5, 4, 5, 4, 1, 0, null, 0, 1, 4, 5, 7, null] },
];

// A seeded random, so the same track comes out every time.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function render(track, seed = 7) {
  const rand = rng(seed);
  const beat = 60 / track.bpm;
  const seconds = track.bars * 4 * beat;
  const n = Math.ceil(seconds * RATE);
  const out = new Float32Array(n);
  const add = (start, samples) => {
    const s0 = Math.round(start * RATE);
    for (let i = 0; i < samples.length && s0 + i < n; i++) out[s0 + i] += samples[i];
  };
  const freq = (degree, octave = 0) => {
    const steps = track.scale.length;
    const d = ((degree % steps) + steps) % steps;
    const o = Math.floor(degree / steps) + octave;
    return track.sa * 2 ** ((track.scale[d] + 12 * o) / 12);
  };

  // dhol: the deep "dhumm" (a falling sine) and the sharp "tak" (a short noisy click)
  const dhumm = (gain) => Float32Array.from({ length: Math.round(0.32 * RATE) }, (_, i) => {
    const t = i / RATE;
    return gain * Math.sin(2 * Math.PI * (55 * t + 40 * (1 - Math.exp(-t * 18)) / 18)) * Math.exp(-t * 9);
  });
  const tak = (gain) => {
    let prev = 0;
    return Float32Array.from({ length: Math.round(0.07 * RATE) }, (_, i) => {
      const t = i / RATE;
      const noise = rand() * 2 - 1;
      const hp = noise - prev;
      prev = noise;
      return gain * (0.6 * hp + 0.5 * Math.sin(2 * Math.PI * 420 * t)) * Math.exp(-t * 60);
    });
  };
  // a plucked string (Karplus-Strong): bright like a tumbi when the loop is short
  const pluck = (f, dur, gain) => {
    const period = Math.max(2, Math.round(RATE / f));
    const ring = Float32Array.from({ length: period }, () => rand() * 2 - 1);
    const len = Math.round(dur * RATE);
    const s = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const j = i % period;
      const next = (j + 1) % period;
      s[i] = ring[j] * gain * Math.min(1, (len - i) / (0.02 * RATE));
      ring[j] = 0.996 * 0.5 * (ring[j] + ring[next]);
    }
    return s;
  };

  // the bhangra "chaal": a strong beat, a light one, then a pickup
  const groove = [[0, 'D'], [0.75, 't'], [1, 'd'], [1.5, 't'], [2, 'D'], [2.75, 't'], [3, 'd'], [3.5, 'T']];
  for (let bar = 0; bar < track.bars; bar++) {
    const t0 = bar * 4 * beat;
    const intro = bar < 2;
    for (const [at, hit] of groove) {
      if (intro && hit !== 'D') continue;
      const when = t0 + at * beat;
      if (hit === 'D') add(when, dhumm(0.55));
      if (hit === 'd') add(when, dhumm(0.32));
      if (hit === 't') add(when, tak(0.22));
      if (hit === 'T') add(when, tak(0.32));
    }
    // a clap on 2 and 4 once the song gets going
    if (bar >= 4) for (const at of [1, 3]) add(t0 + at * beat, tak(0.18));
    // the tune: from bar 2, an eighth note each, an octave up for the second half of each eight-bar section
    if (bar >= 2) {
      const up = Math.floor(bar / 8) % 2;
      for (let k = 0; k < 8; k++) {
        const degree = track.melody[(bar * 8 + k) % track.melody.length];
        if (degree === null) continue;
        const shift = bar % 4 === 3 && k >= 6 ? 1 : 0;
        add(t0 + k * (beat / 2), pluck(freq(degree + shift, up), beat * 0.9, 0.3));
      }
    }
  }
  // the drone: Sa and Pa held low under everything, swelling a little
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const swell = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / (8 * beat));
    out[i] += 0.035 * (0.6 + 0.4 * swell) * (Math.sin(2 * Math.PI * freq(0, -1) * t) + 0.7 * Math.sin(2 * Math.PI * freq(4, -1) * t));
  }
  // fade in and out, then keep the loudest moment just under full scale
  const fade = Math.round(1.5 * RATE);
  for (let i = 0; i < fade && i < n; i++) {
    out[i] *= i / fade;
    out[n - 1 - i] *= i / fade;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const k = peak ? 0.89 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= k;
  return out;
}

// 16-bit mono WAV
export function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

if (isMain(import.meta.url)) {
  const dir = join(import.meta.dirname, '..', 'music');
  mkdirSync(dir, { recursive: true });
  for (const [i, track] of TRACKS.entries()) {
    const path = join(dir, track.file);
    if (existsSync(path) && !process.argv.includes('--force')) {
      console.log(`kept   ${track.file}`);
      continue;
    }
    const samples = render(track, 7 + i);
    writeFileSync(path, wav(samples));
    console.log(`wrote  ${track.file} (${Math.round(samples.length / RATE)} s)`);
  }
}
