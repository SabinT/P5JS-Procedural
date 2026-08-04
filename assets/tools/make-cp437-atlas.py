#!/usr/bin/env python3
"""
Rebuild `assets/Codepage-437.png` into a tightly-packed, pixel-perfect texture sheet.

Source analysis (assets/Codepage-437.png, 304x144, 2 colours: 0 and 168 grey):

  - 256 glyphs laid out row-major, 32 columns x 8 rows.
  - Character cell is 9x16 (VGA text-mode resolution), with NO inter-cell gutter.
  - The whole sheet is inset by an 8px margin on all four sides:
        8 + 32*9 + 8 = 304   and   8 + 8*16 + 8 = 144
  - 100% of the source ink falls inside that grid, so the geometry is exact.
  - Glyphs 0xB0-0xB2 and 0xC0-0xDF use the 9th column, and for 0xC0-0xDF that
    column is an exact copy of column 7 -- the VGA 9-dot line-graphics
    replication rule. So the cell really is 9 wide; cropping to 8 would break
    box-drawing connectivity.

The fix is therefore a pure crop of the 8px margin. No resampling, no scaling,
nothing that could soften a pixel. Output keeps the same 32x8 layout and the
same 9:16 character aspect ratio.

Output: assets/cp437-9x16.png -- 288x128 RGBA, white glyphs on a transparent
background. Alpha is the source ink mask verbatim, so it composites over any
colour and responds to p5's tint(). Rendering it with tint(168) on black
reproduces the original exactly.
"""

from pathlib import Path

import numpy as np
from PIL import Image

CHAR_W, CHAR_H = 9, 16
COLS, ROWS = 32, 8
MARGIN = 8

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "Codepage-437.png"
DST = ROOT / "assets" / "cp437-9x16.png"


def main() -> None:
    src = np.array(Image.open(SRC).convert("L"))

    expected = (MARGIN * 2 + ROWS * CHAR_H, MARGIN * 2 + COLS * CHAR_W)
    assert src.shape == expected, f"unexpected source size {src.shape}, want {expected}"

    ink = src > 0
    cropped = ink[MARGIN : MARGIN + ROWS * CHAR_H, MARGIN : MARGIN + COLS * CHAR_W]

    # Nothing may be lost to the crop -- that is what makes this pixel-perfect.
    assert cropped.sum() == ink.sum(), "crop discarded ink; grid geometry is wrong"

    h, w = cropped.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., :3] = 255                      # white glyphs
    out[..., 3] = cropped.astype(np.uint8) * 255  # alpha == source ink mask

    Image.fromarray(out, "RGBA").save(DST, optimize=True)
    print(f"{SRC.name} {src.shape[1]}x{src.shape[0]} -> {DST.name} {w}x{h}")
    print(f"cell {CHAR_W}x{CHAR_H}, {COLS}x{ROWS} grid, {cropped.sum()} ink pixels preserved")


if __name__ == "__main__":
    main()
