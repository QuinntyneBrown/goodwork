# 01 · Goodwork pitch

> **Runtime:** ~0:26 · **Format:** 1920×1080, 60 fps · **Audience:** prospective clients visiting the brochure page · **Prerequisites:** none

**Video:** [01-pitch.mp4](01-pitch.mp4) · [Slides](slides.html) · **Audio:** [01-pitch.mp3](01-pitch.mp3) · [Transcript](script.md) · [Captions](01-pitch.vtt)

## Why this video exists

The brochure page plays this clip in the hero so a visitor hears the pitch in twenty-odd seconds without reading the page: who Goodwork serves, why it costs less, and how to start a project.

## Learning objectives

By the end, the viewer can:

- Say who Goodwork builds for.
- Name the three reasons the price is lower than an agency's.
- Find where to start a project.

## Key questions

| Question               | What a strong answer includes                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Who is Goodwork for?   | Non-profits, churches and ministries, and companies whose work makes life better for someone.        |
| Why does it cost less? | A small senior team, an AI-assisted spec-driven process, a fixed-price quote before any work starts. |
| How do I start?        | goodwork.rocks, or hello@goodwork.rocks.                                                             |

## Code / assets on screen

| File                                                        | What to show                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `docs/detailed-designs/logo.svg`                            | The Cornerstone mark on the title and closing slides.                                                  |
| `docs/mocks/pages/home/default.html`                        | Source of every line of copy: eyebrow, headline, "Why it costs less", services.                        |
| `docs/videos/assets/music/inspiring-acoustic-corporate.mp3` | Background music under the narration (Universfield, Pixabay Content License); its beats time the cuts. |

## Run sheet

The deck is a film (`<body data-film>`, see [the videos README](../README.md)): every frame is
drawn from film time. The music runs at 120 BPM and every cut sits on the beat nearest its cue.

| Time        | Segment           | Content                                                                                                                          | Into it                           |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 00:00-00:05 | Title             | The mark's stones land, then the eyebrow and the headline rise on the next two beats.                                            | Opens on the background           |
| 00:05-00:09 | Who we serve      | On ink. The three audiences rise on three consecutive beats.                                                                     | Brick wipe (WebGL), cut at 5.54 s |
| 00:09-00:17 | Why it costs less | Each bullet rises as the narration names it (9.3 s, 10.9 s, 12.8 s); their gold stones swell on the beat.                        | Gold sweep (WebGL), cut at 9.53 s |
| 00:17-00:26 | Closing           | On ink. The mark, "Agency quality, without the agency price.", then goodwork.rocks on "Start a project"; music plays on for 3 s. | Mark wipe (WebGL), cut at 17.02 s |

Behind every slide the WebGPU background drifts: its gold light reaches further as the music gets
louder, and it and the drifting stones swell on each beat. The mark's gold stone does the same.

## Demo commands

```sh
export PYTHON=python3
python3 -m pip install edge-tts
node tools/video-audio/generate-audio.mjs docs/videos/01-pitch --dry-run
node tools/video-audio/generate-audio.mjs docs/videos/01-pitch
node tools/video-build/build-video.mjs docs/videos/01-pitch --check
node tools/video-build/build-video.mjs docs/videos/01-pitch --frame 5.6 .cache/01-pitch/frame.png
node tools/video-build/build-video.mjs docs/videos/01-pitch --slides-only
node tools/video-build/build-video.mjs docs/videos/01-pitch --no-captions
ffmpeg -y -i .cache/01-pitch/captions.srt docs/videos/01-pitch/01-pitch.vtt
ffmpeg -y -i .cache/01-pitch/slides/001.png -vf scale=960:540 docs/videos/01-pitch/01-pitch-poster.jpg
cp docs/videos/01-pitch/01-pitch.mp4 frontend/projects/goodwork/public/pitch.mp4
cp docs/videos/01-pitch/01-pitch.vtt frontend/projects/goodwork/public/pitch.vtt
cp docs/videos/01-pitch/01-pitch-poster.jpg frontend/projects/goodwork/public/pitch-poster.jpg
```

## Pitfalls

- Every cue must be copied verbatim from `script.md`; `--check` fails otherwise.
- Keep the script near fifty words; edge-tts adds about a second of silence at each section break.
- The page copy is the source of truth. Change the mock first, then the script.
- `timing.js` is generated; `--check` rewrites it. Rebuild after changing the script, a cue or the music.
- The render needs WebGPU. It was built on macOS, where headless Chromium runs it on Metal; the
  builder stops with a message if the background cannot draw.
- The MP4 is about 5.8 MB (the still-slide version was 0.6 MB). The page loads only its metadata until someone presses play.

## References

- [edge-tts](https://github.com/rany2/edge-tts)
