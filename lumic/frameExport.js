/**
 * Frame-sequence PNG export — write one perfect loop to numbered PNGs for
 * ffmpeg.
 *
 * Nothing here runs on its own: the sketch draws normally until something
 * calls exportFrameSequence(), so bind it to a key. During the export the p5
 * draw loop is stopped and this module drives the frames itself, which is what
 * makes the output deterministic — the sketch must render from the phase
 * handed to render(u, i), never from frameCount.
 *
 * Exactly `frames` files are written, for phases 0, 1/N, ... (N-1)/N. The
 * closing frame is deliberately left out: at phase 1 the loop is back at
 * phase 0, so shipping both would hold that image for two frames and put a
 * visible hitch at the loop point.
 *
 * Output goes to a folder picked once through the File System Access API
 * (Chrome/Edge, and the page must be on localhost or https — a plain file://
 * open will not do). Browsers without it fall back to one download per frame.
 * Esc cancels; already-written frames stay on disk.
 *
 * Typical use:
 *   // draw()
 *   renderFrame((frameCount % T) / T);
 *   // keyPressed()
 *   if (key === "e") exportFrameSequence({ frames: T, fps: 60, render: renderFrame });
 */

/** True when the browser can write a folder directly (no download spam). */
export function canWriteFolder() {
  return typeof window.showDirectoryPicker === "function";
}

let running = false;

/**
 * Render one loop to PNGs.
 * @param {object} opts
 * @param {number} opts.frames frame count for one full loop
 * @param {(u: number, i: number) => void} opts.render draws frame i at phase u
 * @param {number} [opts.fps] frame rate, only used for the ffmpeg note
 * @param {string} [opts.prefix] filename prefix before the frame number
 * @param {number} [opts.pad] zero-padded digits in the frame number
 * @param {HTMLCanvasElement} [opts.canvas] defaults to the first page canvas
 * @param {boolean} [opts.notes] also write ffmpeg-commands.txt (default true)
 * @returns {Promise<number>} frames actually written
 */
export async function exportFrameSequence({
  frames,
  render,
  fps = 60,
  prefix = "frame_",
  pad = 4,
  canvas = null,
  notes = true,
} = {}) {
  if (running) return 0;
  const cnv = canvas || document.querySelector("canvas");
  if (!cnv || typeof render !== "function" || !frames) {
    console.warn("exportFrameSequence: needs frames, render() and a canvas");
    return 0;
  }

  // Pick the destination before stopping the sketch — the picker needs the
  // user gesture that is still in flight, and a cancelled pick should leave
  // the sketch untouched.
  let dir = null;
  if (canWriteFolder()) {
    try {
      dir = await window.showDirectoryPicker({ id: "frameExport", mode: "readwrite" });
    } catch (err) {
      return 0; // user dismissed the picker
    }
  } else {
    console.warn(
      `frameExport: no File System Access API here — falling back to ${frames} separate ` +
        "downloads. Allow multiple downloads when the browser asks, and expect them in " +
        "your default download folder."
    );
  }

  running = true;
  let cancelled = false;
  const onKey = (e) => {
    if (e.key === "Escape") cancelled = true;
  };
  window.addEventListener("keydown", onKey);
  const status = makeStatus();
  const looping = typeof noLoop === "function";
  if (looping) noLoop(); // else p5 would redraw between render() and capture

  let written = 0;
  try {
    for (let i = 0; i < frames && !cancelled; i++) {
      render(i / frames, i);
      const blob = await canvasToBlob(cnv);
      const name = `${prefix}${String(i).padStart(pad, "0")}.png`;
      if (dir) await writeFile(dir, name, blob);
      else downloadBlob(blob, name);
      written++;
      status.set(`exporting ${written}/${frames}  —  Esc to cancel`);
      // Let the browser paint the counter and, on the download path, breathe
      // between saves.
      if (i % 10 === 0 || !dir) await new Promise(requestAnimationFrame);
    }
    if (dir && notes && !cancelled) {
      await writeFile(dir, "ffmpeg-commands.txt", new Blob([ffmpegNotes({ prefix, pad, fps })]));
    }
  } finally {
    window.removeEventListener("keydown", onKey);
    status.remove();
    if (looping) loop();
    running = false;
  }

  const how = cancelled ? "cancelled after" : "wrote";
  console.log(`frameExport: ${how} ${written}/${frames} frames\n${ffmpegNotes({ prefix, pad, fps })}`);
  return written;
}

/** The ffmpeg recipes for the sequence this export just wrote. */
export function ffmpegNotes({ prefix = "frame_", pad = 4, fps = 60 } = {}) {
  const pattern = `${prefix}%${String(pad).padStart(2, "0")}d.png`;
  return [
    `# ${fps} fps PNG sequence -> seamless loop. Run from this folder.`,
    "# The sequence holds one full loop with no repeated end frame, so the",
    "# video loops cleanly on repeat with no extra trimming.",
    "",
    "# H.264, widest compatibility (Instagram, phones, browsers):",
    `ffmpeg -framerate ${fps} -i ${pattern} -c:v libx264 -preset slow -crf 16 \\`,
    "  -pix_fmt yuv420p -movflags +faststart loop.mp4",
    "",
    "# Same, repeated 3x for a longer post (-stream_loop N repeats N extra times):",
    `ffmpeg -framerate ${fps} -stream_loop 2 -i ${pattern} -c:v libx264 -preset slow \\`,
    "  -crf 16 -pix_fmt yuv420p -movflags +faststart loop-3x.mp4",
    "",
    "# Crisper colour for players that handle 4:4:4 (not Instagram):",
    `ffmpeg -framerate ${fps} -i ${pattern} -c:v libx264 -preset slow -crf 14 \\`,
    "  -pix_fmt yuv444p loop-444.mp4",
    "",
    "# Downscale 1440 -> 1080 without softening the pixel grid:",
    `ffmpeg -framerate ${fps} -i ${pattern} -vf scale=1080:1080:flags=neighbor \\`,
    "  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p loop-1080.mp4",
    "",
    "# GIF via a shared palette (bigger file, universal preview):",
    `ffmpeg -framerate ${fps} -i ${pattern} -vf palettegen=stats_mode=diff palette.png`,
    `ffmpeg -framerate ${fps} -i ${pattern} -i palette.png \\`,
    '  -lavfi "paletteuse=dither=none" -loop 0 loop.gif',
    "",
  ].join("\n");
}

// ─────────────────────── internals ───────────────────────

function canvasToBlob(cnv) {
  return new Promise((resolve, reject) => {
    cnv.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))), "image/png");
  });
}

async function writeFile(dir, name, blob) {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Progress readout as a DOM overlay — drawing it on the canvas would land in the frames. */
function makeStatus() {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:8px 12px;" +
    "background:#000c;color:#fff;font:14px/1.4 monospace;text-align:center";
  el.textContent = "exporting…";
  document.body.appendChild(el);
  return {
    set: (text) => {
      el.textContent = text;
    },
    remove: () => el.remove(),
  };
}
