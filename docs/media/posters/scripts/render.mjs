// Render every poster and then CHECK WHAT CAME OUT.
//
// The animated cut this replaces shipped a 640x1080 GIF: the width flag scaled
// and the height did not, and nobody ever opened the exported file. So this
// script does three things per poster and refuses to finish if any of them is
// wrong:
//
//   1. export at 1600x900 (the file a README links)
//   2. export at 3200x1800 (--scale 2, for retina and for print)
//   3. downscale the 1x export to 900px wide — THE FILE THE EYE ACTUALLY GETS
//
// and it asserts the exact pixel dimensions of all three. An aspect ratio that
// drifts is a hard failure here, not a discovery three weeks later.
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join("src", "index.ts");
const OUT = path.join(ROOT, "out");

const CANVAS = { width: 1600, height: 900 };
const RETINA = { width: 3200, height: 1800 };
const PREVIEW_WIDTH = 900;
const PREVIEW = { width: 900, height: 506 }; // round(900 * 900/1600) = 506

const POSTERS = [
  "two-folds",
  "cut-anywhere",
  "refusal-is-a-value",
  "register-linearizes",
  "journal-linearizes",
];

const only = process.argv.slice(2);
const targets = only.length > 0 ? POSTERS.filter((p) => only.includes(p)) : POSTERS;

mkdirSync(OUT, { recursive: true });

const still = (id, out, scale) => {
  const args = ["remotion", "still", ENTRY, id, out, "--overwrite", "--log=error"];
  if (scale !== 1) args.push(`--scale=${scale}`);
  execFileSync("npx", args, { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
};

const assertSize = async (file, want) => {
  const meta = await sharp(file).metadata();
  if (meta.width !== want.width || meta.height !== want.height) {
    throw new Error(
      `${path.basename(file)} is ${meta.width}x${meta.height}, expected ${want.width}x${want.height}`,
    );
  }
  const kb = (statSync(file).size / 1024).toFixed(1);
  return `${path.basename(file).padEnd(36)} ${String(meta.width).padStart(4)}x${String(
    meta.height,
  ).padStart(4)}  ${kb.padStart(8)} KB`;
};

const report = [];

for (const id of targets) {
  const one = path.join(OUT, `${id}.png`);
  const two = path.join(OUT, `${id}@2x.png`);
  const preview = path.join(OUT, `${id}_preview.png`);

  still(id, one, 1);
  still(id, two, 2);

  // The preview is made FROM the shipped 1x file, so the downscale that is
  // being verified is the same transform a README applies.
  await sharp(one).resize({ width: PREVIEW_WIDTH }).png({ compressionLevel: 9 }).toFile(preview);

  report.push(await assertSize(one, CANVAS));
  report.push(await assertSize(two, RETINA));
  report.push(await assertSize(preview, PREVIEW));
  report.push("");
}

console.log(`\n${report.join("\n")}`);
