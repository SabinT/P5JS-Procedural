import { line2D } from "./common.js";

export class BezierCubic {        
    constructor(a,b,c,d,segments = 8) {
      this.a = a;
      this.b = b;
      this.c = c;
      this.d = d;
      this.points = [];
      this.segments = segments;
    }
    
    EvaluatePoint(t) {
      // De Casteljau’s algorithm
      // Evaluate 3 points at position 't' between a->b, b->c, and c->d
      const p1 = p5.Vector.lerp(this.a, this.b, t);
      const p2 = p5.Vector.lerp(this.b, this.c, t);
      const p3 = p5.Vector.lerp(this.c, this.d, t);
      
      // Now, evaluate 2 points at position 't' between p1->p2, p2->p3
      const q1 = p5.Vector.lerp(p1, p2, t);
      const q2 = p5.Vector.lerp(p2, p3, t);
      
      // The position at 't' on the final segment is the point on the curve
      return p5.Vector.lerp(q1, q2, t);
    }
    
    // Build line segments for rendering
    Build() {
      this.points = [];
      
      for (let i = 0; i <= this.segments; i++) {
        const t = i / this.segments;
        
        this.points.push(this.EvaluatePoint(t));
      }
    }
    
    Draw(debugDraw = false) {
      this.Build();
      
      for(let i = 0; i < this.points.length - 1; i++) {
        line2D(this.points[i], this.points[i + 1]);
      }
      
      if (debugDraw) {
        // draw control points
        strokeWeight(1);
        stroke(150);
        line2D(this.a, this.b);
        line2D(this.b, this.c);
        line2D(this.c, this.d);
        
        const diameter = 10;
        stroke(200);
        strokeWeight(2);
        fill("#ffffffaa");
        circle(this.a.x, this.a.y, diameter);
        circle(this.b.x, this.b.y, diameter);
        circle(this.c.x, this.c.y, diameter);
        circle(this.d.x, this.d.y, diameter);
      }
    }
  }