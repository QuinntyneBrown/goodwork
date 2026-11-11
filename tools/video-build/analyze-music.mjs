// Music analysis for film decks: where the beats fall and how loud the track is, so the deck can
// move with it. Decodes the track with ffmpeg and works on the samples directly.
//
//   node tools/video-build/analyze-music.mjs docs/videos/assets/music/x.mp3 [seconds]
//
// analyzeMusic(file, seconds) → {
//   bpm       tempo, from the autocorrelation of the onset strength
//   beats     the beat grid in seconds, phased to the strongest onsets
//   hits      the strongest onsets in seconds (a strum, a kick), with a 0..1 strength
//   envelope  loudness at ENVELOPE_RATE values a second, 0..1
// }
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RATE = 22050;
const WINDOW = 1024;
const HOP = 256;
const FRAME = HOP / RATE;
export const ENVELOPE_RATE = 60;

/** In-place radix-2 FFT. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const c = Math.cos(ang * k);
        const s = Math.sin(ang * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

export function analyzeMusic(file, seconds) {
  const pcm = execFileSync(
    process.env.FFMPEG_PATH ?? "ffmpeg",
    ["-v", "error", "-i", file, "-t", String(seconds), "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength >> 2);
  const frames = Math.max(0, Math.floor((x.length - WINDOW) / HOP));

  // Onset strength: the rise in log magnitude across the spectrum from one frame to the next.
  const flux = new Float32Array(frames);
  const rms = new Float32Array(frames);
  let prev = new Float32Array(WINDOW / 2);
  for (let f = 0; f < frames; f++) {
    const re = new Float32Array(WINDOW);
    const im = new Float32Array(WINDOW);
    let energy = 0;
    for (let i = 0; i < WINDOW; i++) {
      const s = x[f * HOP + i];
      energy += s * s;
      re[i] = s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WINDOW - 1)));
    }
    rms[f] = Math.sqrt(energy / WINDOW);
    fft(re, im);
    const mag = new Float32Array(WINDOW / 2);
    let rise = 0;
    for (let k = 1; k < WINDOW / 2; k++) {
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      rise += Math.max(0, mag[k] - prev[k]);
    }
    flux[f] = rise;
    prev = mag;
  }
  // Remove the local average so a loud passage does not read as one long onset.
  const onset = new Float32Array(frames);
  const half = Math.round(0.1 / FRAME);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, f - half); j < Math.min(frames, f + half + 1); j++, n++) sum += flux[j];
    onset[f] = Math.max(0, flux[f] - sum / n);
  }

  // Tempo: the lag between 70 and 180 BPM whose autocorrelation is strongest.
  let period = 0;
  let best = -1;
  for (let lag = Math.round(60 / 180 / FRAME); lag <= Math.round(60 / 70 / FRAME); lag++) {
    let score = 0;
    for (let f = lag; f < frames; f++) score += onset[f] * onset[f - lag];
    score /= frames - lag;
    if (score > best) [best, period] = [score, lag];
  }
  // Phase: the offset whose grid collects the most onset strength.
  let phase = 0;
  best = -1;
  for (let p = 0; p < period; p++) {
    let score = 0;
    for (let f = p; f < frames; f += period) score += onset[f];
    if (score > best) [best, phase] = [score, p];
  }
  // The FFT window is centred half a window after the frame's first sample.
  const at = (f) => f * FRAME + WINDOW / 2 / RATE;
  const round = (v, d = 3) => Number(v.toFixed(d));
  const beats = [];
  for (let f = phase; f < frames; f += period) beats.push(round(at(f)));

  // Hits: local peaks of the onset strength, at least 120 ms apart, in the top of the range.
  const peak = Math.max(...onset) || 1;
  const gap = Math.round(0.12 / FRAME);
  const hits = [];
  for (let f = 1; f < frames - 1; f++) {
    if (onset[f] < peak * 0.3) continue;
    let top = true;
    for (let j = Math.max(0, f - gap); j <= Math.min(frames - 1, f + gap); j++) if (onset[j] > onset[f]) top = false;
    if (top) hits.push({ t: round(at(f)), strength: round(onset[f] / peak, 2) });
  }

  // Loudness, smoothed over about 80 ms and normalised to the loudest moment.
  const loudest = Math.max(...rms) || 1;
  const envelope = [];
  for (let i = 0; i < Math.ceil(seconds * ENVELOPE_RATE); i++) {
    const centre = (i / ENVELOPE_RATE - WINDOW / 2 / RATE) / FRAME;
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, Math.round(centre - 3)); j <= Math.min(frames - 1, Math.round(centre + 3)); j++, n++) sum += rms[j];
    envelope.push(round(n ? sum / n / loudest : 0, 2));
  }
  return { bpm: round(60 / (period * FRAME), 1), beats, hits, envelope };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, seconds = "30"] = process.argv.slice(2);
  const m = analyzeMusic(file, Number(seconds));
  console.log(`${m.bpm} BPM, ${m.beats.length} beats, ${m.hits.length} hits`);
  console.log(`beats ${m.beats.join(" ")}`);
  console.log(`hits  ${m.hits.map((h) => `${h.t}(${h.strength})`).join(" ")}`);
}
