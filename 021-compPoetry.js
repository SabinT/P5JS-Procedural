import * as m from "./lumic/mandala.js";
import { getPixelBrightness, getBrightness } from "./lumic/image.js";
import * as pal from "./lumic/palettes.js";
import { Polygon } from "./lumic/geomerty.js";
import { getRandom, RAD2DEG, TAU, vec2 } from "./lumic/common.js";
import { setShadow } from "./lumic/context.js";
import * as debug from "./lumic/debugutils.js";

const theme = pal.vibrantTheme;
const countryList = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua & Deps",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Rep",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "South Korea",
  "North Korea",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macedonia",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russian Federation",
  "Rwanda",
  "St Kitts & Nevis",
  "St Lucia",
  "Saint Vincent & the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome & Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad & Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

let defaultFont;
let typewriter;
let typewriterBold;
window.preload = function () {
  defaultFont = loadFont("assets/fonts/Anonymous_Pro/AnonymousPro-Regular.ttf");
  typewriter = loadFont("assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Regular.ttf");
  typewriterBold = loadFont("assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Bold.ttf");
};

const numCells1 = 51;
const numCells2 = 51;
const numCells3 = 49;

const w = 6000;
const hw = w / 2;
const h = 8000;
const hh = h / 2;

const unmatchRThreshold = hw * 0.8;

let g;

let poem = "the.world.is.a.beautiful.place.to.be.lost.in.";
let unpoem = "." + countryList.join(".").toLowerCase() + ".";

// poem = poem.toUpperCase();
unpoem = unpoem.toUpperCase();

console.log("unpoem length", unpoem.length);

const polySides = 10;

function renderMandala1() {
  background(0);

  push();
  translate(width / 2, height / 2);
  scale(5);
  fill("white");
  stroke("white");
  const settings = { count: polySides, shape: true, angleShift: 0.5 };

  const rStep = width / 40;
  const r1 = width / 40;

  m.drawRing(r1, r1 + rStep, m.diamondSegment, settings);
  m.drawRing(r1 + rStep, r1 + 2 * rStep, m.diamondSegment, settings);
  pop();
}

function renderMandala2() {
  background(0);

  push();
  translate(width / 2, height / 2);
  scale(5);
  fill("white");
  stroke("white");

  m.cCircle((width / 40) * 0.8);

  pop();
}

function sampleAndDraw(poem, divisions, drawFn, maxCount, paddingCells = 0) {
  let charIndex = 0;
  let step = width / divisions;
  loadPixels();
  let lastMatchStep = 0;
  let stepCount = 0;
  let matchCount = 0;
  let unmatchCount = 0;
  for (let y = 0; y < height; y += step) {
    if (y < paddingCells * step || y > height - paddingCells * step) {
      continue;
    }

    for (let x = 0; x < width; x += step) {
      if (x < paddingCells * step || x > width - paddingCells * step) {
        continue;
      }

      if (matchCount >= maxCount) {
        break;
      }

      const c = getBrightness(Math.floor(x), Math.floor(y));
      if (c > 200) {
        let char = poem[charIndex];
        if (char == "." && lastMatchStep + 1 < stepCount) {
          charIndex = (charIndex + 1) % poem.length;
          char = poem[charIndex];
        }
        drawFn(poem[charIndex], x, y, true, matchCount, unmatchCount);
        charIndex = (charIndex + 1) % poem.length;
        lastMatchStep = stepCount;
        matchCount++;
      } else {
        const char = unpoem[unmatchCount % unpoem.length];
        drawFn(char, x, y, false, matchCount, unmatchCount);
        unmatchCount++;
      }
      stepCount++;
    }
  }
  console.log("totalMatch", matchCount);
  console.log("unmatched", unmatchCount);
}

window.setup = function () {
  createCanvas(900, 1200);
  g = createGraphics(w, h);
  g.pixelDensity(1);
  g.background(255);
  pixelDensity(1);

  bgStuff1();
  bgStuff2();

  const texter = (
    drawMatched,
    drawUnmatched,
    fontSize,
    font,
    colorMode = 1
  ) => {
    return (c, x, y, match, matchCount, unmatchCount) => {
      const lowX = x;
      const lowY = y;
      x = (x / width) * w;
      y = (y / height) * h;

      let col;

      if (colorMode === 1) {
        const angle = Math.atan2(x - w / 2, y - h / 2);
        let i = Math.floor((angle / TAU) * polySides + 0.5);
        i = (i + polySides) % polySides;
        col = match ? pal.getColor(theme, i) : color(random(220, 250));
      } else {
        const r = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2);

        // Color as rings from center
        const i = Math.floor((r * hw) / width);
        col = pal.getColor(theme, i);
      }

      g.stroke(col);
      g.fill(col);
      // g.noStroke();
      g.strokeWeight(0.5);
      g.textFont(font || defaultFont);
      g.textSize(fontSize);
      g.textAlign(CENTER, CENTER);

      if (match && drawMatched) {
        g.text(c, x, y);
      }

      if (drawUnmatched && !match) {
        const r = Math.sqrt((x - hw) * (x - hw) + (y - hh) * (y - hh));
        
        let d = 20 * y / h + (sin(10 * x / w) + 1) * 0.5;

        const offsetCol = (random() < 0.1) ? unmatchCount : 0;
        const fillCol = color(pal.getColor(theme, floor(d + offsetCol)));

        let textCol = fillCol;

        if (random() < 0.6) {
          // Draw rectangle the size of cell
          fillCol.setAlpha(255);
          g.fill(fillCol);
          g.rectMode(CENTER);
          let a = map(r, unmatchRThreshold, hh, 140, 100);

          g.stroke(fillCol);

          g.rect(x, y, w / 51, w / 51);

          textCol = color(fillCol.gray > 100 ? 0 : 255);
        }

        let a = map(r, unmatchRThreshold, hh, 120, 80);
        
        g.stroke(textCol);
        g.fill(textCol);
        g.text(c, x, y);
      }
    };
  };

  const size1 = w / 60;
  const size2 = w / 100;
  const size3 = w / 50;

  g.blendMode(BLEND);
  renderMandala1();

  g.blendMode(MULTIPLY);
  enableShadows(g, 200);
  sampleAndDraw(poem, numCells1, texter(true, false, size1, typewriterBold), 598, 1);

  g.blendMode(BLEND);
  push();
  translate(width / 2, height / 2);
  clear();
  fill(255);
  circle(0, 0, ((2 * unmatchRThreshold) / w) * width);
  pop();
  disableShadows(g);
  sampleAndDraw(
    poem,
    numCells2,
    texter(false, true, size2, "Helvetica"),
    unpoem.length,
    2
  );

  g.blendMode(BLEND);
  renderMandala2();

  g.blendMode(MULTIPLY);
  enableShadows(g, 180);
  sampleAndDraw(
    poem,
    numCells3,
    texter(true, false, size3, typewriterBold, 2),
    598,
    1
  );

  strokeWeight(0.25);
  // renderMandala2();
};

function bgStuff1() {
  // Draw 1000 random transparent circles, darker towards the edge and lighter towards the center
  g.push();
  g.translate(hw, hh);
  g.blendMode(MULTIPLY);
  for (let i = 0; i < 500; i++) {
    g.push();
    g.rotate(i);
    g.scale(1, 2);

    const x = Math.pow(random(), 1.5) * w - hw;
    const y = (random() * h - hh) * 0.5;
    const r = 0.5 * random(w * 0.1);
    const a = random(5, 10);
    const shape = new Polygon(vec2(x, y), r, Math.floor(random(5, 8)));

    let col = color(getRandom(theme.colors));
    col.setAlpha(a);
    g.noStroke();
    g.fill(col);
    shape.draw(g);
    g.stroke(col);
    g.noFill();
    shape.draw(g);
    g.pop();
  }
  g.pop();

  g.blendMode(MULTIPLY);
  //g.background(255, 255, 255, 180);
  // circler(1, 1, 2, 10, 20);
  // circler(1, 32, 5, 100);
  let lineCount = 10;
  // Horizontal alternating rectangles
  g.blendMode(ADD);
  g.drawingContext.save();
  setShadow(g, 2, -2, 10, "#142108");
  g.drawingContext.restore();
  // g.fill(color(255,255,255,5));
  for (let i = 0; i < lineCount; i++) {
    if (i % 2 === 0) {
      const x1 = random() * hw;
      const x2 = x1 + random() * w * 0.2;
      //g.rect(i * (w / lineCount), 0, w / lineCount, height);
      let col = color(getRandom(theme.colors));
      col.setAlpha(2);
      g.fill(col);
      g.rect(x1, 0, x2, height);
    }
  }
}

function bgStuff2() {
  // Draw 1000 random transparent circles, darker towards the edge and lighter towards the center
  g.push();
  g.blendMode(BLEND);
  g.translate(hw, hh);

  g.blendMode(MULTIPLY);
  g.pop();
}

function enableShadows(g, col = 100) {
  g.drawingContext.shadowOffsetX = 0;
  g.drawingContext.shadowOffsetY = 0;
  g.drawingContext.shadowBlur = w / 2000;
  g.drawingContext.shadowColor = color(col);
}

function disableShadows(g) {
  g.drawingContext.shadowOffsetX = 0;
  g.drawingContext.shadowOffsetY = 0;
  g.drawingContext.shadowBlur = 0;
  g.drawingContext.shadowColor = "#000000FF";
}

window.draw = function () {
  image(g, 0, 0, width, height);

  if (mouseIsPressed) {
    // Draw a zoomed in view
    debug.drawFullZoomSection(g, 400);
  }
};

window.keyTyped = function () {
  if (key === "s") {
    g.save();
  }
};
