# Videos

Narrated videos generated from text files with `tools/video-audio` and `tools/video-build`.
See the `creating-narrated-videos` skill for the workflow. `.cache/` is never committed.
Background music lives in [assets/music](assets/music/README.md) with its source and license.

| #   | Video                                | Runtime | Used by                                                            |
| --- | ------------------------------------ | ------- | ------------------------------------------------------------------ |
| 01  | [Goodwork pitch](01-pitch/README.md) | ~0:26   | Brochure page hero (`frontend/projects/goodwork/public/pitch.mp4`) |

## Film decks

A deck with `<body data-film>` is a film, not a set of stills: it loads `assets/film.css` and
`assets/film.js` in place of `slides.js`, and the builder renders it frame by frame at 60 fps.
Every pixel is a function of film time, so the same page plays live (open `slides.html` and press
Play; `?t=7.5` opens paused on a time) and renders through `FILM.seek(seconds)`.

| Layer  | What it draws                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| WebGPU | The background: warped noise in the brand's grounds, a gold light that follows the music's loudness, drifting stones that swell on the beat. |
| WebGL  | The transitions over each cut: `data-transition="bricks"`, `"sweep"` or `"mark"` on the incoming `<section>`.                                |
| DOM    | The slides. `data-in="words"`, `"rise"`, `"pop"` or `"mark"` on an element is its entrance.                                                  |

An entrance starts on a narrated phrase (`data-at="phrase copied from script.md"`), on the scene's
nth beat (`data-beat="2"`), or otherwise in document order from the scene's start. `class="dark"`
puts a slide on Evergreen Ink.

The builder writes `timing.js` beside the deck (generated; `--check` rewrites it): each scene's
start, which is its `data-cue` moved onto the nearest beat when one is within 0.3 s; the time of
every `data-at` phrase, measured from the pauses in the narration; and the music's tempo, beats,
hits and loudness from `tools/video-build/analyze-music.mjs`. `--frame <seconds> <png>` renders
one frame, and `--slides-only` one settled still a scene. Film decks need Playwright's Chromium
from `e2e/node_modules` (run `npm ci` in `e2e/` once).
