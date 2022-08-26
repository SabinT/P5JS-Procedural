export function setShadow(g, offsetX = 2, offsetY = -2, blur = 10, col = "#000000") {
    if (!g) { g = window; }
    g.drawingContext.shadowOffsetX = 2;
    g.drawingContext.shadowOffsetY = -2;
    g.drawingContext.shadowBlur = 10;
    g.drawingContext.shadowColor = "#142108";
}