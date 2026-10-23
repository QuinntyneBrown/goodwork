// Turns the raw take into the finished demo: places each narration clip at the time its caption appeared,
// loudness-normalizes the track, muxes it into the WebM as Opus without re-encoding the video,
// derives chapter times, and extracts a poster frame from the finished video.
//   node demo/assemble.mjs [--promote]
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

const e2e = fileURLToPath(new URL('..', import.meta.url));
const run = `${e2e}.demo-run/`;
const staging = `${run}staging/`;
const docs = `${e2e}../docs/demo/`;
const sh = (cmd, args) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const probe = (file, entries) => sh('ffprobe', ['-v', 'error', ...entries, '-of', 'json', file]);

const events = JSON.parse(readFileSync(`${staging}events.json`, 'utf8'));
const clips = new Map(
  JSON.parse(readFileSync(`${run}clips/manifest.json`, 'utf8')).map((c) => [c.id, c]),
);

// 1. Playwright's WebM has no duration or seek index; a stream copy adds them without touching the video.
sh('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-i',
  `${staging}raw.webm`,
  '-c',
  'copy',
  `${staging}fixed.webm`,
]);
const duration = Number(
  JSON.parse(probe(`${staging}fixed.webm`, ['-show_entries', 'format=duration'])).format.duration,
);

// 2. Capture-clock offset: the first frame where the dark opening card is half faded in.
const stats = sh('ffmpeg', [
  '-v',
  'error',
  '-i',
  `${staging}fixed.webm`,
  '-vf',
  'fps=10,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-',
  '-an',
  '-f',
  'null',
  '-',
]);
const frames = [...stats.matchAll(/pts_time:([\d.]+)\s+lavfi\.signalstats\.YAVG=([\d.]+)/g)].map(
  (m) => ({ t: Number(m[1]), y: Number(m[2]) }),
);
const dark = frames.find((f, i) => f.y < 140 && frames.slice(i, i + 5).every((g) => g.y < 140));
if (!dark) throw new Error('Could not find the opening card in the video');
const openingCard = events.find((e) => e.type === 'card' && e.id === 'opening-card');
const offsetMs = Math.round(dark.t * 1000 - (openingCard.ms + 200));
console.log(
  `opening card seen at ${dark.t.toFixed(1)} s; logged at ${(openingCard.ms / 1000).toFixed(2)} s; offset ${offsetMs} ms`,
);

// 3. Narration track
const captions = events
  .filter((e) => e.type === 'caption')
  .map((e) => ({ ...e, start: Math.max(0, e.ms + offsetMs), clip: clips.get(e.id) }));
captions.forEach((c, i) => {
  const next = captions[i + 1];
  if (next && c.start + c.clip.duration * 1000 > next.start)
    throw new Error(`${c.id} overlaps ${next.id}`);
});
const args = [
  '-y',
  '-loglevel',
  'error',
  '-f',
  'lavfi',
  '-t',
  duration.toFixed(3),
  '-i',
  'anullsrc=r=48000:cl=mono',
];
captions.forEach((c) => args.push('-i', c.clip.wav));
const delayed = captions.map((c, i) => `[${i + 1}:a]adelay=${c.start}:all=1[a${i}]`);
const filter = `${delayed.join(';')};[0:a]${captions.map((_, i) => `[a${i}]`).join('')}amix=inputs=${captions.length + 1}:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[mix]`;
args.push(
  '-filter_complex',
  filter,
  '-map',
  '[mix]',
  '-ar',
  '48000',
  '-ac',
  '1',
  `${staging}narration.wav`,
);
sh('ffmpeg', args);

// 4. Mux (video stream copied, never re-encoded)
sh('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-i',
  `${staging}fixed.webm`,
  '-i',
  `${staging}narration.wav`,
  '-map',
  '0:v:0',
  '-map',
  '1:a:0',
  '-c:v',
  'copy',
  '-c:a',
  'libopus',
  '-b:a',
  '96k',
  `${staging}goodwork.webm`,
]);

// 5. Chapters: the first caption of each chapter, on the corrected timeline
const chapters = [];
for (const c of captions) {
  const info = c.clip;
  if (!chapters.some((x) => x.id === info.chapter))
    chapters.push({
      id: info.chapter,
      title: info.title,
      start: Math.max(0, c.start / 1000 - 0.3),
    });
}
writeFileSync(`${staging}chapters.json`, JSON.stringify(chapters, null, 2));

// 6. Poster from the finished video: the hero with its caption, a couple of seconds into "Meet Goodwork"
const meet = chapters.find((c) => c.id === 'meet');
sh('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-ss',
  (meet.start + 2.5).toFixed(2),
  '-i',
  `${staging}goodwork.webm`,
  '-frames:v',
  '1',
  `${staging}goodwork-poster.png`,
]);

// 7. Facts for the README, read back from the finished file
const info = JSON.parse(
  probe(`${staging}goodwork.webm`, [
    '-show_entries',
    'format=duration,size:stream=codec_type,codec_name,width,height,duration',
  ]),
);
const meta = {
  duration: Number(info.format.duration),
  bytes: statSync(`${staging}goodwork.webm`).size,
  streams: info.streams,
  offsetMs,
  captions: captions.map((c) => ({
    id: c.id,
    start: c.start / 1000,
    end: c.start / 1000 + c.clip.duration,
  })),
};
writeFileSync(`${staging}meta.json`, JSON.stringify(meta, null, 2));
console.log(
  JSON.stringify(
    { duration: meta.duration, MB: (meta.bytes / 1e6).toFixed(1), streams: meta.streams },
    null,
    1,
  ),
);
console.log(chapters.map((c) => `${c.start.toFixed(1).padStart(6)} s  ${c.title}`).join('\n'));

// 8. Promote to docs/demo only on request, backing up whatever is there
if (process.argv.includes('--promote')) {
  mkdirSync(docs, { recursive: true });
  for (const [from, to] of [
    ['goodwork.webm', 'goodwork.webm'],
    ['goodwork-poster.png', 'goodwork-poster.png'],
  ]) {
    if (existsSync(`${docs}${to}`)) renameSync(`${docs}${to}`, `${staging}previous-${to}`);
    copyFileSync(`${staging}${from}`, `${docs}${to}`);
  }
  console.log('promoted to docs/demo');
}
