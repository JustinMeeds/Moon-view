/**
 * Generates moon-themed PWA icons using the Canvas API (node-canvas).
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install canvas (dev dep)
 */

import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  bg.addColorStop(0, "#1e1b4b");
  bg.addColorStop(1, "#030712");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Stars
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  const stars = [
    [0.15, 0.2], [0.8, 0.15], [0.7, 0.75], [0.25, 0.8],
    [0.9, 0.5], [0.1, 0.6], [0.6, 0.1], [0.5, 0.9],
  ];
  for (const [x, y] of stars) {
    ctx.beginPath();
    ctx.arc(x * size, y * size, size * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moon glyph (crescent)
  const cx = size * 0.5;
  const cy = size * 0.5;
  const r = size * 0.28;

  // Full circle in amber
  ctx.fillStyle = "#fbbf24";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = size * 0.12;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Cutout for crescent
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx + r * 0.35, cy - r * 0.1, r * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;

  return canvas.toBuffer("image/png");
}

const sizes = [192, 512];
for (const size of sizes) {
  try {
    const buf = drawIcon(size);
    const outPath = join(__dirname, `../public/icons/icon-${size}.png`);
    writeFileSync(outPath, buf);
    console.log(`Generated icon-${size}.png`);
  } catch (e) {
    console.error(`Failed to generate icon-${size}.png:`, e.message);
  }
}
