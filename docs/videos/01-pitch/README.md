# 01 · Goodwork pitch

> **Runtime:** ~0:26 · **Audience:** prospective clients visiting the brochure page · **Prerequisites:** none

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

| File                                                        | What to show                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `docs/detailed-designs/logo.svg`                            | The Cornerstone mark on the title and closing slides.                           |
| `docs/mocks/pages/home/default.html`                        | Source of every line of copy: eyebrow, headline, "Why it costs less", services. |
| `docs/videos/assets/music/inspiring-acoustic-corporate.mp3` | Background music under the narration (Universfield, Pixabay Content License).   |

## Run sheet

| Time        | Segment           | Content                                                                                    |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------ |
| 00:00-00:04 | Title             | Mark, eyebrow, headline.                                                                   |
| 00:04-00:09 | Who we serve      | The three audiences.                                                                       |
| 00:09-00:16 | Why it costs less | Three bullets.                                                                             |
| 00:16-00:26 | Closing           | Mark, "Agency quality, without the agency price.", goodwork.rocks; music plays on for 3 s. |

## Demo commands

```sh
export PYTHON=python3
python3 -m pip install edge-tts
node tools/video-audio/generate-audio.mjs docs/videos/01-pitch --dry-run
node tools/video-audio/generate-audio.mjs docs/videos/01-pitch
node tools/video-build/build-video.mjs docs/videos/01-pitch --check
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

## References

- [edge-tts](https://github.com/rany2/edge-tts)
