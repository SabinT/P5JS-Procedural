import { vec2 } from "./common.js";

// OutCode constants
const INSIDE = 0; // 0000
const LEFT = 1; // 0001
const RIGHT = 2; // 0010
const BOTTOM = 4; // 0100
const TOP = 8; // 1000

// ComputeOutCode function adapted for JavaScript
function ComputeOutCode(x, y, boundsMin, boundsMax) {
  let code = INSIDE; // Initialized as being inside of clip window

  if (x < boundsMin.x) {
    // To the left of clip window
    code |= LEFT;
  } else if (x > boundsMax.x) {
    // To the right of clip window
    code |= RIGHT;
  }
  if (y < boundsMin.y) {
    // Below the clip window
    code |= BOTTOM;
  } else if (y > boundsMax.y) {
    // Above the clip window
    code |= TOP;
  }

  return code;
}

// CohenSutherlandLineClip algorithm adapted for JavaScript and vec2 objects
export function clipLine(a, b, boundsMin, boundsMax) {
  let outcode0 = ComputeOutCode(a.x, a.y, boundsMin, boundsMax);
  let outcode1 = ComputeOutCode(b.x, b.y, boundsMin, boundsMax);
  let accept = false;

  while (true) {
    if (!(outcode0 | outcode1)) {
      // Bitwise OR is 0: both points inside window; trivially accept and exit loop
      accept = true;
      break;
    } else if (outcode0 & outcode1) {
      // Bitwise AND is not 0: both points share an outside zone; exit loop (accept is false)
      break;
    } else {
      // Calculate the line segment to clip from an outside point to an intersection with clip edge
      let x, y;
      // Pick the outcode for the point outside the window
      let outcodeOut = outcode1 > outcode0 ? outcode1 : outcode0;

      if (outcodeOut & TOP) {
        // Point is above the clip window
        x = a.x + ((b.x - a.x) * (boundsMax.y - a.y)) / (b.y - a.y);
        y = boundsMax.y;
      } else if (outcodeOut & BOTTOM) {
        // Point is below the clip window
        x = a.x + ((b.x - a.x) * (boundsMin.y - a.y)) / (b.y - a.y);
        y = boundsMin.y;
      } else if (outcodeOut & RIGHT) {
        // Point is to the right of clip window
        y = a.y + ((b.y - a.y) * (boundsMax.x - a.x)) / (b.x - a.x);
        x = boundsMax.x;
      } else if (outcodeOut & LEFT) {
        // Point is to the left of clip window
        y = a.y + ((b.y - a.y) * (boundsMin.x - a.x)) / (b.x - a.x);
        x = boundsMin.x;
      }

      // Now move outside point to intersection point to clip and get ready for next pass.
      if (outcodeOut === outcode0) {
        a.x = x;
        a.y = y;
        outcode0 = ComputeOutCode(a.x, a.y, boundsMin, boundsMax);
      } else {
        b.x = x;
        b.y = y;
        outcode1 = ComputeOutCode(b.x, b.y, boundsMin, boundsMax);
      }
    }
  }

  if (accept) {
    // If the line is accepted, return the clipped line
    return [vec2(a.x, a.y), vec2(b.x, b.y)];
  } else {
    // If the line is rejected, return null or an indication of rejection
    return null;
  }
}
