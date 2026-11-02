#!/usr/bin/env python3
"""
Render the two shader-box engraving plates without a browser.

This is the offline twin of `058-shaderbox-engrave.js` -- same grid, same
layout, same gradient, same non-overlap rule -- so the sketch stays the
place to *design* the plate and this stays the place to *produce* it
reproducibly (CI, a Makefile, or just a machine with no browser). The CONFIG
block below mirrors the sketch's; change one, change the other.

Two files come out, identical in size so they stack with no registration:

  058-shaderbox-1-dark.png   double border + plate text     -> engrave DARK
  058-shaderbox-2-light.png  wavy vertical gradient         -> engrave LIGHT

Non-overlap is structural: the text/border layer runs on a coarse grid
(TEXT_CELL fine cells per side) and every coarse cell it writes -- plus PAD
fine cells of clearance -- is marked occupied; the gradient skips occupied cells.
The renderer asserts the two layers are disjoint before writing anything.

Geometry: CP437 cells are 9x16, so 64x54 fine cells = 576x864 px = exactly 2:3.
SCALE keeps that ratio on whole pixels (4 -> 2304x3456 = ~195x293 mm at 300 dpi,
~97x146 mm at 600 dpi).

Output is 8-bit greyscale, pure black ink on white (--invert flips it). Only
the standard library is used -- the PNG codec below is a minimal 8-bit
reader/writer, not a general one -- so this runs anywhere python3 does.

Needs assets/cp437-9x16.png as real bytes: the repo keeps PNGs in Git LFS, so
run `git lfs pull` first if it is still a 129-byte pointer file.

Usage:
    python3 assets/tools/make-shaderbox-plates.py [--preview] [--scale 4]
            [--invert] [--ramp 0] [--gamma 1.0] [--noise-scale 1.5]
            [--noise-amp 0.12] [--out DIR]
"""

import argparse
import math
import struct
import sys
import zlib
from pathlib import Path

# ═══════════════════════ CONFIG (mirrors 058-shaderbox-engrave.js) ═══════════

CHAR_W, CHAR_H = 9, 16

COLS, ROWS = 64, 54  # fine grid -- shader layer
TEXT_CELL = 2        # ink-layer cell size in fine cells -> 32x27 coarse grid
PAD = 1              # fine cells of clearance around the text
# ...and inside the border, per axis. 0 rows top/bottom lets the field run one
# row closer there: cells are 9x16, so an equal count of cells reads as a much
# bigger gap vertically than horizontally.
BORDER_PAD = (1, 0)  # (x, y)
TEXT, BORDER = 1, 2  # occupancy kinds
DESPECKLE = True     # drop shader glyphs with no neighbour (see despeckle)

BORDER = "double"    # 'double' | 'single'
LINES = [            # rows are COARSE cells; text is centered
    (9,  "SHADERBOX v0.1, 2026"),
    (13, "Sabin Timalsena"),
    (15, "www.sabin.art"),
    (17, "IG: @artbysabin"),
]
DIVIDER = (11, 6)    # (row, inset from each side); None to drop the rule

RAMPS = [" .-o#", " ·∙•■", " ·∙•", " .:-=+*", " ░▒▓"]  # dark -> bright
SHADER = dict(
    ramp_index=0,
    gamma=1.0,        # fade curve: >1 opens the middle up, <1 pushes ink inward
    noise_scale=1.5,  # wave frequency -- roughly how many crests span the width
    noise_amp=0.12,   # wave height as a fraction of the plate; 0 = flat bands
)

# Wave field: four sines at incommensurate frequencies, weights summing to 1,
# so the result stays inside [-1,1] and never repeats across the plate. Chosen
# over a simplex/permutation noise because this has to match the sketch's field
# exactly, and a fixed sine sum ports without a shared permutation table.
WAVES = [  # (crests per width, crests per height, phase, weight)
    (1.00, 0.37, 0.00, 0.55),
    (1.93, -0.61, 1.37, 0.28),
    (3.71, 0.89, 2.71, 0.12),
    (0.53, 1.43, 4.13, 0.05),
]

SCALE = 4
NAMES = {
    "ink": "058-shaderbox-1-dark.png",
    "bg": "058-shaderbox-2-light.png",
    "preview": "058-shaderbox-0-preview.png",
}

ROOT = Path(__file__).resolve().parents[2]
ATLAS = ROOT / "assets" / "cp437-9x16.png"

COARSE_COLS, COARSE_ROWS = COLS // TEXT_CELL, ROWS // TEXT_CELL

# CP437 code -> unicode, copied verbatim from lumic/cp437.js.
CP437_CHARS = "".join([
    " ☺☻♥♦♣♠•◘○◙♂♀♪♫☼",
    "►◄↕‼¶§▬↨↑↓→←∟↔▲▼",
    " !\"#$%&'()*+,-./",
    "0123456789:;<=>?",
    "@ABCDEFGHIJKLMNO",
    "PQRSTUVWXYZ[\\]^_",
    "`abcdefghijklmno",
    "pqrstuvwxyz{|}~⌂",
    "ÇüéâäàåçêëèïîìÄÅ",
    "ÉæÆôöòûùÿÖÜ¢£¥₧ƒ",
    "áíóúñÑªº¿⌐¬½¼¡«»",
    "░▒▓│┤╡╢╖╕╣║╗╝╜╛┐",
    "└┴┬├─┼╞╟╚╔╩╦╠═╬╧",
    "╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀",
    "αßΓπΣσµτΦΘΩδ∞φε∩",
    "≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ",
])
# Last-wins, so the duplicate blank (0x00 and 0x20) resolves to ASCII space.
CODE_OF = {ch: code for code, ch in enumerate(CP437_CHARS)}

BOX = {  # (up, down, left, right) arms -> CP437 code, the subset used here
    "double": dict(h="═", v="║", tl="╔", tr="╗", bl="╚", br="╝"),
    "single": dict(h="─", v="│", tl="┌", tr="┐", bl="└", br="┘"),
}

# ═══════════════════════ minimal 8-bit PNG codec ═════════════════════════════


def read_png_rgba(path):
    """Decode an 8-bit non-interlaced RGBA PNG -> (w, h, bytearray)."""
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(
            f"{path} is not a PNG (Git LFS pointer? run `git lfs pull`)"
        )
    idat = bytearray()
    w = h = None
    i = 8
    while i < len(data):
        (length,) = struct.unpack(">I", data[i : i + 4])
        typ = data[i + 4 : i + 8]
        body = data[i + 8 : i + 8 + length]
        if typ == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", body)
            if (depth, color, interlace) != (8, 6, 0):
                raise SystemExit(f"{path}: want 8-bit RGBA, got depth {depth} color {color}")
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break
        i += 12 + length

    raw = zlib.decompress(bytes(idat))
    stride = w * 4
    out = bytearray(w * h * 4)
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        ft = raw[pos]
        pos += 1
        line = bytearray(raw[pos : pos + stride])
        pos += stride
        if ft == 1:
            for x in range(4, stride):
                line[x] = (line[x] + line[x - 4]) & 0xFF
        elif ft == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 0xFF
        elif ft == 3:
            for x in range(stride):
                left = line[x - 4] if x >= 4 else 0
                line[x] = (line[x] + ((left + prev[x]) >> 1)) & 0xFF
        elif ft == 4:
            for x in range(stride):
                a = line[x - 4] if x >= 4 else 0
                b = prev[x]
                c = prev[x - 4] if x >= 4 else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 0xFF
        elif ft != 0:
            raise SystemExit(f"{path}: unsupported filter {ft}")
        out[y * stride : (y + 1) * stride] = line
        prev = line
    return w, h, out


def write_gray_png(path, w, h, pixels):
    """Encode an 8-bit greyscale PNG from a w*h bytearray."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter: none
        raw += pixels[y * w : (y + 1) * w]

    def chunk(typ, body):
        return (
            struct.pack(">I", len(body))
            + typ
            + body
            + struct.pack(">I", zlib.crc32(typ + body) & 0xFFFFFFFF)
        )

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


# ═══════════════════════ layers ══════════════════════════════════════════════


def build_ink_layer():
    """Coarse grid of CP437 codes (or None) + the coarse occupancy mask."""
    cells = [[None] * COARSE_COLS for _ in range(COARSE_ROWS)]
    mask = [[0] * COARSE_COLS for _ in range(COARSE_ROWS)]

    def put(x, y, ch, kind):
        if 0 <= x < COARSE_COLS and 0 <= y < COARSE_ROWS:
            cells[y][x] = CODE_OF[ch]
            mask[y][x] = kind

    b = BOX[BORDER]
    for x in range(COARSE_COLS):
        put(x, 0, b["h"], BORDER)
        put(x, COARSE_ROWS - 1, b["h"], BORDER)
    for y in range(COARSE_ROWS):
        put(0, y, b["v"], BORDER)
        put(COARSE_COLS - 1, y, b["v"], BORDER)
    put(0, 0, b["tl"], BORDER)
    put(COARSE_COLS - 1, 0, b["tr"], BORDER)
    put(0, COARSE_ROWS - 1, b["bl"], BORDER)
    put(COARSE_COLS - 1, COARSE_ROWS - 1, b["br"], BORDER)

    if DIVIDER:
        row, inset = DIVIDER
        for x in range(inset, COARSE_COLS - inset):
            put(x, row, BOX["single"]["h"], TEXT)

    for row, s in LINES:
        x0 = (COARSE_COLS - len(s)) // 2
        for i, ch in enumerate(s):
            put(x0 + i, row, ch, TEXT)
            # Spaces are claimed too, so the shader cannot creep into word gaps.
            mask[row][x0 + i] = TEXT
    return cells, mask


def spread_occupancy(mask):
    """Coarse mask -> fine occupancy, dilated by the clearance for its kind."""
    occ = [[0] * COLS for _ in range(ROWS)]
    for cy in range(COARSE_ROWS):
        for cx in range(COARSE_COLS):
            kind = mask[cy][cx]
            if not kind:
                continue
            pad_x, pad_y = BORDER_PAD if kind == BORDER else (PAD, PAD)
            for fy in range(cy * TEXT_CELL - pad_y, cy * TEXT_CELL + TEXT_CELL + pad_y):
                if not 0 <= fy < ROWS:
                    continue
                for fx in range(cx * TEXT_CELL - pad_x, cx * TEXT_CELL + TEXT_CELL + pad_x):
                    if 0 <= fx < COLS:
                        occ[fy][fx] = 1
    return occ


def wobble(u, v):
    """Signed wave field in [-1,1] at normalized plate position (u, v)."""
    return sum(
        w * math.sin(2 * math.pi * SHADER["noise_scale"] * (fx * u + fy * v) + ph)
        for fx, fy, ph, w in WAVES
    )


def shade_at(cx, cy):
    """Density of the cell in [0,1].

    1 at the top and bottom edges, 0 across the middle, so the plate reads
    dark -> clear -> dark down the page. The wave field displaces the sample
    point vertically, which bends the bands into their wobble; gamma then
    bends the fade between the ends.
    """
    u = (cx + 0.5) / COLS  # 0 at the left column, 1 at the right
    v = (cy + 0.5) / ROWS  # 0 at the top row, 1 at the bottom
    warped = v + SHADER["noise_amp"] * wobble(u, v)
    return min(1.0, abs(2 * warped - 1)) ** SHADER["gamma"]


def build_shader_layer(occ):
    """Fine grid of CP437 codes (or None), skipping every occupied cell."""
    ramp = RAMPS[SHADER["ramp_index"]]
    cells = [[None] * COLS for _ in range(ROWS)]
    for cy in range(ROWS):
        for cx in range(COLS):
            if occ[cy][cx]:
                continue
            ch = ramp[min(len(ramp) - 1, int(shade_at(cx, cy) * len(ramp)))]
            if ch != " ":
                cells[cy][cx] = CODE_OF[ch]
    return despeckle(cells) if DESPECKLE else cells


def despeckle(cells):
    """Clear shader glyphs with no neighbour in the 8 cells around them.

    A lone dot floating in the clearance around the text reads as a defect on
    the finished box (and at light settings an isolated dot burns unevenly),
    while the same dot inside the field is invisible.
    """
    def has_neighbour(cx, cy):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == dy == 0:
                    continue
                x, y = cx + dx, cy + dy
                if 0 <= x < COLS and 0 <= y < ROWS and cells[y][x] is not None:
                    return True
        return False

    doomed = [
        (x, y)
        for y in range(ROWS)
        for x in range(COLS)
        if cells[y][x] is not None and not has_neighbour(x, y)
    ]
    for x, y in doomed:
        cells[y][x] = None
    return cells


# ═══════════════════════ raster ══════════════════════════════════════════════


def render(cells, cols, rows, cell_scale, atlas, invert):
    """Composite a cell grid to a native-resolution greyscale bytearray."""
    aw, _, apx = atlas
    step = CHAR_W * cell_scale, CHAR_H * cell_scale
    w, h = cols * step[0], rows * step[1]
    paper, ink = (0, 255) if invert else (255, 0)
    out = bytearray([paper]) * (w * h)

    for cy in range(rows):
        for cx in range(cols):
            code = cells[cy][cx]
            if code is None or code == 0x20:
                continue
            sx = (code % 32) * CHAR_W
            sy = (code // 32) * CHAR_H
            ox = cx * step[0]
            oy = cy * step[1]
            for gy in range(CHAR_H):
                arow = (sy + gy) * aw + sx
                for gx in range(CHAR_W):
                    if apx[(arow + gx) * 4 + 3] < 128:  # atlas alpha == ink mask
                        continue
                    for ry in range(cell_scale):
                        base = (oy + gy * cell_scale + ry) * w + ox + gx * cell_scale
                        out[base : base + cell_scale] = bytes([ink]) * cell_scale
    return w, h, out


def upscale(w, h, pixels, scale):
    if scale == 1:
        return w, h, pixels
    out = bytearray(w * scale * h * scale)
    for y in range(h):
        row = pixels[y * w : (y + 1) * w]
        wide = bytes(px for px in row for _ in range(scale))
        for r in range(scale):
            base = (y * scale + r) * w * scale
            out[base : base + w * scale] = wide
    return w * scale, h * scale, out


# ═══════════════════════ main ════════════════════════════════════════════════


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--scale", type=int, default=SCALE, help="pixel multiplier (default 4)")
    ap.add_argument("--invert", action="store_true", help="white ink on black")
    ap.add_argument("--ramp", type=int, default=SHADER["ramp_index"], choices=range(len(RAMPS)))
    ap.add_argument("--gamma", type=float, default=SHADER["gamma"],
                    help="fade curve; >1 opens the middle up, <1 pushes ink inward")
    ap.add_argument("--noise-scale", type=float, default=SHADER["noise_scale"],
                    help="wave frequency; roughly how many crests span the width")
    ap.add_argument("--noise-amp", type=float, default=SHADER["noise_amp"],
                    help="wave height as a fraction of the plate; 0 = flat bands")
    ap.add_argument("--out", type=Path, default=ROOT, help="output directory")
    ap.add_argument(
        "--preview",
        action="store_true",
        help="also write a proof sheet with both layers (ink black, shader grey)",
    )
    args = ap.parse_args()
    SHADER.update(
        ramp_index=args.ramp,
        gamma=args.gamma,
        noise_scale=args.noise_scale,
        noise_amp=args.noise_amp,
    )

    if COLS * CHAR_W * 3 != ROWS * CHAR_H * 2:
        sys.exit(f"grid {COLS}x{ROWS} is not 2:3")

    atlas = read_png_rgba(ATLAS)
    ink_cells, mask = build_ink_layer()
    occ = spread_occupancy(mask)
    bg_cells = build_shader_layer(occ)

    # The whole point of the two-layer split: no fine cell may carry both.
    clashes = [
        (x, y)
        for y in range(ROWS)
        for x in range(COLS)
        if occ[y][x] and bg_cells[y][x] is not None
    ]
    if clashes:
        sys.exit(f"{len(clashes)} cells appear in both layers, first at {clashes[0]}")

    inked = sum(sum(r) for r in occ)
    shaded = sum(1 for r in bg_cells for c in r if c is not None)
    print(
        f"{COLS}x{ROWS} fine cells - ink+clearance {inked}, shader {shaded}, "
        f"free {COLS * ROWS - inked - shaded}, overlaps 0"
    )

    args.out.mkdir(parents=True, exist_ok=True)
    natives = {}
    for key, cells, cols, rows, cs in (
        ("ink", ink_cells, COARSE_COLS, COARSE_ROWS, TEXT_CELL),
        ("bg", bg_cells, COLS, ROWS, 1),
    ):
        w, h, px = render(cells, cols, rows, cs, atlas, args.invert)
        natives[key] = (w, h, px)
        w, h, px = upscale(w, h, px, args.scale)
        dst = args.out / NAMES[key]
        write_gray_png(dst, w, h, px)
        print(f"{dst.relative_to(ROOT) if ROOT in dst.parents else dst}  {w}x{h}")

    if args.preview:
        # Proof sheet, not an engraving file: the two layers on one page, the
        # shader knocked back to grey so the split is easy to eyeball.
        w, h, ink_px = natives["ink"]
        bg_px = natives["bg"][2]
        paper = 0 if args.invert else 255
        ink_tone = 255 if args.invert else 0
        shader_tone = 145 if args.invert else 110
        merged = bytearray(
            ink_tone if i != paper else (shader_tone if b != paper else paper)
            for i, b in zip(ink_px, bg_px)
        )
        w, h, merged = upscale(w, h, merged, args.scale)
        dst = args.out / NAMES["preview"]
        write_gray_png(dst, w, h, merged)
        print(f"{dst.relative_to(ROOT) if ROOT in dst.parents else dst}  {w}x{h}  (proof only)")


if __name__ == "__main__":
    main()
