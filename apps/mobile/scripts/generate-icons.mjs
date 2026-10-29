// Regenerates app icons from the Madarek brand mark (assets/brand/mark.svg).
// Requires: sharp (npm i -D sharp). Outputs are committed; run only when brand changes.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");
mkdirSync(OUT, { recursive: true });
const out = (n) => join(OUT, n);

const PAPER = "#F6F6EE", INK = "#282828", ORANGE = "#FA3600";
const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${inner}</svg>`;
const geom = (ink, orange, sw, inner = "") =>
  inner ||
  `<g fill="none" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="miter"><rect x="256" y="256" width="512" height="512"/><path d="M512 160L864 512L512 864L160 512Z"/></g><rect x="704" y="192" width="128" height="128" fill="${orange}"/>`;

const files = {
  "icon.png": wrap(`<rect width="1024" height="1024" fill="${PAPER}"/>${geom(INK, ORANGE, 32)}`),
  "adaptive-foreground.png": wrap(`<g transform="translate(307,307) scale(0.4)">${geom(INK, ORANGE, 80)}</g>`),
  "adaptive-monochrome.png": wrap(`<g transform="translate(307,307) scale(0.4)">${geom("#FFFFFF", "#FFFFFF", 80)}</g>`),
  "splash-icon.png": wrap(geom(INK, ORANGE, 32)),
  "adaptive-background.png": wrap(`<rect width="1024" height="1024" fill="${PAPER}"/>`),
  "favicon.png": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${PAPER}"/><g fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="miter"><rect x="12" y="12" width="24" height="24"/><path d="M24 6L42 24L24 42L6 24Z"/></g><rect x="33" y="9" width="6" height="6" fill="${ORANGE}"/></svg>`,
};

for (const [name, svg] of Object.entries(files)) {
  await sharp(Buffer.from(svg)).resize(name === "favicon.png" ? 48 : 1024, name === "favicon.png" ? 48 : 1024).png().toFile(out(name));
  console.log("wrote", name);
}
console.log("done");
