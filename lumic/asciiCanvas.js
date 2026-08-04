/**
 * ASCII canvas — a p5-like immediate-mode drawing API over a grid of CP437
 * character cells, rendered through a Cp437Sheet atlas in one blit() call.
 *
 * Each cell holds one CP437 code, a foreground color, a background color
 * (DOS text-mode style), and line metadata. Draw with text()/pixel()/
 * hline()/vline()/box(), then blit() the whole buffer to the canvas or a
 * p5.Graphics. The bg pen defaults to preserving whatever background a cell
 * already has; set a color to stamp it, or a zero-alpha color to punch a
 * see-through hole to the canvas.
 *
 * Line drawing auto-merges: crossing and abutting hline/vline/box calls
 * combine into the proper junction glyphs (┼ ╬ ╪ ╫, tees, mixed corners).
 * text()/pixel()/set()/fillRect() overwrite cells outright, line metadata
 * included, so text punches clean holes through borders.
 *
 * Typical use:
 *   // preload()
 *   sheet = loadCp437Sheet();
 *   // setup()
 *   buf = createBuffer(80, 25, { sheet });
 *   // draw()
 *   buf.clear("#111");
 *   buf.color("#ffb642").bgColor(null);
 *   buf.box(0, 0, 79, 24, "double");
 *   buf.text("hello", 2, 1);
 *   buf.blit(0, 0, 2);
 *
 * For crisp output the sketch should call pixelDensity(1) and noSmooth() in
 * setup() and blit at integer positions with an integer scale (same rule as
 * cp437.js). Foreground coloring uses a per-color tinted copy of the atlas,
 * built once and cached — keep the number of *distinct* fg colors bounded
 * (quantize animated colors to a palette) or memory grows one 288x128 image
 * per color.
 */

import { CHAR_W, CHAR_H, charToCode, codeToChar, fallbackCode, spriteRect } from "./cp437.js";

/** Shade characters used by pixel(), darkest to brightest: " ░▒▓█". */
export const SHADE_RAMP = [0x20, 0xb0, 0xb1, 0xb2, 0xdb];

// ---------------------------------------------------------------------------
// Colors — packed RGBA uint32 (r<<24 | g<<16 | b<<8 | a). Alpha 0 means
// transparent; bg 0 draws no rect at blit time.
// ---------------------------------------------------------------------------

const TRANSPARENT = 0;
const WHITE = 0xffffffff;
/** bg pen sentinel: writes leave the cell's existing background untouched. */
const PRESERVE = -1;

const strToPacked = new Map();
const packedToCss = new Map();

function packLevels(levels) {
  return ((levels[0] << 24) | (levels[1] << 16) | (levels[2] << 8) | levels[3]) >>> 0;
}

/** Anything p5's color() accepts -> packed uint32. null/undefined -> transparent. */
function packColor(args) {
  if (args.length === 0 || args[0] === null || args[0] === undefined) {
    return TRANSPARENT;
  }
  if (args.length === 1 && typeof args[0] === "string") {
    let packed = strToPacked.get(args[0]);
    if (packed === undefined) {
      packed = packLevels(color(args[0]).levels);
      strToPacked.set(args[0], packed);
    }
    return packed;
  }
  return packLevels(color(...args).levels);
}

function unpackToCss(packed) {
  let css = packedToCss.get(packed);
  if (css === undefined) {
    const r = (packed >>> 24) & 0xff;
    const g = (packed >>> 16) & 0xff;
    const b = (packed >>> 8) & 0xff;
    const a = packed & 0xff;
    css = `rgba(${r},${g},${b},${a / 255})`;
    packedToCss.set(packed, css);
  }
  return css;
}

// ---------------------------------------------------------------------------
// Junction table — line cells carry four directional arms (up/down/left/
// right), each 0=none, 1=single, 2=double, packed 2 bits apiece into one
// byte: U | D<<2 | L<<4 | R<<6. CP437 only has junctions whose horizontal
// arms share one weight and vertical arms share another, so merges normalize
// per axis; every reachable key is in this table.
// ---------------------------------------------------------------------------

// prettier-ignore
const ARM_ENTRIES = [
  // [up, down, left, right, code] — single-arm stubs render as the full run
  // char since CP437 has no half-line glyphs.
  [0,0,1,1,0xc4], [0,0,1,0,0xc4], [0,0,0,1,0xc4],                  // ─
  [0,0,2,2,0xcd], [0,0,2,0,0xcd], [0,0,0,2,0xcd],                  // ═
  [1,1,0,0,0xb3], [1,0,0,0,0xb3], [0,1,0,0,0xb3],                  // │
  [2,2,0,0,0xba], [2,0,0,0,0xba], [0,2,0,0,0xba],                  // ║
  [0,1,0,1,0xda], [0,2,0,2,0xc9], [0,1,0,2,0xd5], [0,2,0,1,0xd6],  // ┌ ╔ ╒ ╓
  [0,1,1,0,0xbf], [0,2,2,0,0xbb], [0,1,2,0,0xb8], [0,2,1,0,0xb7],  // ┐ ╗ ╕ ╖
  [1,0,0,1,0xc0], [2,0,0,2,0xc8], [1,0,0,2,0xd4], [2,0,0,1,0xd3],  // └ ╚ ╘ ╙
  [1,0,1,0,0xd9], [2,0,2,0,0xbc], [1,0,2,0,0xbe], [2,0,1,0,0xbd],  // ┘ ╝ ╛ ╜
  [1,1,0,1,0xc3], [2,2,0,2,0xcc], [1,1,0,2,0xc6], [2,2,0,1,0xc7],  // ├ ╠ ╞ ╟
  [1,1,1,0,0xb4], [2,2,2,0,0xb9], [1,1,2,0,0xb5], [2,2,1,0,0xb6],  // ┤ ╣ ╡ ╢
  [0,1,1,1,0xc2], [0,2,2,2,0xcb], [0,1,2,2,0xd1], [0,2,1,1,0xd2],  // ┬ ╦ ╤ ╥
  [1,0,1,1,0xc1], [2,0,2,2,0xca], [1,0,2,2,0xcf], [2,0,1,1,0xd0],  // ┴ ╩ ╧ ╨
  [1,1,1,1,0xc5], [2,2,2,2,0xce], [1,1,2,2,0xd8], [2,2,1,1,0xd7],  // ┼ ╬ ╪ ╫
];

const ARMS_TO_CODE = new Uint8Array(256);
for (const [u, d, l, r, code] of ARM_ENTRIES) {
  ARMS_TO_CODE[u | (d << 2) | (l << 4) | (r << 6)] = code;
}

function weightOf(weight) {
  return weight === "double" || weight === 2 ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Tinted-atlas cache — p5 v1 applies tint() per image() call (slow), so fg
// coloring instead uses a once-per-color recolored copy of the whole atlas.
// The atlas is white glyphs with alpha as ink, so overwriting RGB and
// scaling alpha is pixel-identical to tint().
// ---------------------------------------------------------------------------

const tintCaches = new WeakMap(); // atlas img -> Map(packed fg -> p5.Image)

function tintedAtlas(img, packed) {
  if (packed === WHITE) return img;
  let cache = tintCaches.get(img);
  if (!cache) {
    cache = new Map();
    tintCaches.set(img, cache);
  }
  let tinted = cache.get(packed);
  if (!tinted) {
    const r = (packed >>> 24) & 0xff;
    const g = (packed >>> 16) & 0xff;
    const b = (packed >>> 8) & 0xff;
    const a = packed & 0xff;
    tinted = createImage(img.width, img.height);
    tinted.copy(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
    tinted.loadPixels();
    const px = tinted.pixels;
    for (let p = 0; p < px.length; p += 4) {
      px[p] = r;
      px[p + 1] = g;
      px[p + 2] = b;
      px[p + 3] = ((px[p + 3] * a) / 255) | 0;
    }
    tinted.updatePixels();
    cache.set(packed, tinted);
  }
  return tinted;
}

// ---------------------------------------------------------------------------

let defaultSheet = null;

/** Fallback Cp437Sheet for buffers created without opts.sheet. */
export function setDefaultSheet(sheet) {
  defaultSheet = sheet;
}

/**
 * Make a w x h character-cell buffer.
 * @param {number} w columns
 * @param {number} h rows
 * @param {{sheet?: import("./cp437.js").Cp437Sheet}} [opts] the sheet may come
 *   straight from loadCp437Sheet() in preload(); only blit() touches its
 *   image, and by draw time it has loaded.
 * @returns {AsciiBuffer}
 */
export function createBuffer(w, h, opts = {}) {
  return new AsciiBuffer(w, h, opts);
}

export class AsciiBuffer {
  constructor(w, h, { sheet } = {}) {
    this.w = w;
    this.h = h;
    this.sheet = sheet || null;
    const n = w * h;
    this.codes = new Uint8Array(n).fill(0x20);
    this.fg = new Uint32Array(n).fill(WHITE);
    this.bg = new Uint32Array(n); // 0 = transparent
    this.arms = new Uint8Array(n);
    this._fg = WHITE;
    this._bg = PRESERVE;
    this._warnedNoSheet = false;
  }

  // --- pen state -----------------------------------------------------------

  /** Set the foreground pen. Accepts anything p5's color() accepts. */
  color(...args) {
    this._fg = args.length === 0 ? WHITE : packColor(args);
    return this;
  }

  /**
   * Set the background pen. bgColor(null) or bgColor() -> writes preserve the
   * cell's existing background (the default). Pass a color to stamp it; pass
   * a zero-alpha color (e.g. bgColor(0, 0, 0, 0)) to stamp transparency and
   * let the canvas show through at blit time.
   */
  bgColor(...args) {
    this._bg =
      args.length === 0 || args[0] === null || args[0] === undefined
        ? PRESERVE
        : packColor(args);
    return this;
  }

  // --- cell writes (all clip silently, all clear line metadata) ------------

  /** Reset every cell to a space with the given (or transparent) background. */
  clear(...bgArgs) {
    this.codes.fill(0x20);
    this.arms.fill(0);
    this.fg.fill(this._fg);
    this.bg.fill(bgArgs.length === 0 ? TRANSPARENT : packColor(bgArgs));
    return this;
  }

  _inBounds(x, y) {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  _poke(x, y, code) {
    if (!this._inBounds(x, y)) return;
    const i = y * this.w + x;
    this.codes[i] = code;
    this.fg[i] = this._fg;
    if (this._bg !== PRESERVE) this.bg[i] = this._bg;
    this.arms[i] = 0;
  }

  /** Write one cell with the current pens. charOrCode: 1-char string or CP437 code. */
  set(x, y, charOrCode) {
    let code = charToCode(charOrCode);
    if (code === -1) code = fallbackCode;
    this._poke(x | 0, y | 0, code);
    return this;
  }

  /** Cell contents as {code, char, fg, bg, arms} (packed colors), or null out of bounds. */
  get(x, y) {
    if (!this._inBounds(x, y)) return null;
    const i = y * this.w + x;
    return {
      code: this.codes[i],
      char: codeToChar(this.codes[i]),
      fg: this.fg[i],
      bg: this.bg[i],
      arms: this.arms[i],
    };
  }

  /** Draw a string at integer cell coords; '\n' returns to x on the next row. */
  text(str, x, y) {
    const s = String(str);
    let cx = x | 0;
    let cy = y | 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "\n") {
        cx = x | 0;
        cy++;
        continue;
      }
      let code = charToCode(ch);
      if (code === -1) code = fallbackCode;
      this._poke(cx, cy, code);
      cx++;
    }
    return this;
  }

  /** Shade a cell: c in [0,1] -> " ░▒▓█" with the current pens. */
  pixel(x, y, c) {
    const t = c <= 0 ? 0 : c >= 1 ? 1 : c;
    const idx = Math.min(SHADE_RAMP.length - 1, (t * SHADE_RAMP.length) | 0);
    this._poke(x | 0, y | 0, SHADE_RAMP[idx]);
    return this;
  }

  /** Fill a cell rectangle (inclusive corners) with charOrCode and the current pens. */
  fillRect(x1, y1, x2, y2, charOrCode = 0x20) {
    if (x2 < x1) [x1, x2] = [x2, x1];
    if (y2 < y1) [y1, y2] = [y2, y1];
    let code = charToCode(charOrCode);
    if (code === -1) code = fallbackCode;
    const lox = Math.max(x1 | 0, 0);
    const hix = Math.min(x2 | 0, this.w - 1);
    const loy = Math.max(y1 | 0, 0);
    const hiy = Math.min(y2 | 0, this.h - 1);
    for (let y = loy; y <= hiy; y++) {
      for (let x = lox; x <= hix; x++) {
        this._poke(x, y, code);
      }
    }
    return this;
  }

  // --- line drawing (writes arm metadata; junctions auto-merge) ------------

  /**
   * Merge new directional arms into a cell and resolve the glyph. New arms
   * win per direction; a draw that touches an axis sets that whole axis's
   * weight ("later draw wins per axis"), which keeps weights axis-uniform —
   * the only junction shapes CP437 has.
   */
  _mergeArms(x, y, nU, nD, nL, nR) {
    if (!this._inBounds(x, y)) return;
    const i = y * this.w + x;
    const e = this.arms[i];
    let u = nU || (e & 3);
    let d = nD || ((e >> 2) & 3);
    let l = nL || ((e >> 4) & 3);
    let r = nR || ((e >> 6) & 3);
    const nh = nL || nR;
    if (nh) {
      if (l) l = nh;
      if (r) r = nh;
    }
    const nv = nU || nD;
    if (nv) {
      if (u) u = nv;
      if (d) d = nv;
    }
    const key = u | (d << 2) | (l << 4) | (r << 6);
    this.codes[i] = ARMS_TO_CODE[key];
    this.arms[i] = key;
    this.fg[i] = this._fg;
    if (this._bg !== PRESERVE) this.bg[i] = this._bg;
  }

  /**
   * Horizontal line, inclusive endpoints. weight: 'single' | 'double' (1 | 2
   * also accepted). Endpoints contribute only their inward arm, so a line
   * ending on another line forms a tee, not a cross; standalone endpoints
   * still render as the full ─/═ glyph.
   */
  hline(x1, x2, y, weight = "single") {
    const wt = weightOf(weight);
    x1 |= 0;
    x2 |= 0;
    y |= 0;
    if (x2 < x1) [x1, x2] = [x2, x1];
    if (y < 0 || y >= this.h) return this;
    const lo = Math.max(x1, 0);
    const hi = Math.min(x2, this.w - 1);
    const solo = x1 === x2; // length-1: both arms, so it merges as a through-piece
    for (let x = lo; x <= hi; x++) {
      const L = solo || x > x1 ? wt : 0;
      const R = solo || x < x2 ? wt : 0;
      this._mergeArms(x, y, 0, 0, L, R);
    }
    return this;
  }

  /** Vertical line, inclusive endpoints. See hline() for weight and endpoint rules. */
  vline(x, y1, y2, weight = "single") {
    const wt = weightOf(weight);
    x |= 0;
    y1 |= 0;
    y2 |= 0;
    if (y2 < y1) [y1, y2] = [y2, y1];
    if (x < 0 || x >= this.w) return this;
    const lo = Math.max(y1, 0);
    const hi = Math.min(y2, this.h - 1);
    const solo = y1 === y2;
    for (let y = lo; y <= hi; y++) {
      const U = solo || y > y1 ? wt : 0;
      const D = solo || y < y2 ? wt : 0;
      this._mergeArms(x, y, U, D, 0, 0);
    }
    return this;
  }

  /**
   * Rectangle outline, inclusive corners. Corners, tees, and crosses form
   * automatically where edges meet other lines. Degenerate boxes collapse to
   * a line.
   */
  box(x1, y1, x2, y2, weight = "single") {
    if (x2 < x1) [x1, x2] = [x2, x1];
    if (y2 < y1) [y1, y2] = [y2, y1];
    if (y1 === y2) return this.hline(x1, x2, y1, weight);
    if (x1 === x2) return this.vline(x1, y1, y2, weight);
    this.hline(x1, x2, y1, weight);
    this.hline(x1, x2, y2, weight);
    this.vline(x1, y1, y2, weight);
    this.vline(x2, y1, y2, weight);
    return this;
  }

  // --- output --------------------------------------------------------------

  /** Buffer width in pixels at the given scale. */
  pxWidth(scale = 1) {
    return this.w * CHAR_W * scale;
  }

  /** Buffer height in pixels at the given scale. */
  pxHeight(scale = 1) {
    return this.h * CHAR_H * scale;
  }

  /**
   * Render the whole buffer with its top-left at pixel (x, y). Two passes:
   * background rects (row runs of equal color coalesced into single rects),
   * then glyphs from the per-color tinted atlas.
   * @param gfx optional p5.Graphics target; defaults to the main canvas.
   */
  blit(x = 0, y = 0, scale = 1, gfx = null) {
    const sheet = this.sheet || defaultSheet;
    if (!sheet || !sheet.img || !sheet.img.width) {
      if (!this._warnedNoSheet) {
        console.warn("AsciiBuffer.blit: no sheet, or atlas not loaded yet");
        this._warnedNoSheet = true;
      }
      return this;
    }
    const target = gfx || window;
    const cw = CHAR_W * scale;
    const ch = CHAR_H * scale;
    target.push();
    target.noStroke();
    for (let cy = 0; cy < this.h; cy++) {
      const row = cy * this.w;
      let cx = 0;
      while (cx < this.w) {
        const b = this.bg[row + cx];
        if (b === TRANSPARENT) {
          cx++;
          continue;
        }
        let end = cx + 1;
        while (end < this.w && this.bg[row + end] === b) end++;
        target.fill(unpackToCss(b));
        target.rect(x + cx * cw, y + cy * ch, (end - cx) * cw, ch);
        cx = end;
      }
    }
    for (let cy = 0; cy < this.h; cy++) {
      const row = cy * this.w;
      for (let cx = 0; cx < this.w; cx++) {
        const code = this.codes[row + cx];
        if (code === 0 || code === 0x20) continue;
        const f = this.fg[row + cx];
        if ((f & 0xff) === 0) continue;
        const atlas = tintedAtlas(sheet.img, f);
        const r = spriteRect(code);
        target.image(atlas, x + cx * cw, y + cy * ch, cw, ch, r.x, r.y, r.w, r.h);
      }
    }
    target.pop();
    return this;
  }
}
