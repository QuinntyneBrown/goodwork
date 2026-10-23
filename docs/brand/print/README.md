# Business cards (print)

Print-ready business cards for VistaPrint, rendered from `card.html` with the
design-system tokens (Evergreen Ink, Cornerstone Gold, Linen, Paper, Source
Serif 4 and Inter).

## Files

- `out/goodwork-business-card.pdf` - upload this. Page 1 front, page 2 back.
- `out/goodwork-business-card-front.pdf`, `out/goodwork-business-card-back.pdf` - one file per side.
- `out/*-300dpi.png` - 300 dpi raster fallback.
- `out/proof-*-guides.png` - trim line (red) and safe zone (blue) for checking.

## Spec

| Item | Value |
|---|---|
| Trim | 3.5 x 2 in |
| Bleed | 0.125 in each side (file is 3.75 x 2.25 in) |
| Safe zone | 0.125 in inside the trim |
| Colour | RGB; VistaPrint converts to CMYK |

Tell the uploader the file already includes bleed and choose the full-bleed option.

## Re-render

```sh
cd docs/brand/print
npm i --no-save playwright-core
node render.mjs
```

The script uses the Chromium at `/opt/pw-browsers/chromium`; set `CHROMIUM` to point at another binary.
