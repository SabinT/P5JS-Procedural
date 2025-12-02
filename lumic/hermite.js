import { vec2, scale2d, normalize2d, line2D } from './common.js';
import { Frame2D } from './frame.js';

export class CubicHermite2D {
    constructor(p0,m0,p1,m1) {
        this.p0 = p0;
        this.m0 = m0;
        this.p1 = p1;
        this.m1 = m1;
    }

    GetPosition(t) {
        const t2 = t * t;
        const t3 = t2 * t;

        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        return vec2(
            h00 * this.p0.x + h10 * this.m0.x + h01 * this.p1.x + h11 * this.m1.x,
            h00 * this.p0.y + h10 * this.m0.y + h01 * this.p1.y + h11 * this.m1.y
        );
    }

    GetTangent(t) {
        const t2 = t * t;

        // First derivative
        const h00 = 6 * t2 - 6 * t;
        const h10 = 3 * t2 - 4 * t + 1;
        const h01 = -6 * t2 + 6 * t;
        const h11 = 3 * t2 - 2 * t;

        return normalize2d(vec2(
            h00 * this.p0.x + h10 * this.m0.x + h01 * this.p1.x + h11 * this.m1.x,
            h00 * this.p0.y + h10 * this.m0.y + h01 * this.p1.y + h11 * this.m1.y
        ));
    }

    GetFrame(t) {
        const position = this.GetPosition(t);
        const tangent = this.GetTangent(t);
        return new Frame2D(position, tangent);
    }

    GetCurvature(t) {
        // Second derivative
        const h00 = 12 * t - 6;
        const h10 = 6 * t - 4;
        const h01 = -12 * t + 6;
        const h11 = 6 * t - 2;

        return normalize2d(vec2(
            h00 * this.p0.x + h10 * this.m0.x + h01 * this.p1.x + h11 * this.m1.x,
            h00 * this.p0.y + h10 * this.m0.y + h01 * this.p1.y + h11 * this.m1.y
        ));
    }

    GetNormal(t) {
        // perpendicular to the tangent
        const tangent = this.GetTangent(t);
        return vec2(-tangent.y, tangent.x);
    }

    GetPoints(segments = 16) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            points.push(this.GetPosition(t));
        }
        return points;
    }

    Draw(segments = 16) {
        push();
        const points = this.GetPoints(segments);
        noFill();
        beginShape();
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            vertex(p.x, p.y);
        }
        endShape();
        pop();
    }

    ToJSONString() {
        return JSON.stringify({
            p0: { x: this.p0.x, y: this.p0.y },
            m0: { x: this.m0.x, y: this.m0.y },
            p1: { x: this.p1.x, y: this.p1.y },
            m1: { x: this.m1.x, y: this.m1.y }
        });
    }

    FitTo(xMin, xMax, yMin, yMax, marginX = 0, marginY = 0) {
        // Compute target inner size
        const targetW = Math.max(0, (xMax - xMin) - 2 * marginX);
        const targetH = Math.max(0, (yMax - yMin) - 2 * marginY);
        if (!(targetW > 0 && targetH > 0)) return this;

        // Sample curve to estimate current bounds (captures overshoot due to tangents)
        const pts = this.GetPoints(64);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }

        const curW = maxX - minX;
        const curH = maxY - minY;
        if (!(curW > 0 || curH > 0)) return this; // degenerate

        // Uniform scale to fit inside target
        const sX = curW > 0 ? (targetW / curW) : Infinity;
        const sY = curH > 0 ? (targetH / curH) : Infinity;
        const s = Math.min(sX, sY);
        if (!Number.isFinite(s) || s <= 0) return this;

        // Centers: curve bounds center -> target box center (margins are symmetric)
        const cx = 0.5 * (minX + maxX);
        const cy = 0.5 * (minY + maxY);
        const dx = 0.5 * (xMin + xMax);
        const dy = 0.5 * (yMin + yMax);

        // Apply affine transform: p' = (p - c) * s + d; m' = m * s
        const txPt = (pt) => vec2((pt.x - cx) * s + dx, (pt.y - cy) * s + dy);
        this.p0 = txPt(this.p0);
        this.p1 = txPt(this.p1);
        this.m0 = scale2d(this.m0, s);
        this.m1 = scale2d(this.m1, s);

        return this;
    }

    Straighten() {
        // Align both tangents to the direction from p0 to p1, preserving their lengths
        const dx = this.p1.x - this.p0.x;
        const dy = this.p1.y - this.p0.y;
        const segLen = Math.hypot(dx, dy);
        if (!(segLen > 1e-12)) return this; // degenerate, keep as-is

        const ux = dx / segLen;
        const uy = dy / segLen;

        const m0Len = Math.hypot(this.m0.x, this.m0.y);
        const m1Len = Math.hypot(this.m1.x, this.m1.y);

        this.m0 = vec2(ux * m0Len, uy * m0Len);
        this.m1 = vec2(ux * m1Len, uy * m1Len);
        return this;
    }

    BendStartTangentDegrees(angle) {
        if (!Number.isFinite(angle)) return this;
        const a = angle * Math.PI / 180;
        const c = Math.cos(a), s = Math.sin(a);
        const x = this.m0.x, y = this.m0.y;
        this.m0 = vec2(c * x - s * y, s * x + c * y);
        return this;
    }

    BendEndTangentDegrees(angle) {
        if (!Number.isFinite(angle)) return this;
        const a = angle * Math.PI / 180;
        const c = Math.cos(a), s = Math.sin(a);
        const x = this.m1.x, y = this.m1.y;
        this.m1 = vec2(c * x - s * y, s * x + c * y);
        return this;
    }

    Scale(s) {
        // Get the center point at t = 0.5
        const center = this.GetPosition(0.5);
        
        // Scale points about the center
        this.p0 = vec2(
            center.x + (this.p0.x - center.x) * s,
            center.y + (this.p0.y - center.y) * s
        );
        
        this.p1 = vec2(
            center.x + (this.p1.x - center.x) * s,
            center.y + (this.p1.y - center.y) * s
        );
        
        // Scale tangent vectors
        this.m0 = scale2d(this.m0, s);
        this.m1 = scale2d(this.m1, s);

        return this;
    }

    static FromJSONString(jsonString) {
        const data = JSON.parse(jsonString);
        return new CubicHermite2D(
            vec2(data.p0.x, data.p0.y),
            vec2(data.m0.x, data.m0.y),
            vec2(data.p1.x, data.p1.y),
            vec2(data.m1.x, data.m1.y)
        );
    }

    static FromObject(obj) {
        return new CubicHermite2D(
            vec2(obj.p0.x, obj.p0.y),
            vec2(obj.m0.x, obj.m0.y),
            vec2(obj.p1.x, obj.p1.y),
            vec2(obj.m1.x, obj.m1.y)
        );
    }
}