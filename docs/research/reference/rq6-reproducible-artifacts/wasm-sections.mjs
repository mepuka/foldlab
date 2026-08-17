// wasm-sections.mjs — own-authored, dependency-free WebAssembly section lister.
//
// Purpose (foldlab RQ-6): a `.wasm` artifact's digest is only as stable as the
// metadata it carries. The binary format itself has no timestamp field, so
// every identity-bearing byte that is not code lives in a *custom* section:
// `name` (debug names), `producers` (toolchain name + version),
// `target_features`, `.debug_*` (DWARF, which carries source paths), and
// `build_id`. This script prints them so a build can be inspected before its
// digest is pinned.
//
// Usage:  bun wasm-sections.mjs path/to/artifact.wasm
//         node wasm-sections.mjs path/to/artifact.wasm
//
// Reads the module with its own decoder rather than WebAssembly.Module so that
// it never instantiates or validates untrusted input.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SECTION_NAMES = {
  0: "custom", 1: "type", 2: "import", 3: "function", 4: "table",
  5: "memory", 6: "global", 7: "export", 8: "start", 9: "element",
  10: "code", 11: "data", 12: "data count", 13: "tag",
};

// Custom sections that carry build identity rather than program semantics.
const IDENTITY_BEARING = new Set(["name", "producers", "build_id", "target_features"]);

function readVaruint32(buf, pos) {
  let result = 0, shift = 0, byte;
  do {
    if (pos >= buf.length) throw new Error("truncated LEB128");
    byte = buf[pos++];
    result |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte & 0x80);
  return [result >>> 0, pos];
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: wasm-sections.mjs <file.wasm>");
    process.exit(2);
  }
  const buf = readFileSync(path);

  if (buf.length < 8 || buf.readUInt32LE(0) !== 0x6d736100) {
    console.error("not a wasm module (bad magic)");
    process.exit(1);
  }

  console.log(`file      ${path}`);
  console.log(`size      ${buf.length} bytes`);
  console.log(`sha256    ${createHash("sha256").update(buf).digest("hex")}`);
  console.log(`version   ${buf.readUInt32LE(4)}`);
  console.log("");
  console.log("id  section        size       detail");

  let pos = 8;
  const identity = [];
  while (pos < buf.length) {
    const id = buf[pos++];
    let size;
    [size, pos] = readVaruint32(buf, pos);
    const body = buf.subarray(pos, pos + size);
    let detail = "";
    if (id === 0) {
      const [nameLen, afterLen] = readVaruint32(body, 0);
      const name = body.subarray(afterLen, afterLen + nameLen).toString("utf8");
      detail = `name="${name}"`;
      if (IDENTITY_BEARING.has(name) || name.startsWith(".debug_")) {
        identity.push({ name, size });
        detail += "   <- identity-bearing";
      }
      if (name === "producers") {
        // Print the raw text so the toolchain version is visible verbatim.
        const printable = body
          .subarray(afterLen + nameLen)
          .toString("utf8")
          .replace(/[^\x20-\x7e]+/g, " ")
          .trim();
        detail += `\n                             producers: ${printable}`;
      }
    }
    console.log(
      `${String(id).padStart(2)}  ${(SECTION_NAMES[id] ?? "?").padEnd(14)} ${String(size).padStart(9)}  ${detail}`,
    );
    pos += size;
  }

  console.log("");
  if (identity.length === 0) {
    console.log("no identity-bearing custom sections: digest depends on code and data only");
  } else {
    const total = identity.reduce((n, s) => n + s.size, 0);
    console.log(`identity-bearing custom sections: ${identity.length}, ${total} bytes`);
    console.log("these change when the toolchain version, build path, or debug settings change");
  }
}

main();
