// Synthesizes one clip per narration paragraph with edge-tts, normalizes each to 48 kHz mono WAV,
// and writes .demo-run/clips/manifest.json with the measured duration of every clip.
//   node demo/synthesize.mjs [--dry]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PITCH, RATE, VOICE, clipKey, loadNarration } from './narration.mjs';

const run = fileURLToPath(new URL('../.demo-run/', import.meta.url));
const python = `${run}venv/bin/python`;
const clips = `${run}clips/`;
const dry = process.argv.includes('--dry');

const paragraphs = loadNarration();
const words = paragraphs.reduce((n, p) => n + p.text.split(/\s+/).length, 0);
console.log(
  `${paragraphs.length} paragraphs, ${words} words, about ${Math.round(words / 2.8)} s of speech at this pace`,
);
if (dry) process.exit(0);

mkdirSync(clips, { recursive: true });
const manifest = [];
for (const p of paragraphs) {
  const key = clipKey(p.spoken);
  const mp3 = `${clips}${key}.mp3`;
  const wav = `${clips}${key}.wav`;
  if (!existsSync(wav)) {
    execFileSync(
      python,
      [
        '-m',
        'edge_tts',
        '--voice',
        VOICE,
        `--rate=${RATE}`,
        `--pitch=${PITCH}`,
        '--text',
        p.spoken,
        '--write-media',
        mp3,
      ],
      { stdio: 'inherit', timeout: 60_000 },
    );
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      mp3,
      '-ar',
      '48000',
      '-ac',
      '1',
      wav,
    ]);
  }
  const duration = Number(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      wav,
    ]).toString(),
  );
  manifest.push({ ...p, wav, duration });
  console.log(`${p.id.padEnd(12)} ${duration.toFixed(1).padStart(5)} s  ${p.text.slice(0, 60)}`);
}
writeFileSync(`${clips}manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`total ${manifest.reduce((s, p) => s + p.duration, 0).toFixed(1)} s of narration`);
