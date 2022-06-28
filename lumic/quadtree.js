import { vec2, vec4 } from "./common.js";


const Quadrant = {
    None : -1,
    BottomRight : 0,
    TopRight : 1,
    TopLeft : 2,
    BottomLeft : 3,
};
Object.freeze(Quadrant);

const MAX_OBJECTS = 2;
    
function CheckOverlap(a, b) {
    // z = x2, w = y2
    return (
        a.x < b.z &&
        a.z > b.x &&
        a.y < b.w &&
        a.w > b.y
    );
}

/**
 * Each quad's coverage is [x1, y1] to (x2, y2)
 * i.e., start is included, end is excluded.
 * </summary>
 */
export class QuadTree {
    constructor(maxLevels, bounds, debug = false) {
        this.objects = [] // tuple of object, bounds
        this.childTrees = [null, null, null, null]
        this.maxLevels = maxLevels;
        this.boundingBox =  bounds;
        this.debug = debug
    }

    Insert(o, bounds) {
        // Pass down the tree, if children exist
        if (this.childTrees[0] !== null) {
            const q = this.GetQuadrant(bounds);

            if (q !== Quadrant.None) {
                this.childTrees[q].Insert(o, bounds);
                return;
            }
        }

        // Either this quad is not split, or the object doesn't exactly fit in a sub-quad. 
        this.objects.push({ object: o, bounds: bounds});

        if (this.childTrees[0] === null &&
            this.objects.length > MAX_OBJECTS &&
            this.maxLevels > 0) {
            // Too many objects? Split, and move objects to inner quadrants
            this.Split();

            const oldObjects = this.objects;
            this.objects = []

            for (const x of oldObjects)
            {
                // Find the appropriate child quadtree, if possible
                const q = this.GetQuadrant(x.bounds);

                if (q !== Quadrant.None) {
                    this.childTrees[q].Insert(x.object, x.bounds);
                }
                else {
                    this.objects.push(x);
                }
            }
        }
    }

    // Whether the given bounds completely lies within current bounds.
    CheckInside(b) {
        const x1 = this.boundingBox.x;
        const x2 = this.boundingBox.z;
        const y1 = this.boundingBox.y;
        const y2 = this.boundingBox.w;

        return b.x >= x1 && b.z < x2
            && b.y >= y1 && b.w < y2;
    }

    /// <summary>
    /// Return the objects whose bounds overlap with supplied bounds.
    /// </summary>
    /// <param name="bounds"></param>
    /// <returns></returns>
    GetOverlappingObjects(bounds) {
        // If there are children, ask children first
        let overlap = [];

        const q = this.GetQuadrant(bounds);

        if (q !== Quadrant.None) {
            // Bounds fits completely in one of the quadrants, recurse
            const innerOverlap = this.childTrees[q].GetOverlappingObjects(bounds);
            overlap = overlap.concat(innerOverlap);
            const b = this.childTrees[q].boundingBox;

            if (this.debug) {
                drawDebugQuad(b, color(80,80,255,70));
            }
        } else {
            // Either no subtrees left, or bounds doesn't completely fit in a quadrant
            for(const child of this.childTrees) {
                if (child !== null && CheckOverlap(child.boundingBox, bounds)) {
                    const innerOverlap = child.GetOverlappingObjects(bounds);
                    overlap = overlap.concat(innerOverlap);          
                    
                    if (this.debug) {
                        const b = child.boundingBox;
                        drawDebugQuad(b, color(80,255,80,40))
                    }
                }
            }
        }

        for (const x of this.objects) {
            if (this.debug) {
                fill(color(255,80,255,50))
                circle(x.object.center.x, x.object.center.y, x.object.radius * 1.5);
                noFill()
            }

            if (CheckOverlap(x.bounds, bounds)) {
                overlap.push(x.object);
            }
        }

        return overlap;
    }

    Draw() {
        stroke(255 - this.maxLevels * 10);
        noFill();

        const b = this.boundingBox;

        rect(b.x, b.y, b.z - b.x, b.w - b.y);

        if (this.childTrees[0] != null) {
            for (const qt of this.childTrees)
            {
                qt.Draw()
            }
        }
    }

    GetCenter() {
        const cx = (this.boundingBox.x + this.boundingBox.z) / 2;
        const cy = (this.boundingBox.y + this.boundingBox.w) / 2;
        return vec2(cx, cy);
    }

    GetQuadrant(bounds) {
        for (let i = 0; i < 4; i++) {
            if (this.childTrees[i] !== null && this.childTrees[i].CheckInside(bounds)) {
                return i;
            }
        }

        return Quadrant.None;
    }

    Split() {
        const c = this.GetCenter();

        const hw = (this.boundingBox.z - this.boundingBox.x) / 2;
        const hh = (this.boundingBox.w - this.boundingBox.y) / 2;

        const q1 = vec4(c.x, c.y, c.x + hw, c.y + hh);
        const q2 = vec4(c.x, c.y - hh, c.x + hw, c.y);
        const q3 = vec4(c.x - hw, c.y - hh, c.x, c.y);
        const q4 = vec4(c.x - hw, c.y, c.x, c.y + hh);

        // Create 4 new quadtrees
        this.childTrees[Quadrant.TopRight] = new QuadTree(this.maxLevels - 1, q1, this.debug);
        this.childTrees[Quadrant.BottomRight] = new QuadTree(this.maxLevels - 1, q2, this.debug);
        this.childTrees[Quadrant.BottomLeft] = new QuadTree(this.maxLevels - 1, q3, this.debug);
        this.childTrees[Quadrant.TopLeft] = new QuadTree(this.maxLevels - 1, q4, this.debug);
    }
};

const debugMargin = 1;
function drawDebugQuad(b, col) {
    fill(col ?? color(50, 80, 255, 50));
    noStroke();
    rectMode(CORNERS);
    rect(b.x + debugMargin, b.y + debugMargin, b.z - debugMargin, b.w - debugMargin);
    noFill();
}
