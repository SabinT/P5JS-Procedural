let sdfImg;
let circles = [];

// Settings
const settings = {
  maxIterations: 100000,   // Maximum attempts to place a circle
  maxCircles: 1000,        // Maximum number of circles to place
  minRadius: 2,            // Minimum circle radius
  maxRadius: 20,           // Maximum circle radius
  distanceThreshold: 0.95, // Only place circles where the normalized distance is above this value
  minRotationSpeed: -0.05, // Minimum rotation speed (radians per frame)
  maxRotationSpeed: 0.1   // Maximum rotation speed (radians per frame)
};

window.preload = function() {
  // Load the SDF image (assumes a square PNG)
  sdfImg = loadImage('./ribs_sdf.png');
};

window.setup = function() {
  // Create a canvas with the same dimensions as the image
  createCanvas(sdfImg.width, sdfImg.height);
  // Generate circles once during setup
  generateCircles();
  // Do not call noLoop() since we want animation
};

function generateCircles() {
  let iterations = 0;
  
  while (iterations < settings.maxIterations && circles.length < settings.maxCircles) {
    let x = random(width);
    let y = random(height);
    
    // Get the pixel brightness from the SDF image (using the red channel for grayscale)
    let c = sdfImg.get(floor(x), floor(y));
    let distanceValue = red(c) / 255.0;
    
    // Only consider this point if it meets the distance threshold
    if (distanceValue > settings.distanceThreshold) {
      // Random radius between min and max
      let newRadius = random(settings.minRadius, settings.maxRadius);
      
      // Check for overlaps with existing circles
      let overlapping = false;
      for (let i = 0; i < circles.length; i++) {
        let d = dist(x, y, circles[i].x, circles[i].y);
        if (d < newRadius + circles[i].r) {
          overlapping = true;
          break;
        }
      }
      
      if (!overlapping) {
        // Use the current count as a deterministic seed
        let idx = circles.length;
        // Deterministic random rotation speed based on index using sine
        let rotationSpeed = map(sin(idx), -1, 1, settings.minRotationSpeed, settings.maxRotationSpeed);
        // Also assign an initial angle deterministically (using cosine here)
        let initialAngle = map(cos(idx * 1.7), -1, 1, 0, TWO_PI);
        
        circles.push({ 
          x: x, 
          y: y, 
          r: newRadius, 
          angle: initialAngle, 
          rotationSpeed: rotationSpeed 
        });
      }
    }
    
    iterations++;
  }
}

window.draw = function() {
  background(0);
  
  // For each circle, update rotation if it's a googley eye and then draw it
  for (let i = 0; i < circles.length; i++) {
    let circle = circles[i];
    if (circle.r > 8) {
      circle.angle += circle.rotationSpeed;
    }
    drawCircle(circle);
  }
};

// Draws a circle. For circles with radius > 8, draws an animated googley eye.
function drawCircle(circle) {
  noFill();
  stroke(255);
  
  if (circle.r > 8) {
    drawGoogleyEye(circle);
  } else {
    ellipse(circle.x, circle.y, circle.r * 2, circle.r * 2);
  }
}

// Draws a googley eye with a rotating iris.
function drawGoogleyEye(circle) {
  let { x, y, r, angle } = circle;
  let eyeSize = r * 2;
  let irisSize = r * 0.8;
  let offset = r * 0.5;
  
  // Draw the white of the eye
  fill(255);
  ellipse(x, y, eyeSize, eyeSize);
  
  // Compute the iris position based on a rotation around the center
  let irisX = x + cos(angle) * offset;
  let irisY = y + sin(angle) * offset;
  
  // Draw the iris
  fill(0);
  ellipse(irisX, irisY, irisSize, irisSize);
}
