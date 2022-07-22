import { vec2, DEG2RAD } from "./common.js";
import { BezierCubic } from "./bezier.js";

export const defaultLeafOptions = {};
defaultLeafOptions.segments = 10;
defaultLeafOptions.r1 = 150; // Distance of 2nd control point from first
defaultLeafOptions.r2 = 150; // Distance of 3rd control point from 4th
defaultLeafOptions.maxAngle1 = 30; // The max angle from the centerline that the 1st control point makes relative to the 2nd
defaultLeafOptions.angleOffset1 = 0;
defaultLeafOptions.maxAngle2 = 75; // The max angle from the centerline that the 3rd control point makes relative to the 4th
defaultLeafOptions.angleOffset2 = 0;
defaultLeafOptions.crossSegments = 8;
defaultLeafOptions.leafLength = 685;
defaultLeafOptions.debugDraw = false;
defaultLeafOptions.centered = false;

export function drawLeafShape(o) {
    o = o || defaultLeafOptions;
    const hh = o.leafLength / 2;
    const yOffset = o.centered ? 0 : hh;
    const leafStart = vec2(0, -hh - yOffset);
    const leafEnd = vec2(0, hh - yOffset);
  
    let curves = [];
  
    for (let t = 0; t <= 1; t++) {  
      const a = leafStart;
  
      let angle1 = o.angleOffset1 + lerp(-o.maxAngle1, o.maxAngle1, t);
      // Note: maxAngle is defined against a vertical line, get angle from horizontal line
      // Also convert to radians
      angle1 = (90 - angle1) * DEG2RAD;
  
      const b = vec2(o.r1 * Math.cos(angle1), o.r1 * Math.sin(angle1));
      b.add(a);
  
      const d = leafEnd;
      let angle2 = o.angleOffset2 + lerp(-o.maxAngle2, o.maxAngle2, t); // radians
      angle2 = (90 - angle2) * DEG2RAD;
  
      const c = vec2(o.r2 * Math.cos(angle2), o.r2 * -Math.sin(angle2));
      c.add(d);
  
      const curve = new BezierCubic(a, b, c, d, 32);
      curve.Build();
      curves.push(curve);
    }
  
    // Create shape from the two curves
    beginShape();
    for (let i = 0; i < curves.length; i++) {
      const curve = curves[i];
      for (let j = 0; j < curve.points.length; j++) {
        // Reverse order for second curve
        const t = i === 0 ? j : curve.points.length - 1 - j;
        const point = curve.points[t];
        vertex(point.x, point.y);
      }
    }

    endShape();
}

export function drawLeaf(o) {
    o = o || defaultLeafOptions;
    const hh = o.leafLength / 2;
    const yOffset = o.centered ? 0 : hh;
    const leafStart = vec2(0, -hh - yOffset);
    const leafEnd = vec2(0, hh - yOffset);
  
    let curves = [];
  
    for (let i = 0; i <= o.segments; i++) {
      let t = i / o.segments;
  
      const a = leafStart;
  
      let angle1 = o.angleOffset1 + lerp(-o.maxAngle1, o.maxAngle1, t);
      // Note: maxAngle is defined against a vertical line, get angle from horizontal line
      // Also convert to radians
      angle1 = (90 - angle1) * DEG2RAD;
  
      const b = vec2(o.r1 * Math.cos(angle1), o.r1 * Math.sin(angle1));
      b.add(a);
  
      const d = leafEnd;
      let angle2 = o.angleOffset2 + lerp(-o.maxAngle2, o.maxAngle2, t); // radians
      angle2 = (90 - angle2) * DEG2RAD;
  
      const c = vec2(o.r2 * Math.cos(angle2), o.r2 * -Math.sin(angle2));
      c.add(d);
  
      curves.push(new BezierCubic(a, b, c, d, 32));
    }
  
    if (o.debugDraw) {
      stroke(150, 150, 150);
      strokeWeight(1);
      noFill();
      circle(leafStart.x, leafStart.y, o.r1 * 2);
      circle(leafEnd.x, leafEnd.y, o.r2 * 2);
    }
  
    for (let curve of curves) {
      noFill();
      stroke("red");
      curve.Draw(o.debugDraw);
    }
  
    // Draw a "horizontal lines" along the length of the bands.
    // A "band" is the space between two vertical lines.
    // There are (n - 1) bands for (n) lines
    let tStep = 1.0 / o.crossSegments;
    for (let band = 0; band < curves.length - 1; band++) {
      // Start odd segments at an offset
      let t = (millis() / 20000 + (band % 2 == 0 ? 0 : tStep / 2)) % tStep;
      while (t < 1) {
        const curve = curves[band];
        const a = curve.EvaluatePoint(t);
        const b = curves[band + 1].EvaluatePoint(t);
  
        strokeWeight(2);
        line(a.x, a.y, b.x, b.y);
        t += tStep;
      }
    }
  }
  
  