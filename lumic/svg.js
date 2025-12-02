import { Frame2D } from "./frame.js";
import { add2d, sub2d, vec2, TAU } from "./common.js";

export class SVGDrawing {
    constructor(widthMM, heightMM) {
        this.widthMM = widthMM;
        this.heightMM = heightMM;
        this.paths = [];
        // Track bounding box in mm space
        this._bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    }

    _extendBBox(pts) {
        for (const p of pts) {
            if (!p) continue;
            if (p.x < this._bbox.minX) this._bbox.minX = p.x;
            if (p.y < this._bbox.minY) this._bbox.minY = p.y;
            if (p.x > this._bbox.maxX) this._bbox.maxX = p.x;
            if (p.y > this._bbox.maxY) this._bbox.maxY = p.y;
        }
    }

    _recomputeBBox() {
        this._bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        for (const path of this.paths) { this._extendBBox(path); }
    }

    addPath(pts, /* vec2 */ remapFromResolution = null) {
        // If remapFromResolution is given, remap points from that resolution to mm
        if (remapFromResolution) {
            const scaleX = this.widthMM / remapFromResolution.x;
            const scaleY = this.heightMM / remapFromResolution.y;
            const scaledPts = pts.map(p => vec2(p.x * scaleX, p.y * scaleY));
            this.paths.push(scaledPts);
            this._extendBBox(scaledPts);
        } else {
            this.paths.push(pts);
            this._extendBBox(pts);
        }
    }

    // Uniformly scale + center all paths to fit inside the SVG (widthMM/heightMM) with margin (in mm)
    // margin: distance from edges after fitting
    scaleContentsToFit(margin = 0) {
        this._recomputeBBox();
        const { minX, minY, maxX, maxY } = this._bbox;
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return; // nothing to scale
        const srcW = Math.max(1e-9, maxX - minX);
        const srcH = Math.max(1e-9, maxY - minY);
        const tgtW = Math.max(0, this.widthMM - 2 * margin);
        const tgtH = Math.max(0, this.heightMM - 2 * margin);
        if (tgtW <= 0 || tgtH <= 0) return;
        const scale = Math.min(tgtW / srcW, tgtH / srcH);
        // After scaling, compute offset to center within target rect
        const scaledW = srcW * scale;
        const scaledH = srcH * scale;
        const offsetX = margin + (tgtW - scaledW) * 0.5;
        const offsetY = margin + (tgtH - scaledH) * 0.5;
        for (let pi = 0; pi < this.paths.length; pi++) {
            const path = this.paths[pi];
            for (let i = 0; i < path.length; i++) {
                const p = path[i];
                const nx = (p.x - minX) * scale + offsetX;
                const ny = (p.y - minY) * scale + offsetY;
                path[i] = vec2(nx, ny);
            }
        }
        this._recomputeBBox();
    }

    // Add a closed rectangle outline along the SVG edges (in mm)
    addOutline() {
        const pts = [
            vec2(0, 0),
            vec2(this.widthMM, 0),
            vec2(this.widthMM, this.heightMM),
            vec2(0, this.heightMM),
            vec2(0, 0), // close
        ];
        this.addPath(pts);
    }

    save(filename = 'drawing.svg') {
        const svgString = this.getSVGString();
        if (typeof document === 'undefined') {
            console.warn('saveAsSVG: document is not available; returning SVG string instead.');
            return svgString;
        }
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return svgString;
    }

    getSVGString() {
        const pathFragments = this.paths
            .filter(path => path && path.length > 0)
            .map(path => {
                const d = path
                    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(3)} ${point.y.toFixed(3)}`)
                    .join(' ');
                return `    <path d="${d}" fill="none" stroke="black" stroke-width="0.5"/>`;
            })
            .join('\n');

        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            `<svg xmlns="http://www.w3.org/2000/svg" width="${this.widthMM}mm" height="${this.heightMM}mm" viewBox="0 0 ${this.widthMM} ${this.heightMM}" version="1.1">`,
            pathFragments,
            '</svg>'
        ].join('\n');
    }
}