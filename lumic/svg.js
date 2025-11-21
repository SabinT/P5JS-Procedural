import { Frame2D } from "./frame.js";
import { add2d, sub2d, vec2, TAU } from "./common.js";

export class SVGDrawing {
    constructor(widthMM, heightMM) {
        this.widthMM = widthMM;
        this.heightMM = heightMM;
        this.paths = [];
    }

    addPath(pts, /* vec2 */ remapFromResolution = null) {
        // If remapFromResolution is given, remap points from that resolution to mm
        if (remapFromResolution) {
            const scaleX = this.widthMM / remapFromResolution.x;
            const scaleY = this.heightMM / remapFromResolution.y;
            const scaledPts = pts.map(p => vec2(p.x * scaleX, p.y * scaleY));
            this.paths.push(scaledPts);
        } else {
            this.paths.push(pts);
        }
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