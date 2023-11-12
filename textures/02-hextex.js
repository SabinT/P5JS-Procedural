const hexString = "0123456789ABCDEF";

let font;

window.preload = function () {
    font = loadFont("assets/fonts/joystix/joystix monospace.otf");
    // font = loadFont("assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Regular.ttf");
}

window.setup = function () {
    createCanvas(256 * 16, 256);
}

window.draw = function () {
    // line at top and bottom
    background(0);

    stroke(255);
    strokeWeight(20);

    line(0, 0, width, 0);
    line(0, height, width, height);

    noStroke()
    // draw hexes
    const fontSize = 128;
    textSize(fontSize);
    textAlign(CENTER, CENTER);
    textFont(font);

    const hexes = hexString.split("");
    const hexWidth = width / hexes.length;

    for (let i = 0; i < hexes.length; i++) {
        const hex = hexes[i];
        const x = i * hexWidth + hexWidth / 2;
        const y = height / 2;

        fill(255);
        text(hex, x, y - 20);
    }    
}
