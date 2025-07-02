import { sqRand } from "./lumic/common.js";
import { smoothstep } from "./lumic/easing.js";
import { centerCanvas } from "./lumic/p5Extensions.js";

let sdfImg;
let heartSdfImg;

// Settings
const settingsRibs = {
  maxIterations: 100000,   // Maximum attempts to place a circle
  maxCircles: 1000,        // Maximum number of circles to place
  minRadius: 7,            // Minimum circle radius
  maxRadius: 15,           // Maximum circle radius
  distanceThreshold: 0.95, // Only place circles where the normalized distance is above this value
  minRotationSpeed: -0.05, // Minimum rotation speed (radians per frame)
  maxRotationSpeed: 0.1   // Maximum rotation speed (radians per frame)
};

const settingsHeart = {
  maxIterations: 100000,   // Maximum attempts to place a circle
  maxCircles: 1000,        // Maximum number of circles to place
  minRadius: 4,            // Minimum circle radius
  maxRadius: 15,           // Maximum circle radius
  distanceThreshold: 0.95, // Only place circles where the normalized distance is above this value
  minRotationSpeed: -0.05, // Minimum rotation speed (radians per frame)
  maxRotationSpeed: 0.1    // Maximum rotation speed (radians per frame)
};

window.preload = function() {
  // Load the SDF image (assumes a square PNG)
  sdfImg = loadImage('./ribs_sdf.png');
  heartSdfImg = loadImage('./heart_sdf.png');
};

let ribsCircles;
let heartCircles;

window.setup = function() {
  // Create a canvas with the same dimensions as the image
  let canvas = createCanvas(sdfImg.width, sdfImg.height);
  centerCanvas(canvas);
  // Generate circles once during setup
  ribsCircles = generateCircles(sdfImg, settingsRibs);
  let ribCirclesCopy = [...ribsCircles];
  heartCircles = generateCircles(heartSdfImg, settingsHeart, ribCirclesCopy);
  // Do not call noLoop() since we want animation
};

function generateCircles(sdfImg, settings, existingCircles) {
  let iterations = 0;
  let circles = []
  let allCircles = existingCircles || [];
  
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
      for (let i = 0; i < allCircles.length; i++) {
        let d = dist(x, y, allCircles[i].x, allCircles[i].y);
        if (d < newRadius + allCircles[i].r) {
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
        
        const newCircle = {
          x: x,
          y: y,
          r: newRadius,
          angle: initialAngle,
          rotationSpeed: rotationSpeed
        };

        circles.push(newCircle);
        allCircles.push(newCircle);
      }
    }
    
    iterations++;
  }

  return circles;
}

window.mouseIsPressed = function() {}

window.draw = function() {
  background(0);

  // Draw heart circles with a different color
  for (let i = 0; i < heartCircles.length; i++) {
    let circle = heartCircles[i];
    fill(255, 0, 0); // Red color for heart circles
    drawHeartCircle(circle);
  }
  
  // For each circle, update rotation if it's a googley eye and then draw it
  for (let i = 0; i < ribsCircles.length; i++) {
    let circle = ribsCircles[i];
    if (circle.r > 8) {
      circle.angle += circle.rotationSpeed;
    }
    drawRibCircle(circle);
  }
};

function drawHeartCircle(circle) {
  fill("red");
  stroke("red");
  
  let t = millis() / 1000; // Time in seconds
  let pulseFactor = pulseHeart(t);
  let adjustedR = circle.r * pulseFactor;

  ellipse(circle.x, circle.y, adjustedR * 2, adjustedR * 2);
}

// Draws a circle. For circles with radius > 8, draws an animated googley eye.
function drawRibCircle(circle) {
  noFill();
  stroke(255);
  
  if (circle.r > 8) {
    drawGoogleyEye(circle);
  } else {
    ellipse(circle.x, circle.y, circle.r * 2, circle.r * 2);
  }
}

function pulseHeart(t) {
  // smoothstep(0,.9,sin(x + t * 1) - 0.5)
  // smoothstep(0,.9,sin(-2.4 + x + t * 1) - 0.5) * 0.4
  const speed = 7.5;
  t = t * speed;

  const cycle = t / TAU;
  const iCycle = floor(cycle);

  let f1 = smoothstep(0,.9,sin(t * 1) - 0.5);
  let f2 = smoothstep(0,.9,sin(-2.4 + t * 1) - 0.5) * 0.4;

  let f = f1 + f2 ;

  let r = sqRand(iCycle);
  let randMax = map(r, 0, 1, 2, 5);

  let minMax = [0.5, randMax];
  return map(f, 0, 1, minMax[0], minMax[1]);
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
