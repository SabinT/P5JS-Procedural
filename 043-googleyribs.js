let sdfImg;
let circles = [];

// Settings
const settings = {
  maxIterations: 100000,   // Maximum attempts to place a circle
  maxCircles: 1000,        // Maximum number of circles to place
  minRadius: 2,           // Minimum circle radius
  maxRadius: 20,          // Maximum circle radius
  distanceThreshold: 0.95  // Only place circles where the normalized distance is less than this value
};

window.preload = function() {
  // Load the SDF image (assumes a square PNG)
  // Replace 'sdf.png' with the path to your image.
  sdfImg = loadImage('./ribs_sdf.png');
};

window.setup = function() {
  // Create a canvas with the same dimensions as the image
  createCanvas(sdfImg.width, sdfImg.height);
  background(0);
  noLoop(); // Only run draw once, since we precompute the circles
};

window.draw = function() {
  let iterations = 0;
  
  // Attempt to place circles until we reach the maximum iterations or the max number of circles
  while (iterations < settings.maxIterations && circles.length < settings.maxCircles) {
    // Randomly choose a point on the canvas
    let x = random(width);
    let y = random(height);
    
    // Get the pixel color from the SDF image at this point (assumes grayscale, so red channel is sufficient)
    let c = sdfImg.get(floor(x), floor(y));
    let distanceValue = red(c) / 255.0; // Normalize to a 0–1 range
    
    // Only consider this point if the distance value is below the threshold
    if (distanceValue > settings.distanceThreshold) {
    //   // Scale the circle radius based on the SDF value between minRadius and maxRadius
    //   let newRadius = map(distanceValue, 0, 1, settings.minRadius, settings.maxRadius);

      // random radius between min and max
      let newRadius = random(settings.minRadius, settings.maxRadius);
      
      // Check for overlaps with previously placed circles
      let overlapping = false;
      for (let i = 0; i < circles.length; i++) {
        let d = dist(x, y, circles[i].x, circles[i].y);
        if (d < newRadius + circles[i].r) {
          overlapping = true;
          break;
        }
      }
      
      // If no overlapping, add the circle
      if (!overlapping) {
        circles.push({ x: x, y: y, r: newRadius });
      }
    }
    
    iterations++;
  }
  
  // Draw all circles using the custom drawCircle function
  for (let circle of circles) {
    drawCircle(circle.x, circle.y, circle.r);
  }
};

// Custom function to draw a circle (customize as needed)
function drawCircle(x, y, r) {
  noFill();
  stroke(255);

  // Googley eyes if radius over 8
  if (r > 8) {
    drawGoogleyEye(x, y, r);
  } else {
    ellipse(x, y, r * 2, r * 2);
  }
}

// Animated googley eye
function drawGoogleyEye(x, y, r) {
  let eyeSize = r * 2;
  let irisSize = r * 0.8;
  let offset = r * 0.5;
  
  // Draw the eye
  fill(255);
  ellipse(x, y, eyeSize, eyeSize);
  
  // Draw the iris
  fill(0);
  let irisX = x + random(-offset, offset);
  let irisY = y + random(-offset, offset);
  ellipse(irisX, irisY, irisSize, irisSize);
}