/**
 * Code page 437 bitmap font atlas — sprite indexing by ASCII code or by text.
 *
 * Atlas: assets/cp437-9x16.png (288x128, RGBA, white glyphs on transparent).
 * Built from assets/Codepage-437.png by assets/tools/make-cp437-atlas.py, which
 * strips the source sheet's 8px outer margin. The result is tightly packed:
 * 256 glyphs, 32 columns x 8 rows, 9x16 per cell, no gutters.
 *
 * The 9x16 cell is the real VGA text-mode character box, not 8x16 with a gap —
 * glyphs 0xB0-0xB2 and 0xC0-0xDF draw into the 9th column so box-drawing runs
 * connect. Keep the 9:16 aspect ratio (or an integer multiple) or the line
 * graphics will not tile.
 *
 * For crisp output call noSmooth() once in setup() and draw at integer
 * positions with an integer scale.
 */

/** Character cell width in pixels. */
export const CHAR_W = 9;
/** Character cell height in pixels. */
export const CHAR_H = 16;
/** Glyph columns in the atlas. */
export const SHEET_COLS = 32;
/** Glyph rows in the atlas. */
export const SHEET_ROWS = 8;
/** Total glyphs. */
export const CHAR_COUNT = SHEET_COLS * SHEET_ROWS; // 256
/** Atlas pixel dimensions. */
export const SHEET_W = SHEET_COLS * CHAR_W; // 288
export const SHEET_H = SHEET_ROWS * CHAR_H; // 128
/** Width / height of one character. Multiply a desired height by this for width. */
export const CHAR_ASPECT = CHAR_W / CHAR_H;

/** Default atlas path, relative to a page in sketches/. */
export const ATLAS_PATH = "../assets/cp437-9x16.png";

/**
 * CP437 code -> Unicode. Codes 0x00-0x1F and 0x7F use the MS-DOS *graphic*
 * forms (smiley, arrows, house, ...) rather than the C0 control meanings,
 * which is what the atlas actually draws.
 */
export const CP437_CHARS = [
  " ☺☻♥♦♣♠•◘○◙♂♀♪♫☼", // 0x00-0x0F
  "►◄↕‼¶§▬↨↑↓→←∟↔▲▼", // 0x10-0x1F
  " !\"#$%&'()*+,-./", // 0x20-0x2F
  "0123456789:;<=>?", // 0x30-0x3F
  "@ABCDEFGHIJKLMNO", // 0x40-0x4F
  "PQRSTUVWXYZ[\\]^_", // 0x50-0x5F
  "`abcdefghijklmno", // 0x60-0x6F
  "pqrstuvwxyz{|}~⌂", // 0x70-0x7F
  "ÇüéâäàåçêëèïîìÄÅ", // 0x80-0x8F
  "ÉæÆôöòûùÿÖÜ¢£¥₧ƒ", // 0x90-0x9F
  "áíóúñÑªº¿⌐¬½¼¡«»", // 0xA0-0xAF
  "░▒▓│┤╡╢╖╕╣║╗╝╜╛┐", // 0xB0-0xBF
  "└┴┬├─┼╞╟╚╔╩╦╠═╬╧", // 0xC0-0xCF
  "╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀", // 0xD0-0xDF
  "αßΓπΣσµτΦΘΩδ∞φε∩", // 0xE0-0xEF
  "≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ", // 0xF0-0xFF
].join("");

// Unicode -> CP437. Built last-wins so the one duplicate (0x00 and 0x20 both
// render as SPACE) resolves to the canonical ASCII 0x20.
const UNICODE_TO_CODE = new Map();
for (let code = 0; code < CHAR_COUNT; code++) {
  UNICODE_TO_CODE.set(CP437_CHARS[code], code);
}

/** Code substituted for characters with no CP437 equivalent. */
export let fallbackCode = 0x3f; // '?'

export function setFallbackChar(charOrCode) {
  fallbackCode = charToCode(charOrCode, 0x3f);
}

/** CP437 code -> the Unicode character it draws. */
export function codeToChar(code) {
  return CP437_CHARS[code & 0xff];
}

/**
 * A character (or a 1-char string, or an already-numeric code) -> CP437 code.
 * Returns `missing` when the character is outside CP437.
 */
export function charToCode(charOrCode, missing = -1) {
  if (typeof charOrCode === "number") {
    return charOrCode >= 0 && charOrCode < CHAR_COUNT ? charOrCode : missing;
  }
  if (typeof charOrCode !== "string" || charOrCode.length === 0) return missing;
  const code = UNICODE_TO_CODE.get(charOrCode[0]);
  return code === undefined ? missing : code;
}

/** True if the character exists in CP437. */
export function hasChar(charOrCode) {
  return charToCode(charOrCode) !== -1;
}

/** A string -> Uint8Array of CP437 codes, unmapped characters become fallbackCode. */
export function toCodes(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = charToCode(text[i]);
    out[i] = code === -1 ? fallbackCode : code;
  }
  return out;
}

/** Uint8Array/array of CP437 codes -> string. */
export function fromCodes(codes) {
  let s = "";
  for (let i = 0; i < codes.length; i++) s += codeToChar(codes[i]);
  return s;
}

/**
 * Source rectangle of a glyph inside the atlas.
 * Accepts a CP437 code or a character. Wraps out-of-range codes into 0..255.
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function spriteRect(charOrCode) {
  let code = charToCode(charOrCode);
  if (code === -1) code = fallbackCode;
  const col = code % SHEET_COLS;
  const row = (code / SHEET_COLS) | 0;
  return { x: col * CHAR_W, y: row * CHAR_H, w: CHAR_W, h: CHAR_H };
}

/** Grid position of a glyph in the atlas, as {col, row}. */
export function spriteCell(charOrCode) {
  let code = charToCode(charOrCode);
  if (code === -1) code = fallbackCode;
  return { col: code % SHEET_COLS, row: (code / SHEET_COLS) | 0 };
}

/** Rendered size of `text` (honours newlines) at the given scale. */
export function measureText(text, scale = 1) {
  const lines = String(text).split("\n");
  let cols = 0;
  for (const line of lines) cols = Math.max(cols, line.length);
  return {
    w: cols * CHAR_W * scale,
    h: lines.length * CHAR_H * scale,
    cols,
    rows: lines.length,
  };
}

/**
 * Wraps a loaded atlas image and draws glyphs from it.
 *
 * Drawing uses p5's global image() so it works on the main canvas; pass a
 * p5.Graphics as `gfx` to draw into an offscreen buffer instead.
 */
export class Cp437Sheet {
  /**
   * @param {p5.Image} img the atlas, expected 288x128
   */
  constructor(img) {
    if (!img || !img.width) {
      throw new Error("Cp437Sheet: atlas image not loaded");
    }
    if (img.width !== SHEET_W || img.height !== SHEET_H) {
      console.warn(
        `Cp437Sheet: expected ${SHEET_W}x${SHEET_H} atlas, got ${img.width}x${img.height}`
      );
    }
    this.img = img;
    this._cutouts = new Map();
  }

  /**
   * Draw one glyph with its top-left corner at (x, y).
   * @param scale integer multiplier; 1 draws at native 9x16.
   */
  drawChar(charOrCode, x, y, scale = 1, gfx = null) {
    const r = spriteRect(charOrCode);
    const target = gfx || window;
    target.image(this.img, x, y, r.w * scale, r.h * scale, r.x, r.y, r.w, r.h);
  }

  /**
   * Draw a glyph stretched to an explicit box. Use for non-uniform layouts;
   * prefer drawChar() when you want the native 9:16 aspect ratio.
   */
  drawCharRect(charOrCode, x, y, w, h, gfx = null) {
    const r = spriteRect(charOrCode);
    const target = gfx || window;
    target.image(this.img, x, y, w, h, r.x, r.y, r.w, r.h);
  }

  /**
   * Draw a string with its top-left at (x, y). Newlines start a new row.
   * @returns the size reported by measureText()
   */
  drawText(text, x, y, scale = 1, gfx = null) {
    const s = String(text);
    const stepX = CHAR_W * scale;
    const stepY = CHAR_H * scale;
    let cx = x;
    let cy = y;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "\n") {
        cx = x;
        cy += stepY;
        continue;
      }
      this.drawChar(ch, cx, cy, scale, gfx);
      cx += stepX;
    }
    return measureText(s, scale);
  }

  /**
   * A standalone 9x16 p5.Image for one glyph, cached per code.
   * Handy as a WEBGL texture or for per-glyph pixel work.
   */
  charImage(charOrCode) {
    let code = charToCode(charOrCode);
    if (code === -1) code = fallbackCode;
    let cut = this._cutouts.get(code);
    if (!cut) {
      const r = spriteRect(code);
      cut = this.img.get(r.x, r.y, r.w, r.h);
      this._cutouts.set(code, cut);
    }
    return cut;
  }
}

/**
 * Call from preload(). Returns a Cp437Sheet whose image fills in asynchronously,
 * so only touch it from setup() onward.
 */
export function loadCp437Sheet(path = ATLAS_PATH) {
  const sheet = Object.create(Cp437Sheet.prototype);
  sheet._cutouts = new Map();
  sheet.img = loadImage(path);
  return sheet;
}
