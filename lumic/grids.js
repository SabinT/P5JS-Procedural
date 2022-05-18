/**
 * Renders custom stuff on a grid
 * @param {*} options
 *  Example:
 *   const gridOptions = {
 *      rows: 8,
 *      cols: 8,
 *      margin: 10,
 *      debug: false,
 *      renderCell: (row, col, w, h, options) => { doStuff(); },
 *      scale: 1
 *   };
 */
 export function renderGrid(options) {
    const margin = options.margin || 0;
    const innerScale = options.scale || 1;
    const dx = (width - 2 * margin) / options.cols;
    const dy = (height - 2 * margin) / options.rows;

    const r = min (dx, dy);

    for (let i = 0;  i < options.rows; i++) {
        for (let j = 0; j < options.cols; j++) {
            const x =  margin + dx * (j + 0.5);
            const y = margin + dy * (i + 0.5);

            push();
            translate(x,y);
            scale(innerScale);

            if (options.debug) {
                rectMode(CENTER);
                noFill();
                stroke(255);
                circle (0,0,r);
                rect(0,0,dx,dy);
            }

            if (options.renderCell) {
                options.renderCell(i, j, dx, dy, options);
            }

            pop();
        }
    }
}