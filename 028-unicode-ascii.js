import * as debug from "./lumic/debugutils.js";

// let devnagariString = "अआइईउऊऋऌऍऎएऐऑऒओऔकखगघङचछजझञटठडढणतथदधनऩपफबभमयरऱलळऴवशषसहऽॐक़ख़ग़ज़ड़ढ़फ़य़ॠॡॢॣ०१२३४५६७८९॰ॱॲॳॴॵॶॷॸॹॺॻॼॽॾॿऀँंःऄअआइईउऊऋऌऍऎएऐऑऒओऔकखगघङचछजझञटठडढणतथदधनऩपफबभमयरऱलळऴवशषसहऽॾॿ";
// Removed chars: ॽ
let devnagariString = "अआइईउऊऋऌऍऎएऐऑऒओऔकखगघङचछजझञटठडढणतथदधनऩपफबभमयरऱलळऴवशषसहऽॐक़ख़ग़ज़ड़ढ़फ़य़ॠॡॢॣ०१२३४५६७८९॰ॱॲॳॴॵॶॷॸॹॺॻॼॾॿऀँंःऄअआइईउऊऋऌऍऎएऐऑऒओऔकखगघङचछजझञटठडढणतथदधनऩपफबभमयरऱलळऴवशषसहऽॾॿ";
// let charArray = devnagariString.split("");

// BUG 
let charArray = [
    "अ", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ऌ", "ऍ", "ऎ", "ए", "ऐ", "ऑ", "ऒ", "ओ", "औ", "अं", "अः", "क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न", "ऩ", "प", "फ", "ब", "भ", "म", "य", "र", "ऱ", "ल", "ळ", "ऴ", "व", "श", "ष", "स", "ह", "ऽ", "ॐ", "क़", "ख़", "ग़", "ज़", "ड़", "ढ़", "फ़", "य़", "ॠ", "ॡ", "ॢ", "ॣ", "०", "१", "२", "३", "४", "५", "६", "७", "८", "९", "॰", "ॱ", "ॲ", "ॳ", "ॴ", "ॵ", "ॶ", "ॷ", "ॸ", "ॹ", "ॺ", "ॻ", "ॼ", "ॽ", "ॾ", "ॿ", "ऀ", "ँ", "ं", "ः", "ऄ", "अँ", "अं", "अः", "अ़", "क्क", "ख्ख", "ग्ग", "घ्घ", "ङ्क्क", "च्च", "छ्छ", "ज्ज", "झ्झ", "ञ्च", "ञ्छ", "ट्ट", "ठ्ठ", "ड्ड", "ढ्ढ", "ण्ण", "त्त", "थ्थ", "द्द", "ध्ध", "न्न", "प्प", "फ्फ", "ब्ब", "भ्भ", "म्म", "य्य", "र्र", "ऱ्ऱ", "ल्ल", "ळ्ळ", "ऴ्व", "श्श", "ष्ष", "स्स", "ह्ह", "ऽऽ", "ॐऽ", "क़्क", "ख़्ख", "ग़्ग", "ज़्ज", "ड़्ड", "ढ़्ढ", "फ़्फ", "य़्य", "ॠ्र", "ॡ्र", "ॢर", "ॣर", "अ॑", "अ॒", "का", "कि", "की", "कु", "कू", "कृ", "कॄ", "के", "कॆ", "कै", "कॉ", "कॊ", "को", "कौ", "क्", "कँ", "कं", "कः", "क़", "क़ा", "क़ि", "क़ी", "क़ु", "क़ू", "क़ृ", "क़ॄ",
    "क़े", "क़ॆ", "क़ै", "क़ॉ", "क़ॊ", "क़ो", "क़ौ", "क़्", "क़ं", "क़ः", "खा", "खि", "खी", "खु", "खू", "खृ", "खॄ", "खे", "खॆ", "खै", "खॉ", "खॊ", "खो", "खौ", "ख्", "खँ", "खं", "खः", "गा", "गि", "गी", "गु", "गू", "गृ", "गॄ", "गे", "गॆ", "गै", "गॉ", "गॊ", "गो", "गौ", "ग्", "गँ", "गं", "गः", "घा", "घि", "घी", "घु", "घू", "घृ", "घॄ", "घे", "घॆ", "घै", "घॉ", "घॊ", "घो", "घौ", "घ्", "घँ", "घं", "घः", "ङा", "ङि", "ङी", "ङु", "ङू", "चा", "चि", "ची", "चु", "चू", "चृ", "चॄ", "चे", "चॆ", "चै", "चॉ", "चॊ", "चो", "चौ", "च्", "चँ", "चं", "चः", "छा", "छि", "छी", "छु", "छू", "छृ", "छॄ", "छे", "छॆ", "छै", "छॉ", "छॊ", "छो", "छौ", "छ्", "छँ", "छं", "छः", "जा", "जि", "जी", "जु", "जू", "जृ", "जॄ", "जे", "जॆ", "जै", "जॉ", "जॊ", "जो", "जौ", "ज्", "जँ", "जं", "जः", "झा", "झि", "झी", "झु", "झू", "झृ", "झॄ", "झे", "झॆ", "झै", "झॉ", "झॊ", "झो", "झौ", "झ्", "झँ", "झं", "झः", "ञा", "ञि", "ञी", "ञु", "ञू", "टा", "टि", "टी", "टु", "टू", "टृ", "टॄ", "टे", "टॆ", "टै", "टॉ", "टॊ", "टो", "टौ",
    "ट्", "टँ", "टं", "टः", "ठा", "ठि", "ठी", "ठु", "ठू", "ठृ", "ठॄ", "ठे", "ठॆ", "ठै", "ठॉ", "ठॊ", "ठो", "ठौ", "ठ्", "ठँ", "ठं", "ठः", "डा", "डि", "डी", "डु", "डू", "डृ", "डॄ", "डे", "डॆ", "डै", "डॉ", "डॊ", "डो", "डौ", "ड्", "डँ", "डं", "डः", "ढा", "ढि", "ढी", "ढु", "ढू", "ढृ", "ढॄ", "ढे", "ढॆ", "ढै", "ढॉ", "ढॊ", "ढो", "ढौ", "ढ्", "ढँ", "ढं", "ढः", "णा", "णि", "णी", "णु", "णू", "ता", "ति", "ती", "तु", "तू", "तृ", "तॄ", "ते", "तॆ", "तै", "तॉ", "तॊ", "तो", "तौ", "त्", "तँ", "तं", "तः", "था", "थि", "थी", "थु", "थू", "थृ", "थॄ", "थे", "थॆ", "थै", "थॉ", "थॊ", "थो", "थौ", "थ्", "थँ", "थं", "थः", "दा", "दि", "दी", "दु", "दू", "दृ", "दॄ", "दे", "दॆ", "दै", "दॉ", "दॊ", "दो", "दौ", "द्", "दँ", "दं", "दः", "धा", "धि", "धी", "धु", "धू", "धृ", "धॄ", "धे", "धॆ", "धै", "धॉ", "धॊ", "धो", "धौ", "ध्", "धँ", "धं", "धः", "ना", "नि", "नी", "नु", "नू", "नृ", "नॄ", "ने", "नॆ", "नै", "नॉ", "नॊ", "नो", "नौ", "न्", "नँ", "नं", "नः", "ऩा", "ऩि", "ऩी", "ऩु", "ऩू", "पा", "पि", "पी", "पु", "पू", "पृ", "पॄ", "पे", "पॆ", "पै", "पॉ", "पॊ", "पो", "पौ", "प्", "प",
    "ट्", "टँ", "टं", "टः", "ठा", "ठि", "ठी", "ठु", "ठू", "ठृ", "ठॄ", "ठे", "ठॆ", "ठै", "ठॉ", "ठॊ", "ठो", "ठौ",
    "ठ्", "ठँ", "ठं", "ठः", "डा", "डि", "डी", "डु", "डू", "डृ", "डॄ", "डे", "डॆ", "डै", "डॉ", "डॊ", "डो", "डौ",
    "ड्", "डँ", "डं", "डः", "ढा", "ढि", "ढी", "ढु", "ढू", "ढृ", "ढॄ", "ढे", "ढॆ", "ढै", "ढॉ", "ढॊ", "ढो", "ढौ",
    "ढ्", "ढँ", "ढं", "ढः", "णा", "णि", "णी", "णु", "णू", "ता", "ति", "ती", "तु", "तू", "तृ", "तॄ", "ते", "तॆ",
    "तै", "तॉ", "तॊ", "तो", "तौ", "त्", "तँ", "तं", "तः", "था", "थि", "थी", "थु", "थू", "थृ", "थॄ", "थे", "थॆ",
    "थै", "थॉ", "थॊ", "थो", "थौ", "थ्", "थँ", "थं", "थः", "दा", "दि", "दी", "दु", "दू", "दृ", "दॄ", "दे", "दॆ",
    "दै", "दॉ", "दॊ", "दो", "दौ", "द्", "दँ", "दं", "दः", "धा", "धि", "धी", "धु", "धू", "धृ", "धॄ", "धे", "धॆ",
    "धै", "धॉ", "धॊ", "धो", "धौ", "ध्", "धँ", "धं", "धः", "ना", "नि", "नी", "नु", "नू", "नृ", "नॄ", "ने", "नॆ",
    "नै", "नॉ", "नॊ", "नो", "नौ", "न्", "नँ", "नं", "नः", "ऩा", "ऩि", "ऩी", "ऩु", "ऩू", "पा", "पि", "पी", "पु",
    "पू", "पृ", "पॄ", "पे", "पॆ", "पै", "पॉ", "पॊ", "पो", "पौ", "प्", "पँ", "पं", "पः", "फा", "फि", "फी", "फु",
    "फू", "फृ", "फॄ", "फे", "फॆ", "फै", "फॉ", "फॊ", "फो", "फौ", "फ्", "फँ", "फं", "फः", "बा", "बि", "बी",
    "बु", "बू", "बृ", "बॄ", "बे", "बॆ", "बै", "बॉ", "बॊ", "बो", "बौ", "ब्", "बँ", "बं", "बः", "भा", "भि", "भी", "भु",
    "भू", "भृ", "भॄ", "भे", "भॆ", "भै", "भॉ", "भॊ", "भो", "भौ", "भ्", "भँ", "भं", "भः", "मा", "मि", "मी", "मु", "मू",
    "मृ", "मॄ", "मे", "मॆ", "मै", "मॉ", "मॊ", "मो", "मौ", "म्", "मँ", "मं", "मः", "या", "यि", "यी", "यु", "यू", "यृ",
    "यॄ", "ये", "यॆ", "यै", "यॉ", "यॊ", "यो", "यौ", "य्", "यँ", "यं", "यः", "रा", "रि", "री", "रु", "रू", "रृ", "रॄ", "रे",
    "रॆ", "रै", "रॉ", "रॊ", "रो", "रौ", "र्", "रँ", "रं", "रः", "ऱा", "ऱि", "ऱी", "ऱु", "ऱू", "ला", "लि", "ली", "लु", "लू",
    "लृ", "लॄ", "ले", "लॆ", "लै", "लॉ", "लॊ", "लो", "लौ", "ल्", "लँ", "लं", "लः", "वा", "वि", "वी", "वु", "वू", "वृ", "वॄ", "वे", "वॆ", "वै",
    "वॉ", "वॊ", "वो", "वौ", "व्", "वँ", "वं", "वः", "शा", "शि", "शी", "शु", "शू", "शृ", "शॄ", "शे", "शॆ", "शै", "शॉ", "शॊ",
    "शो", "शौ", "श्", "शँ", "शं", "शः", "षा", "षि", "षी",
    "षु", "षू", "षृ", "षॄ", "षे", "षॆ", "षै", "षॉ", "षॊ", "षो", "षौ", "ष्", "षँ", "षं", "षः", "सा", "सि", "सी", "सु", "सू", "सृ", "सॄ", "से", "सॆ", "सै", "सॉ", "सॊ", "सो", "सौ", "स्", "सँ", "सं", "सः", "हा", "हि", "ही", "हु", "हू", "हृ", "हॄ", "हे", "हॆ", "है", "हॉ", "हॊ", "हो", "हौ", "ह्", "हँ", "हं", "हः"
]

// List of devnagari consonants
let kaKhaGa = ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण",
    "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श", "ष", "स", "ह",
    "क्ष", "त्र", "ज्ञ"
];


const w = 1080;
const h = 1080;

const screenW = w;
const screenH = h;

const textScale = 0.9;

let g;
let charCanvas;
let imageCanvas;
let charsSortedByCoverage = [];

function remapBrightness(x) {
    return Math.pow(x, 4.5);
}

// Draw a unicode character, and find how many pixels are filled in
// Return "coverage" as a number between 0 and 1
function getCharCoverage(char) {
    charCanvas.background(0);
    charCanvas.fill(255);
    charCanvas.textSize(100);
    charCanvas.textAlign(CENTER, CENTER);
    charCanvas.text(char, 50, 50);

    let totalPixels = 0;
    let filledPixels = 0;

    charCanvas.loadPixels();
    for (let i = 0; i < charCanvas.pixels.length; i += 4) {
        let r = charCanvas.pixels[i];

        if (r > 0) {
            filledPixels++;
        }

        totalPixels++;
    }

    return filledPixels / totalPixels;
}

function sortCharsByCoverage() {
    let tmpArray = [];

    for (let i = 0; i < charArray.length; i++) {
        let char = charArray[i];
        let coverage = getCharCoverage(char);
        tmpArray.push({ char: char, coverage: coverage });
    }

    tmpArray.sort((a, b) => {
        return a.coverage - b.coverage;
    });

    // Copy only the characters into the sorted array
    charsSortedByCoverage = [];
    for (let i = 0; i < tmpArray.length; i++) {
        charsSortedByCoverage.push(tmpArray[i].char);
    }

    console.log(charsSortedByCoverage.join(""))
}

// Draw a simple gradient
function drawGradient(g) {
    g.background(0);
    g.noStroke();

    for (let i = 0; i < g.height; i++) {
        let y = i / g.height;
        g.fill(255 * y);
        g.rect(0, i, g.width, 1);
    }
}

// Black in center, white on edges
function circleGradient(g) {
    g.background(0);
    g.noStroke();

    let cx = g.width / 2;
    let cy = g.height / 2;

    const start = g.height - 8;
    const end = 0;
    for (let i = start; i > end; i--) {
        let y = i / g.height;
        let r = y * g.height / 2;
        let brightness = map(i, start, end, 1, 0) * 255;
        g.fill(brightness);
        g.circle(cx, cy, 2 * r);
    }
}

let startTime;
window.setup = function () {
    g = createGraphics(w, h);
    createCanvas(screenW, screenH);
    pixelDensity(1);

    charCanvas = createGraphics(100, 100);
    imageCanvas = createGraphics(w / 30, h / 30);
    imageCanvas.pixelDensity(1);

    circleGradient(imageCanvas);

    sortCharsByCoverage();

    startTime = millis();
};

window.draw = function () {
    background(0);

    makeCharacterArt();

    image(g, 0, 0, screenW, screenH);

    if (mouseIsPressed) {
        // Draw a zoomed in view
        debug.drawFullZoomSection(g, 200);
    }
};

// Make ASCII art using pixels from the gradient in imageCanvas
function makeCharacterArt() {
    // Draw a different character on the image canvas based on time
    // 1 second per character
    let t = (millis() - startTime) / 1000;
    let charIndex = Math.floor(t) % kaKhaGa.length;

    let char = kaKhaGa[charIndex];
    //imageCanvas.clear();
    circleGradient(imageCanvas);



    // Draw the character
    // imageCanvas.fill(255);
    // imageCanvas.textSize(10);
    // imageCanvas.textAlign(CENTER, CENTER);
    // console.log(char)
    // imageCanvas.text("x", imageCanvas.width / 2, image.height / 2);

    g.background(0);
    // g.image(imageCanvas, 0, 0)

    imageCanvas.loadPixels();
    let gridW = imageCanvas.width;
    let gridH = imageCanvas.height;
    let cellW = g.width / gridW;
    let cellH = g.height / gridH;

    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            let i = (y * gridW + x) * 4;
            let r = imageCanvas.pixels[i] / 255;

            let b = remapBrightness(r);

            // slightly jitter
            const jitter = 0.02;
            const t = 0.1 * millis() / 1000;
            b += noise(x, y - t) * jitter - jitter / 2;

            // Find the appropriate character to use
            let charIndex = Math.floor(b * charsSortedByCoverage.length);
            let char = charsSortedByCoverage[charIndex];

            // Find center of cell
            let cx = x * cellW + cellW / 2;
            let cy = y * cellH + cellH / 2;

            // Draw the character
            g.fill(255);
            g.textSize(cellW * textScale);
            g.textAlign(CENTER, CENTER);
            g.text(char, cx, cy);
        }
    }
}

