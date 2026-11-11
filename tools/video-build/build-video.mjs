#!/usr/bin/env node
// Video builder for docs/videos/NN-topic/: slides.html + the narration manifest → captioned MP4.
//
//   node tools/video-build/build-video.mjs docs/videos/01-x --check         resolve cues, print the schedule
//   node tools/video-build/build-video.mjs docs/videos/01-x --slides-only   render PNGs to .cache/01-x/slides/
//   node tools/video-build/build-video.mjs docs/videos/01-x                 encode the 1920x1080 MP4
//   node tools/video-build/build-video.mjs docs/videos/01-x --no-captions   encode without burned-in captions
//                                                                           (the SRT is still written for a <track>)
//
// A slide with data-clip="clips/x.mp4" (a screen recording from tools/video-record) gets that
// MP4 overlaid on its .clip box for the slide's time: held on its last frame when the narration
// runs longer, sped up evenly when it runs shorter. data-clip-delay="s" holds the first frame.
//
// <body data-music="../assets/music/x.mp3"> lays that track under the narration: looped if it
// is shorter, at data-music-db (default -10.8 dB), faded in over 1.5 s. The last slide holds 3 s
// after the narration so the music plays on and fades out over the last 2 s.
//
// A film deck (<body data-film>, run by docs/videos/assets/film.js) is not a set of stills: it is
// rendered frame by frame at 60 fps. The builder first writes timing.js beside the deck - each
// scene's start (its data-cue, moved onto the nearest beat of the music), the time of every
// data-at phrase (exact at the narration's pauses) and the music's beats, hits and loudness
// (analyze-music.mjs) - then seeks the page through FILM.seek and pipes the frames to ffmpeg.
// --check writes timing.js and prints the schedule; --slides-only renders one settled PNG a scene.
// Film decks need Playwright's Chromium (e2e/node_modules) for WebGPU and WebGL.
//
// Needs the manifest written by tools/video-audio (run it first), Chrome/Chromium (EDGE_PATH
// or CHROME_PATH override; Playwright's bundled Chromium is found automatically) and ffmpeg
// with libx264 and libass (FFMPEG_PATH override).
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { analyzeMusic, ENVELOPE_RATE } from "./analyze-music.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const ffprobe = process.env.FFPROBE_PATH ?? "ffprobe";
const MAX_CLIP_RATE = 1.6;
const MIN_SLIDE = 4;
const MAX_SLIDE = 90;
const MUSIC_DB = -10.8;
const MUSIC_FADE_IN = 1.5;
const MUSIC_FADE_OUT = 2;
const MUSIC_TAIL = 3;
const FILM_FPS = 60;
const BEAT_SNAP = 0.3;

function findBrowser() {
  const override = process.env.EDGE_PATH ?? process.env.CHROME_PATH;
  if (override) return override;
  const candidates = [
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ];
  // Playwright's browsers: prefer headless_shell, whose viewport is exactly --window-size
  // (new-headless Chrome reserves window chrome and leaves a strip under the page).
  const pw = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (existsSync(pw)) {
    // Older and newer Playwright layouts (chrome-linux/ vs chrome-linux64/).
    for (const d of readdirSync(pw).filter((d) =>
      /^chromium_headless_shell-\d+$/.test(d),
    )) {
      candidates.unshift(
        join(pw, d, "chrome-linux", "headless_shell"),
        join(pw, d, "chrome-headless-shell-linux64", "chrome-headless-shell"),
      );
    }
    for (const d of readdirSync(pw).filter((d) => /^chromium-\d+$/.test(d))) {
      candidates.push(
        join(pw, d, "chrome-linux", "chrome"),
        join(pw, d, "chrome-linux64", "chrome"),
      );
    }
  }
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error("No Chrome/Edge found; set EDGE_PATH or CHROME_PATH");
  return found;
}

const isHeadlessShell = (browser) =>
  /^(headless_shell|chrome-headless-shell)$/.test(basename(browser));

const norm = (s) =>
  s
    .replace(/`/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** <section> attributes in document order (the slides are hand-authored, so a regex suffices). */
function parseSlides(html) {
  return [...html.matchAll(/<section\b([^>]*)>/g)].map((m, i) => {
    const attr = (name) => m[1].match(new RegExp(`${name}="([^"]*)"`))?.[1];
    return {
      index: i,
      id: attr("id") ?? `slide-${i + 1}`,
      cue: attr("data-cue"),
      part: Number(attr("data-part") ?? 0),
      clip: attr("data-clip"),
      clipDelay: Number(attr("data-clip-delay") ?? 0),
    };
  });
}

/** <body data-music> and data-music-db, or null when the deck has no background music. */
function parseMusic(html, folder) {
  const body = html.match(/<body\b([^>]*)>/)?.[1] ?? "";
  const attr = (name) => body.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  const src = attr("data-music");
  if (!src) return null;
  const file = resolve(folder, src);
  if (!existsSync(file)) throw new Error(`data-music: ${src} not found`);
  return { file, db: Number(attr("data-music-db") ?? MUSIC_DB) };
}

/** When word `k` of a paragraph's `total` is spoken: by word count, inside the phrase that holds
 *  it when the pauses were measured (measurePhrases), else across the whole paragraph. */
function wordTime(b, k, total) {
  const p = b.phrases?.find((x) => k >= x.from && k < x.to) ?? {
    from: 0,
    to: total,
    start: b.start,
    end: b.end,
  };
  return p.start + ((p.end - p.start) * (k - p.from)) / (p.to - p.from);
}

/** Every place a cue occurs in the script: a `##` heading is its section's start; text inside a
 *  paragraph is interpolated by words. */
function findCue(text, manifest) {
  const cue = norm(text);
  const hits = [];
  for (const sec of manifest.sections) {
    if (norm(sec.title) === cue) hits.push(sec.start);
    for (const b of sec.blocks) {
      const spoken = norm(b.text);
      const total = spoken.split(" ").length;
      let at = spoken.indexOf(cue);
      while (at !== -1) {
        const before = spoken.slice(0, at).split(" ").filter(Boolean).length;
        hits.push(wordTime(b, before, total));
        at = spoken.indexOf(cue, at + 1);
      }
    }
  }
  return hits;
}

/** Splits every paragraph into its phrases (at , . ; : ! ?) and times each one from the pauses
 *  in the narration itself, so a cue lands on its word rather than on a word-count estimate.
 *  A paragraph with fewer pauses than phrase breaks keeps the estimate. */
function measurePhrases(manifest, mp3) {
  const log = spawnSync(
    ffmpeg,
    ["-hide_banner", "-i", mp3, "-af", "silencedetect=noise=-35dB:d=0.12", "-f", "null", "-"],
    { encoding: "utf8" },
  ).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const pauses = ends.map((end, i) => ({ start: starts[i], end }));
  for (const b of manifest.sections.flatMap((sec) => sec.blocks)) {
    const words = norm(b.text).split(" ");
    const breaks = words.flatMap((w, i) => (/[,.;:!?]$/.test(w) && i + 1 < words.length ? [i + 1] : []));
    // The speech itself: the paragraph without the silence at either end.
    const from = pauses.find((p) => p.start <= b.start + 0.05 && p.end > b.start)?.end ?? b.start;
    const to = pauses.find((p) => p.start < b.end && p.end >= b.end - 0.05)?.start ?? b.end;
    const inside = pauses
      .filter((p) => p.start > from && p.end < to)
      .sort((x, y) => y.end - y.start - (x.end - x.start))
      .slice(0, breaks.length)
      .sort((x, y) => x.start - y.start);
    if (inside.length < breaks.length) continue;
    b.phrases = [0, ...breaks].map((wordFrom, i) => ({
      from: wordFrom,
      to: breaks[i] ?? words.length,
      start: i ? inside[i - 1].end : from,
      end: inside[i]?.start ?? to,
    }));
  }
}

/** data-cue → seconds, `lead` seconds early. Every cue must be unique in the script and in
 *  narration order. */
function resolveCues(slides, manifest, lead = 0.15) {
  const errors = [];
  let last = -1;
  for (const s of slides) {
    if (s.index === 0) {
      s.start = 0;
      continue;
    }
    if (!s.cue) {
      errors.push(`slide ${s.index + 1} (#${s.id}) has no data-cue`);
      continue;
    }
    const hits = findCue(s.cue, manifest);
    if (hits.length === 0)
      errors.push(
        `slide ${s.index + 1} (#${s.id}): cue not found in script: "${s.cue}"`,
      );
    else if (hits.length > 1)
      errors.push(
        `slide ${s.index + 1} (#${s.id}): cue is not unique (${hits.length} matches): "${s.cue}"`,
      );
    else {
      s.start = Math.max(0, hits[0] - lead);
      if (s.start <= last)
        errors.push(
          `slide ${s.index + 1} (#${s.id}): cue is out of narration order`,
        );
      last = s.start;
    }
  }
  slides.forEach(
    (s, i) =>
      (s.end = i + 1 < slides.length ? slides[i + 1].start : manifest.duration),
  );
  return errors;
}

const ts = (t) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = (t % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${s}`;
};
const mmss = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** Paragraph → caption lines of at most ~84 characters, timed by character share. */
function captionEvents(manifest) {
  const events = [];
  for (const sec of manifest.sections) {
    for (const b of sec.blocks) {
      // A sentence ends at . ! or ? followed by a space, so "www.saturdaze.ca" and
      // `Saturdaze.Api` stay whole.
      const sentences = b.caption.split(/(?<=[.!?]["')\]]?)\s+/);
      const chunks = [];
      for (let s of sentences.map((x) => x.trim()).filter(Boolean)) {
        while (s.length > 84) {
          let cut = s.lastIndexOf(" ", 84);
          const comma = s.lastIndexOf(", ", 84);
          if (comma > 40) cut = comma + 1;
          chunks.push(s.slice(0, cut).trim());
          s = s.slice(cut).trim();
        }
        chunks.push(s);
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      let t = b.start;
      for (const c of chunks) {
        const d = ((b.end - b.start) * c.length) / total;
        events.push({
          start: t,
          end: t + d,
          text: (b.speaker ? `${b.speaker}: ` : "") + c,
        });
        t += d;
      }
    }
  }
  return events;
}

function writeAss(events, file) {
  const esc = (s) =>
    s.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,40,&H00FFFFFF,&H00FFFFFF,&H50291F1F,&H50291F1F,0,0,0,0,100,100,0,0,3,14,0,2,160,160,48,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  writeFileSync(
    file,
    header +
      events
        .map(
          (e) =>
            `Dialogue: 0,${ts(e.start)},${ts(e.end)},Default,,0,0,0,,${esc(e.text)}`,
        )
        .join("\n") +
      "\n",
  );
}

function writeSrt(events, file) {
  const t = (x) =>
    ts(x)
      .replace(/^(\d):/, "0$1:")
      .replace(".", ",") + "0";
  writeFileSync(
    file,
    events
      .map((e, i) => `${i + 1}\n${t(e.start)} --> ${t(e.end)}\n${e.text}\n`)
      .join("\n"),
  );
}

/** Lays out every slide at 1920x1080 in one headless pass; returns overflow problems and clip boxes. */
function auditSlides(slidesFile) {
  const browser = findBrowser();
  const dom = execFileSync(
    browser,
    [
      ...(isHeadlessShell(browser) ? [] : ["--headless=new"]),
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1920,1080",
      "--virtual-time-budget=3000",
      "--dump-dom",
      `${pathToFileURL(slidesFile).href}?render=1&audit=1`,
    ],
    { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
  ).toString();
  const read = (name) => {
    const m = dom.match(new RegExp(`${name}="([^"]*)"`));
    return (
      m &&
      JSON.parse(
        m[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">"),
      )
    );
  };
  const problems = read("data-audit");
  if (!problems)
    throw new Error("slide audit did not run (no data-audit on <body>)");
  return { problems, clips: read("data-clips") ?? [] };
}

function renderSlides(slidesFile, slides, outDir) {
  const browser = findBrowser();
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const url = pathToFileURL(slidesFile).href;
  for (const s of slides) {
    const png = join(outDir, `${String(s.index + 1).padStart(3, "0")}.png`);
    execFileSync(
      browser,
      [
        ...(isHeadlessShell(browser) ? [] : ["--headless=new"]),
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1920,1080",
        "--virtual-time-budget=2000",
        `--screenshot=${png}`,
        `${url}?render=1&slide=${s.index + 1}`,
      ],
      { stdio: "ignore" },
    );
    if (!existsSync(png))
      throw new Error(`screenshot failed for slide ${s.index + 1}`);
    s.png = png;
    process.stdout.write(".");
  }
  process.stdout.write("\n");
}

/** The filter graph that lays the music (input `musicInput`) under the narration (input 1):
 *  the narration is padded with the tail's silence and the mix keeps that length. */
function musicGraph(music, musicInput, total, tail) {
  const fadeOut = Math.max(0, total - MUSIC_FADE_OUT);
  return [
    `[${musicInput}:a]volume=${music.db}dB,afade=t=in:d=${MUSIC_FADE_IN},` +
      `afade=t=out:st=${fadeOut.toFixed(3)}:d=${MUSIC_FADE_OUT}[m]`,
    `[1:a]apad=pad_dur=${tail}[n]`,
    `[n][m]amix=inputs=2:duration=first:normalize=0[a]`,
  ];
}

/** A film deck: write timing.js, then render the page frame by frame. */
async function buildFilm({ args, folder, name, cache, manifest, html, slides, music }) {
  const mp3 = join(folder, `${name}.mp3`);
  const tail = music ? MUSIC_TAIL : 0;
  const total = manifest.duration + tail;
  measurePhrases(manifest, mp3);
  const errors = resolveCues(slides, manifest, 0);

  // Scenes cut on the beat nearest their cue; phrases inside a scene keep the narration's time.
  const analysis = music
    ? analyzeMusic(music.file, total)
    : { bpm: 0, beats: [], hits: [], envelope: [] };
  for (const s of slides.slice(1)) {
    const beat = analysis.beats.reduce(
      (best, b) => (Math.abs(b - s.start) < Math.abs(best - s.start) ? b : best),
      Infinity,
    );
    s.cueTime = s.start;
    if (Math.abs(beat - s.start) <= BEAT_SNAP) s.start = beat;
  }
  slides.forEach((s, i) => (s.end = slides[i + 1]?.start ?? total));
  const at = {};
  for (const [, phrase] of html.matchAll(/data-at="([^"]*)"/g)) {
    const hits = findCue(phrase, manifest);
    if (hits.length !== 1)
      errors.push(`data-at="${phrase}" matches ${hits.length} places in the script; it must match one`);
    else at[phrase] = Number(Math.max(0, hits[0] - 0.1).toFixed(3));
  }
  if (errors.length) throw new Error(errors.join("\n"));

  const timing = {
    duration: Number(total.toFixed(3)),
    scenes: slides.map((s) => ({ id: s.id, start: Number(s.start.toFixed(3)) })),
    at,
    music: { ...analysis, envelopeRate: ENVELOPE_RATE },
  };
  writeFileSync(
    join(folder, "timing.js"),
    `// Generated by tools/video-build/build-video.mjs. Do not edit.\nwindow.FILM_TIMING = ${JSON.stringify(timing)};\n`,
  );

  console.log(`${manifest.title} — film, ${slides.length} scenes, ${mmss(total)}, ${FILM_FPS} fps`);
  for (const s of slides) {
    const moved = s.cueTime === undefined || s.cueTime === s.start ? "" : `  (cue ${s.cueTime.toFixed(2)} s, cut on the beat)`;
    console.log(
      `  ${String(s.index + 1).padStart(2)}  ${s.start.toFixed(2).padStart(6)} s  ${(s.end - s.start).toFixed(1).padStart(5)} s  #${s.id}${moved}`,
    );
  }
  for (const [phrase, t] of Object.entries(at)) console.log(`  ${t.toFixed(2).padStart(10)} s  "${phrase}"`);
  if (music)
    console.log(
      `  music: ${basename(music.file)} at ${music.db} dB, ${analysis.bpm} BPM, ${analysis.beats.length} beats, ${analysis.hits.length} hits`,
    );
  if (args.includes("--check")) return;

  // WebGPU needs a secure context (file:// is one) and, in headless Chromium, the unsafe flag.
  // On macOS both APIs run on Metal; elsewhere they fall back to SwiftShader.
  const { chromium } = createRequire(join(repo, "e2e/"))("playwright");
  const browser = await chromium.launch({
    args: [
      "--enable-unsafe-webgpu",
      "--ignore-gpu-blocklist",
      ...(process.platform === "darwin" ? ["--use-angle=metal"] : ["--enable-unsafe-swiftshader"]),
    ],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto(`${pathToFileURL(join(folder, "slides.html")).href}?render=1`);
    await page.waitForFunction(() => window.FILM, null, { timeout: 10000 }).catch(() => {});
    if (pageErrors.length) throw new Error(pageErrors.join("; "));
    await page.evaluate(() => window.FILM.ready);
    const filmErrors = await page.evaluate(() => window.FILM.errors);
    if (filmErrors.length || pageErrors.length) throw new Error([...filmErrors, ...pageErrors].join("; "));
    const frame = async (t, options) => {
      const lost = await page.evaluate(async (x) => {
        await window.FILM.seek(x);
        return window.FILM.errors;
      }, t);
      if (lost.length) throw new Error(lost.join("; "));
      return page.screenshot(options);
    };

    if (args.includes("--frame")) {
      const i = args.indexOf("--frame");
      await frame(Number(args[i + 1]), { path: resolve(args[i + 2]) });
      return;
    }
    if (args.includes("--slides-only")) {
      // One still a scene, late enough that everything has landed.
      const out = join(cache, "slides");
      rmSync(out, { recursive: true, force: true });
      mkdirSync(out, { recursive: true });
      for (const s of slides)
        await frame(s.end - 0.6, { path: join(out, `${String(s.index + 1).padStart(3, "0")}.png`) });
      console.log(`rendered ${slides.length} PNGs to .cache/${name}/slides/`);
      return;
    }

    const events = captionEvents(manifest);
    const ass = join(cache, "captions.ass");
    writeAss(events, ass);
    writeSrt(events, join(cache, "captions.srt"));
    const burn = !args.includes("--no-captions");
    const mp4 = join(folder, `${name}.mp4`);
    const partial = join(cache, `${name}.partial.mp4`);
    const encoder = spawn(
      ffmpeg,
      [
        "-y", "-v", "error",
        "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FILM_FPS), "-i", "pipe:0",
        "-i", mp3,
        ...(music ? ["-stream_loop", "-1", "-i", music.file] : []),
        "-filter_complex",
        [`[0:v]${burn ? `ass=${basename(ass)},` : ""}format=yuv420p[out]`, ...(music ? musicGraph(music, 2, total, tail) : [])].join(";"),
        "-map", "[out]", "-map", music ? "[a]" : "1:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "24",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", "-t", total.toFixed(3),
        partial,
      ],
      { stdio: ["pipe", "inherit", "inherit"], cwd: cache },
    );
    const frames = Math.round(total * FILM_FPS);
    for (let i = 0; i < frames; i++) {
      const jpeg = await frame(i / FILM_FPS, { type: "jpeg", quality: 96 });
      if (!encoder.stdin.write(jpeg)) await once(encoder.stdin, "drain");
      if (i % 300 === 0) console.log(`  frame ${i}/${frames}`);
    }
    encoder.stdin.end();
    const [code] = await once(encoder, "close");
    if (code !== 0) throw new Error("ffmpeg failed");
    rmSync(mp4, { force: true });
    renameSync(partial, mp4);
    console.log(`wrote ${mp4}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const folder = resolve(args.find((a) => !a.startsWith("--")) ?? "");
  const name = basename(folder);
  const cache = join(repo, ".cache", name);
  const manifestFile = join(cache, "manifest.json");
  if (!existsSync(manifestFile))
    throw new Error(`${manifestFile} missing — run tools/video-audio first`);
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  const slidesFile = join(folder, "slides.html");
  const html = readFileSync(slidesFile, "utf8");
  const slides = parseSlides(html);
  const music = parseMusic(html, folder);
  if (/<body\b[^>]*\bdata-film\b/.test(html))
    return buildFilm({ args, folder, name, cache, manifest, html, slides, music });

  const errors = resolveCues(slides, manifest);
  if (errors.length) throw new Error(errors.join("\n"));
  const warnings = [];
  console.log(
    `${manifest.title} — ${slides.length} slides, ${mmss(manifest.duration)}`,
  );
  for (const s of slides) {
    const d = s.end - s.start;
    const flag =
      d < MIN_SLIDE ? "  << short" : d > MAX_SLIDE ? "  >> long" : "";
    if (flag)
      warnings.push(`slide ${s.index + 1} (#${s.id}) is ${d.toFixed(1)} s`);
    console.log(
      `  ${String(s.index + 1).padStart(2)}  ${mmss(s.start)}  ${d.toFixed(1).padStart(5)} s  #${s.id}${flag}`,
    );
  }
  const audit = auditSlides(slidesFile);
  for (const p of audit.problems) {
    warnings.push(
      `slide ${p.slide} (#${p.id}): ${p.issue} ${JSON.stringify(p.el ?? "")} ${JSON.stringify(p.bottom ?? p.over ?? p.height)}`,
    );
  }
  for (const s of slides.filter((x) => x.clip)) {
    s.clipFile = resolve(folder, s.clip);
    s.box = audit.clips.find((c) => c.slide === s.index + 1);
    if (!existsSync(s.clipFile))
      throw new Error(
        `slide ${s.index + 1} (#${s.id}): ${s.clip} not found — run tools/video-record`,
      );
    if (!s.box)
      throw new Error(`slide ${s.index + 1} (#${s.id}): no .clip box measured`);
    const length = Number(
      execFileSync(ffprobe, [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        s.clipFile,
      ]).toString(),
    );
    const room = s.end - s.start - s.clipDelay;
    s.rate = length > room ? length / room : 1;
    s.pad = Math.max(0, room - length / s.rate) + 1;
    const fit =
      s.rate > 1
        ? `x${s.rate.toFixed(2)} speed`
        : `holds its last frame ${(room - length).toFixed(1)} s`;
    console.log(
      `  clip #${s.id}: ${length.toFixed(1)} s in ${room.toFixed(1)} s, ${fit}`,
    );
    if (s.rate > MAX_CLIP_RATE)
      warnings.push(
        `slide ${s.index + 1} (#${s.id}) plays its clip at x${s.rate.toFixed(2)}; give it more narration`,
      );
  }
  if (music)
    console.log(
      `  music: ${basename(music.file)} at ${music.db} dB under the narration`,
    );
  if (warnings.length) console.warn(`warnings:\n  ${warnings.join("\n  ")}`);
  if (args.includes("--check")) return;

  renderSlides(slidesFile, slides, join(cache, "slides"));
  console.log(`rendered ${slides.length} PNGs to .cache/${name}/slides/`);
  if (args.includes("--slides-only")) return;

  const events = captionEvents(manifest);
  const ass = join(cache, "captions.ass");
  writeAss(events, ass);
  writeSrt(events, join(cache, "captions.srt"));

  // With music the last slide holds for a short tail after the narration, so the track can
  // play on and fade out instead of being cut with the last word.
  const tail = music ? MUSIC_TAIL : 0;
  const total = manifest.duration + tail;
  const list = join(cache, "slides.txt");
  const lines = slides.flatMap((s, i) => [
    `file '${s.png}'`,
    `duration ${(s.end - s.start + (i === slides.length - 1 ? tail : 0)).toFixed(3)}`,
  ]);
  lines.push(`file '${slides.at(-1).png}'`); // concat demuxer: repeat the last frame
  writeFileSync(list, lines.join("\n"));
  const mp3 = join(folder, `${name}.mp3`);
  const mp4 = join(folder, `${name}.mp4`);
  // Two passes, because the concat demuxer yields one frame per slide. Expanding a
  // 60-second slide to 30 fps inside the filter graph (fps=30,ass=...) queues ~1,800
  // uncompressed 1080p frames ahead of the caption renderer and gets ffmpeg killed for
  // memory. Pass 1 duplicates frames at the encoder (bounded), pass 2 burns captions
  // while streaming that constant-frame-rate video.
  const stills = join(cache, "slides.mp4");
  execFileSync(
    ffmpeg,
    [
      "-y",
      "-v",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      list,
      "-r",
      "30",
      "-fps_mode",
      "cfr",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-tune",
      "stillimage",
      "-crf",
      "12",
      "-pix_fmt",
      "yuv420p",
      stills,
    ],
    { stdio: "inherit" },
  );
  // Recordings are overlaid in this pass, each delayed to its slide's start, so the stills
  // stay a constant-frame-rate stream and only the clip slides carry motion.
  const clips = slides.filter((s) => s.clip);
  const graph = [];
  let last = "0:v";
  clips.forEach((s, i) => {
    const { x, y, w, h } = s.box;
    graph.push(
      `[${i + 2}:v]setpts=(PTS-STARTPTS)/${s.rate.toFixed(4)},scale=${w}:${h},` +
        `tpad=start_mode=clone:start_duration=${s.clipDelay}:stop_mode=clone:stop_duration=${s.pad.toFixed(3)},` +
        `setpts=PTS+${s.start.toFixed(3)}/TB[c${i}]`,
      `[${last}][c${i}]overlay=${x}:${y}:enable='between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})'[v${i}]`,
    );
    last = `v${i}`;
  });
  // Relative to cwd: an absolute Windows path (C:\…) breaks the filter's option parsing.
  const burn = !args.includes("--no-captions");
  graph.push(`[${last}]${burn ? `ass=${basename(ass)},` : ""}format=yuv420p[out]`);
  // The music is the last input, looped so it outlasts the narration. The narration is padded
  // with the tail's silence and the mix keeps that length (duration=first), so -shortest still
  // ends the file with the speech plus the tail.
  const musicInput = 2 + clips.length;
  if (music) graph.push(...musicGraph(music, musicInput, total, tail));
  execFileSync(
    ffmpeg,
    [
      "-y",
      "-v",
      "error",
      "-i",
      stills,
      "-i",
      mp3,
      ...clips.flatMap((s) => ["-i", s.clipFile]),
      ...(music ? ["-stream_loop", "-1", "-i", music.file] : []),
      "-filter_complex",
      graph.join(";"),
      "-map",
      "[out]",
      "-map",
      music ? "[a]" : "1:a",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      ...(clips.length
        ? ["-crf", "22"]
        : ["-tune", "stillimage", "-crf", "26"]),
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-movflags",
      "+faststart",
      "-shortest",
      mp4,
    ],
    { stdio: "inherit", cwd: cache },
  );
  console.log(`wrote ${mp4}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
