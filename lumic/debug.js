import { add2d, len2d, line2D, normalize2d, path2D, scale2d, sub2d } from './common.js';
import { perpendicular2d } from './frame.js';

export class Debug {
    static enabled = false;
    static g = null;

    static log(...args) {
        if (!Debug.enabled) { return; }
        console.log(...args);
    }

    static setGraphics(g) {
        this.g = g;
    }

    static resetGraphics() {
        this.g = window;
    }

    static drawFrame(frame2d, lineLength = 20) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;

        const o = frame2d.origin;
        const fEnd = add2d(o, scale2d(frame2d.forward, lineLength));
        const rEnd = add2d(o, scale2d(frame2d.right, lineLength));

        stroke(255, 0, 0);
        this.drawArrow(frame2d.origin, fEnd);
        stroke(0, 255, 0);
        this.drawArrow(frame2d.origin, rEnd);
    }

    static drawHermite2D(hermite, steps = 20, showTangents = false) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;
        steps = Math.max(steps, 2);

        const pts = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            pts.push(hermite.GetPosition(t));
        }

        g.push();

        g.circle(hermite.p0.x, hermite.p0.y, 5);
        g.circle(hermite.p1.x, hermite.p1.y, 5);

        if (showTangents) {
            // Draw start and end tangents as arrows
            this.drawArrow(hermite.p0, add2d(hermite.p0, hermite.m0));
            this.drawArrow(hermite.p1, add2d(hermite.p1, hermite.m1));
        }

        path2D(pts, g);

        g.pop();
    }

    static drawLine2D(p0, p1) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;

        line2D(p0, p1, g);
    }

    static drawDashedLine2D(p0, p1, dashLength = 5) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;

        const dir = sub2d(p1, p0);
        const len = len2d(dir);
        if (len < 0.0001) { return; }
        const dirNorm = normalize2d(dir);
        const numDashes = Math.floor(len / dashLength);
        for (let i = 0; i < numDashes; i += 2) {
            const dashStart = add2d(p0, scale2d(dirNorm, i * dashLength));
            const dashEnd = add2d(p0, scale2d(dirNorm, Math.min((i + 1) * dashLength, len)));
            line2D(dashStart, dashEnd, g);
        }
        
        // Dots at the ends
        g.circle(p0.x, p0.y, dashLength * 0.5);
        g.circle(p1.x, p1.y, dashLength * 0.5);
    }

    static drawPoint(p, pointSize = 5) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;

        g.push();
        g.stroke(180, 180, 180);
        g.circle(p.x, p.y, pointSize);
        g.pop();
    }

    static drawCircle(center, radius) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;

        g.push();
        g.circle(center.x, center.y, radius * 2);
        g.pop();
    }

    static drawArrow(p0, p1, arrowWidth) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;

        line2D(p0, p1, g);
        
        const backDir = sub2d(p0, p1);
        const len = len2d(backDir);
        if (len < 0.0001) { return; }

        arrowWidth = Math.min(arrowWidth || len * 0.3, 10);
        const backDirNorm = normalize2d(backDir);
        const perpDir = perpendicular2d(backDirNorm);

        const arrowP0 = add2d(p1, scale2d(backDirNorm, arrowWidth));
        const arrowP1 = add2d(arrowP0, scale2d(perpDir, arrowWidth * 0.5));
        const arrowP2 = add2d(arrowP0, scale2d(perpDir, -arrowWidth * 0.5));

        line2D(p1, arrowP1, g);
        line2D(p1, arrowP2, g);
    }

    static drawText(text, pos) {
        if (!Debug.enabled) { return; }
        const g = this.g || window;

        g.push();
        g.fill(255);
        g.noStroke();
        g.text(text, pos.x, pos.y);
        g.pop();
    }
}