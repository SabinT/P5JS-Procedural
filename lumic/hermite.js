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