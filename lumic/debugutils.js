/**
 * Draws a box with full zoom of a subsection of the graphics object
 * Example usage:
 *   `g = createGraphics(4000, 4000);`
 *   `...`
 *   `image(g, 0, 0, screenW, screenH);`
 *   `...`
 *   `if (mouseIsPressed) { drawFullZoomSection(g, 200); }`
 *
 * @param g object created with `createGraphics`
 * @param b bounds of the zoom box
 */
export function drawFullZoomSection(g, b) {
  const h = Math.floor(b / 2);
  const dw = 2 * h + 1; // pixel extents of the box

  // Mouse pos in the hi-res buffer
  let cx = (mouseX / width) * g.width;
  let cy = (mouseY / height) * g.height;

  rectMode(CORNERS);

  // make sure zoom box is not transparent (could use a checker texture here too)
  fill(0);
  rect(mouseX - h, mouseY - h, mouseX + h, mouseY + h);

  // image(graphics, destTopleftx, destToplefty, destW, destH, srcTopLeftX, srcTopLeftY, srcW, srcH)
  image(g, mouseX - h, mouseY - h, dw, dw, cx - h, cy - h, dw, dw);

  noFill();
  stroke(255);
  strokeWeight(1);
  rect(mouseX - h, mouseY - h, mouseX + h, mouseY + h);
}
