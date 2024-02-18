import { PI, vec2 } from "./lumic/common.js";
import { Polygon } from "./lumic/geomerty.js";
import { hexToCartesianOddr } from "./lumic/hex.js";

const w = 800;
const h = 1000;
let gridSize = 10;
let isHexGrid = true;

window.setup = function () {
    createCanvas(w, h);
};

window.draw = function () {
    background(220);
    isHexGrid = document.getElementById('gridType').checked;
    if (isHexGrid) {
        drawHexGrid();
    } else {
        drawSquareGrid();
    }
};

function resize() {
    const aspectRatio = parseFloat(document.getElementById('aspectRatio').value);
    const defaultHeight = 1000;
    const widthByHeight = defaultHeight / aspectRatio;
    resizeCanvas(widthByHeight, defaultHeight);
}

const drawSquareGrid = () => {
    background(255);

    const cellSize = Math.min(width, height) / gridSize;

    stroke(150);
    for (let x = 0; x <= width; x += cellSize) {
        line(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
        line(0, y, width, y);
    }

    noLoop();
};

const drawHexGrid = () => {
    const cellSize = Math.min(width, height) / gridSize;
    const hexRadius = cellSize / 2;
    
    const hexHeightOddr = hexRadius * Math.tan(PI / 3);

    stroke(0);

    // Pointy side up hex at origin
    const hex = new Polygon(vec2(0, 0), hexRadius, 6, PI / 6);

    let padding = 4;
    let nx = Math.ceil(width / cellSize) + padding;
    let ny = Math.ceil(height / hexHeightOddr) + padding;

    // Make both nx,ny even
    if (nx % 2 === 1) nx++;
    if (ny % 2 === 1) ny++;

    push();

    translate(width / 2, height / 2);

    for (let x = -nx / 2; x <= nx / 2; x++) {
        for (let y = -ny / 2; y <= ny / 2; y++) {
            const p = hexToCartesianOddr(vec2(x, y), hexRadius);
            hex.center = p;

            stroke(150);
            hex.draw();

            // radial lines
            stroke(150);
            const pts = hex.getPoints();
            for (let i = 0; i < pts.length; i++) {
                line(p.x, p.y, pts[i].x, pts[i].y);
            }
        }
    }

    pop();
};

const printGridButtonHandler = () => {
    let canvasData = canvas.toDataURL("image/png");
    let link = document.createElement('a');
    link.href = canvasData;
    link.download = 'grid.png';
    link.click();
};

const updateGrid = () => {
    resize();
    gridSize = parseInt(document.getElementById('gridSize').value);
    redraw();
};

const createGridButtonHandler = () => {
    updateGrid();
};

document.getElementById('createButton').addEventListener('click', createGridButtonHandler);

document.getElementById('printButton').addEventListener('click', printGridButtonHandler);

const aspectRatioButtons = document.getElementsByClassName('aspect-ratio-btn');
for (let button of aspectRatioButtons) {
    button.addEventListener('click', function () {
        const ratio = this.getAttribute('data-ratio');
        document.getElementById('aspectRatio').value = ratio;
    });
}
