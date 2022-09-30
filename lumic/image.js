/**
 * Gets the average intensity (a value from 0 to 255) of R,G,B channels of a desired pixel
 * @param {*} img The image to sample from
 * @param {*} x The x-position of the pixel to sample
 * @param {*} y The y-position of the pixel to sample
 */
export function getPixelBrightness(img, x, y) {
  // Start position for the bytes of a pixel in the pixels array
  let pos = (y * img.width + x) * 4;

  let pixels = img.pixels;
  let r = pixels[pos];
  let g = pixels[pos + 1];
  let b = pixels[pos + 2];
  // let a = pixels[pos + 3];  // Alpha channel (transparency) is unused here

  return (r + g + b) / 3;
}

export function getBrightness(x, y) {
    // Start position for the bytes of a pixel in the pixels array
    let pos = (y * width + x) * 4; // Doesn't work for pixelDensity > 1
  
    let r = pixels[pos];
    let g = pixels[pos + 1];
    let b = pixels[pos + 2];
    // let a = pixels[pos + 3];  // Alpha channel (transparency) is unused here
  
    return (r + g + b) / 3;
  }
