import { add2d, line2D, path2D, scale2d } from './common.js';

export class Debug {
    static enabled = false;

    static drawFrame(frame2d, lineLength = 20, g = null) {
        if (!Debug.enabled) { return; }
        g = g || window;

        const o = frame2d.origin;
        const fEnd = add2d(o, scale2d(frame2d.forward, lineLength));
        const rEnd = add2d(o, scale2d(frame2d.right, lineLength));

        stroke(255, 0, 0);
        line2D(frame2d.origin, fEnd, g);
        stroke(0, 255, 0);
        line2D(frame2d.origin, rEnd, g);
    }

    static drawHermite2D(hermite, steps = 20, g = null) {
        if (!Debug.enabled) { return; }
        g = g || window;
        steps = Math.max(steps, 2);

        const pts = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            pts.push(hermite.GetPosition(t));
        }

        // Draw the end points as small circles
        g.fill(0, 0, 0);
        g.stroke(180, 180, 180);
        g.circle(hermite.p0.x, hermite.p0.y, 5);
        g.circle(hermite.p1.x, hermite.p1.y, 5);

        path2D(pts, g);
    }

    static drawLine2D(p0, p1, g = null) {
        if (!Debug.enabled) { return; }
        g = g || window;

        line2D(p0, p1, g);
    }
}