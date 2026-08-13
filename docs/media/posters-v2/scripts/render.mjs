// Render the poster and then CHECK WHAT CAME OUT.
//
// The lineage of this file is a chain of exports nobody opened. An animated cut
// once shipped as a 640x1080 GIF because a width flag scaled and a height flag
// did not. So the script asserts the exact pixel dimensions of everything it
// writes and refuses to finish if any of them is wrong.
//
// The preview is the point. A poster is authored at 1600x900 and judged at
// 900px wide, and the second file is the one the eye actually gets — it is made
// FROM the shipped 1x export so the downscale being verified is the same
// transform a README applies.
//
//   usage:  node scripts/render.mjs                 → out/two-folds-v2{,_preview}.png
//           node scripts/render.mjs --sketch NAME   → sketches/NAME{,_preview}.png
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join("src", "index.ts");

const STILL_ID = "two-folds-v2";
const CANVAS = { width: 1600, height: 900 };
const PREVIEW_WIDTH = 900;
const PREVIEW = { width: 900, height: 506 }; // round(900 * 900/1600) = 506

const argv = process.argv.slice(2);
const sketchAt = argv.indexOf("--sketch");
const sketch = sketchAt === -1 ? null : argv[sketchAt + 1];
if (sketchAt !== -1 && !sketch) {
  throw new Error("--sketch needs a name");
}

const dir = path.join(ROOT, sketch ? "sketches" : "out");
const stem = sketch ?? STILL_ID;
mkdirSync(dir, { recursive: true });

const full = path.join(dir, `${stem}.png`);
const preview = path.join(dir, `${stem}_preview.png`);

execFileSync(
  "npx",
  ["remotion", "still", ENTRY, STILL_ID, full, "--overwrite", "--log=error"],
  { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" },
);

await sharp(full).resize({ width: PREVIEW_WIDTH }).png({ compressionLevel: 9 }).toFile(preview);

const assertSize = async (file, want) => {
  const meta = await sharp(file).metadata();
  if (meta.width !== want.width || meta.height !== want.height) {
    throw new Error(
      `${path.basename(file)} is ${meta.width}x${meta.height}, expected ${want.width}x${want.height}`,
    );
  }
  const kb = (statSync(file).size / 1024).toFixed(1);
  return `${path.basename(file).padEnd(30)} ${String(meta.width).padStart(4)}x${String(
    meta.height,
  ).padStart(4)}  ${kb.padStart(8)} KB`;
};

console.log(`\n${await assertSize(full, CANVAS)}\n${await assertSize(preview, PREVIEW)}\n`);
