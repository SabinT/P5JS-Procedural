# CP437 Event Posters — series system

Perfectly-looping animated Instagram posters for Seattle creative-code events,
rendered on the CP437 toolkit (`lumic/cp437.js` + `lumic/asciiCanvas.js`).
This folder holds the static design system and text mockups; the animated
versions become sketches `056-poster-pcd.js` / `057-poster-artcode.js`.

## Files

- `glyphs.txt` — 7×6 master letterforms (parseable: `=NAME` line, then 6 rows,
  7 cols each). Glyph set: `A C D E O P R S T + @`. Sketches should parse this
  file (or a copied string constant) into masks — don't hand-transcribe.
- `A-pcd.txt`, `A-artcode.txt` — Concept A mockups, 45 lines × ≤80 cols.
- `B-pcd.txt`, `B-artcode.txt` — Concept B mockups.

## Grid + export

- 80×45 cells at 9×16 px = **720×720** native square.
- Blit at integer scale 2 → 1440×1440 for Instagram (IG downscales to 1080;
  downscale is gentle, fractional upscale is not). `pixelDensity(1)` +
  `noSmooth()`, integer positions only.
- Legibility budget: 1 cell of normal text = 9×16 px at 720 preview.

## Letterforms

- Height 6 rows, width 7 cols, letter gap 2, word gap 5. Stems 2 cells wide
  (~18 px) balance 1-row bars (16 px) against the 9:16 cell aspect.
- Face: solid `█` in the title color; corners rounded with `▄ ▀`.
- **Shadow: one copy of the glyph, same size, offset (+1,+1), drawn as `▒` in
  the dim shadow color; faces drawn on top.** Shadow shows inside counters and
  along right/bottom edges; band total = 7 rows (6 face + 1 tail).
- Title layouts (start col per glyph):
  - `PCD @ SEA`: P6 C15 D24 @36 S48 E57 A66 (cols 6–72)
  - `ART+CODE`: A5 R14 T23 +32 C41 O50 D59 E68 (cols 5–74)
- `@` is a **medallion badge** (rim `█`, fill `▒`, one normal-size `@`
  centered) — a full 7×6 pixel `@` is illegible, and the badge is the
  animation focal point (pulse).

## Color hierarchy (both concepts)

1. Poster bg: near-black, desaturated.
2. **Background animation (terrain/ripples/specks/viewport): dark gray close
   to the bg — texture, never competing with text.**
3. Title faces + main text lines: bright accent colors — they carry the poster.
4. Title shadow: one dim color.

Starting palettes (tune in the sketch config block):

| Poster | bg | bgAnim | title | shadow | text | accent |
|---|---|---|---|---|---|---|
| A-pcd "ember dusk" | `#14121a` | `#26222e` | `#ffb642` | `#4a3320` | `#e8e2d0` | `#ff6f9c` |
| A-artcode "electric lagoon" | `#0d1416` | `#1c282c` | `#59d6c9` | `#274048` | `#e8e2d0` | `#f20587` |
| B-pcd "amber phosphor" | `#131110` | `#241f18` | `#ffb642` | `#4a3320` | `#d8c8a8` | `#ffdf8a` |
| B-artcode "green phosphor" | `#0e1410` | `#1b291e` | `#7ee081` | `#25402a` | `#cfe8d2` | `#59d6c9` |

## Concept A — "SIGNAL WEATHER" (organic, frameless)

| Rows | Zone |
|---|---|
| 0–4 | sky specks `∙ · °` (sparse); row 2 eyebrow `░▒ SEATTLE CREATIVE CODE ▒░` |
| 6–12 | title band (faces 6–11, shadow tail 12) |
| 14 | subtitle |
| 17–31 | terrain (PCD: rolling dunes; ART+CODE: two-source radial ripples) |
| 32 | fog transition |
| 34/36/38 | info lines (solid-bg band; text never sits on ≥`▒` noise) |
| 40 | CTA line |
| 42 | link |
| 43–44 | ground fade `▒▓ → ▓█` |

## Concept B — "TERMINAL BROADSIDE" (console UI)

Double outer chassis, single interior partitions; junctions auto-merge via
asciiCanvas (`╟ ╢ ┬ ┴ ╡ ╞`).

| Rows | Zone |
|---|---|
| 0 | chassis top, punched tab `╡ SEATTLE CREATIVE CODE ╞` |
| 1 | status line (`SYS:SEACC.OK` … `PG 01/02`) |
| 2 | divider |
| 4–10 | title band (faces 4–9, tail 10) |
| 12 | inverse-video subtitle bar (full inner width) |
| 14 | divider, `┬` at col 46 |
| 15–30 | split: cols 1–45 caged plasma viewport / cols 47–78 `LABEL : VALUE` readout |
| 31 | divider `┴` |
| 34/36 | CTA prompt + widget (PCD: `> SUBMIT AN IDEA _`; ART+CODE: demo-slot loader bar) |
| 38 | divider |
| 40/42 | link chip `[ … ]` / fine print `░ … ░` |
| 44 | chassis bottom |

## Perfect-loop animation spec (for 056/057)

Master period **T = 480 frames** (8 s @ 60 fps). Every animated value is a pure
function of `t mod T` with **integer** temporal cycle counts and **integer**
spatial wave counts per region — seamless by construction. No accumulating
state; PRNG seeded per frame-independent cell, not per frame.

- **Terrain/viewport**: sine-field sums quantized through the ` ░▒▓█` ramp,
  colors clamped to the dim bgAnim band; ≤4 distinct fg colors (tinted-atlas
  cache budget — see `asciiCanvas.js` header).
- **Title shimmer**: per-face-cell ramp offset `sin(2π(u/Λ − k·t/T))`,
  floor-clamped at `▓` so letters never drop below legible density. Badge `@`
  pulses (rim `█⇄▓`, integer pulse count).
- **CTA case-wave**: CTA text cycles `lowercase → UPPERCASE` as a wave sweeping
  the line character-by-character, integer sweeps per loop (CP437 has full
  lowercase).
- **Link color sweep**: a bright highlight window sweeps across the link text,
  integer sweeps per loop.
- **Concept B extras**: cursor blink square-wave T/8; demo-slot loader fills
  linearly over exactly T (reset = loop tick); status spinner `|/─\` at T/k;
  viewport scanline drifts an integer number of panel-heights per loop.

## Sketch requirements (056/057)

Each sketch exposes a **config block at the top of the file**:

- `PALETTE`: named colors — bg, bgAnim, title, titleShadow, text, accent,
  linkSweep (from/to) — nothing below the block hardcodes a color.
- `LAYOUT`: every tweakable layout parameter — row bands, title start cols,
  margins, terrain region, wave counts, loop period T.

Repo wiring per convention: root `NNN-name.js` + `sketches/NNN-name.html`
(copy 055's shell) + tile in `index.html`. Save-PNG on `s`; consider a
frame-sequence export for the IG loop (T frames → video).
