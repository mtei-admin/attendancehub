/**
 * Regenerates PWA icons from public/mte-logo.png.
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "mte-logo.png");
const outDir = path.join(root, "public", "icons");
const BG = { r: 15, g: 23, b: 42, alpha: 1 };

async function makeIcon(size, { maskable = false, filename }) {
  const padRatio = maskable ? 0.2 : 0.08;
  const inner = Math.round(size * (1 - padRatio * 2));
  const logo = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: BG })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(outDir, filename));

  console.log("wrote", filename);
}

fs.mkdirSync(outDir, { recursive: true });

await makeIcon(192, { filename: "icon-192.png" });
await makeIcon(512, { filename: "icon-512.png" });
await makeIcon(512, { maskable: true, filename: "icon-512-maskable.png" });
await makeIcon(180, { filename: "apple-touch-icon.png" });
fs.copyFileSync(
  path.join(outDir, "apple-touch-icon.png"),
  path.join(root, "public", "apple-touch-icon.png"),
);
console.log("done");
