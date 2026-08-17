// Bun driver for the RQ-3 probes. Output lines are shaped to diff
// line-for-line against the wazero transcript.
//
//   bun run run.ts identity ../wasm
//   bun run run.ts features ../wasm
//   bun run run.ts wasi     ../wasm
//   bun run run.ts imports  <file.wasm>
//
// Uses only the standard WebAssembly JS API plus node:wasi.

const cmd = process.argv[2];
const target = process.argv[3] ?? "../wasm";

const hex = (b: Uint8Array) =>
  new Bun.CryptoHasher("sha256").update(b).digest("hex");

async function load(dir: string, f: string): Promise<Uint8Array> {
  return new Uint8Array(await Bun.file(`${dir}/${f}`).arrayBuffer());
}

console.log(
  `host=bun version=${Bun.version} platform=${process.platform} arch=${process.arch}`,
);

const F32 = [0x7fc00001, 0x7fa00000, 0xffc00001 >>> 0, 0x7fc00000];
const F64 = [
  0x7ff8000000000001n,
  0x7ff4000000000000n,
  0xfff8000000000001n,
  0x7ff8000000000000n,
];

if (cmd === "identity") {
  const src = await load(target, "probe.wasm");
  console.log(`artifact=probe.wasm sha256=${hex(src)}`);
  const mod = new WebAssembly.Module(src);
  console.log(
    "engine=jsc imports=" +
      JSON.stringify(
        WebAssembly.Module.imports(mod).map((i) => `${i.module}.${i.name}`),
      ),
  );
  const e = new WebAssembly.Instance(mod, {}).exports as any;
  for (const b of F32) {
    const out = e.nan_f32(b) >>> 0;
    console.log(
      `engine=jsc nan_f32 in=0x${(b >>> 0).toString(16).padStart(8, "0")} out=0x${out.toString(16).padStart(8, "0")}`,
    );
  }
  for (const b of F64) {
    const out = BigInt.asUintN(64, e.nan_f64(b));
    console.log(
      `engine=jsc nan_f64 in=0x${b.toString(16).padStart(16, "0")} out=0x${out.toString(16).padStart(16, "0")}`,
    );
  }
  console.log("engine=jsc mem_grow(1)=" + e.mem_grow(1));
  console.log("engine=jsc mem_grow(1)=" + e.mem_grow(1));
  console.log("engine=jsc mem_grow(0)=" + e.mem_grow(0));
  const payload = new Uint8Array(256);
  for (let i = 0; i < 256; i++) payload[i] = i;
  new Uint8Array((e.mem as WebAssembly.Memory).buffer).set(payload, 0);
  console.log("engine=jsc checksum(0,256)=" + (e.checksum(0, 256) >>> 0));
  e.bump(0, 256);
  const after = new Uint8Array((e.mem as WebAssembly.Memory).buffer, 0, 256);
  console.log("engine=jsc bump_sha256=" + hex(after));
} else if (cmd === "features") {
  for (const f of ["feat_shared.wasm", "feat_atomic.wasm", "feat_tailcall.wasm"]) {
    const src = await load(target, f);
    try {
      const m = new WebAssembly.Module(src);
      // feat_tailcall self-tail-calls forever; validate only, never call it.
      if (f === "feat_tailcall.wasm") {
        new WebAssembly.Instance(m, {});
        console.log(`${f.padEnd(20)} validate+instantiate OK (not run)`);
      } else {
        const i = new WebAssembly.Instance(m, {});
        console.log(`${f.padEnd(20)} OK probe=${(i.exports as any).probe()}`);
      }
    } catch (err) {
      console.log(
        `${f.padEnd(20)} ${(err as Error).constructor.name}: ${(err as Error).message}`,
      );
    }
  }
} else if (cmd === "wasi") {
  const { WASI } = await import("node:wasi");
  // Bun's node:wasi lets proc_exit exit the Bun process (documented), so a
  // driver that loops over all four probes stops at the first proc_exit.
  // Pass a single filename as argv[4] to get one probe per process.
  const only = process.argv[4];
  const files = only
    ? [only]
    : ["wasi_min.wasm", "wasi_grow.wasm", "wasi_rand_ok.wasm", "wasi_rand_oob.wasm"];
  for (const f of files) {
    const src = await load(target, f);
    const mod = new WebAssembly.Module(src);
    const w: any = new WASI({ version: "preview1", args: [f], env: {}, preopens: {} });
    // Trace every WASI call so the return values can be compared against the
    // preview1 signature (random_get returns an errno, NOT a byte count).
    const traced: Record<string, any> = {};
    for (const k of Object.keys(w.wasiImport)) {
      const orig = w.wasiImport[k];
      traced[k] = (...args: any[]) => {
        const rc = orig.apply(w.wasiImport, args);
        console.log(`${f.padEnd(20)} TRACE ${k}(${args.join(",")}) -> ${rc}`);
        return rc;
      };
    }
    try {
      const inst = new WebAssembly.Instance(mod, { wasi_snapshot_preview1: traced });
      w.start(inst);
      console.log(`${f.padEnd(20)} start returned normally`);
    } catch (err) {
      console.log(
        `${f.padEnd(20)} ${(err as Error).constructor.name}: ${(err as Error).message}`,
      );
    }
  }
} else if (cmd === "imports") {
  const src = new Uint8Array(await Bun.file(target).arrayBuffer());
  const mod = new WebAssembly.Module(src);
  const uniq = [
    ...new Set(WebAssembly.Module.imports(mod).map((i) => `${i.module}.${i.name}`)),
  ].sort();
  console.log(
    `file=${target} bytes=${src.length} sha256=${hex(src)} imported_functions=${uniq.length}`,
  );
  for (const n of uniq) console.log("  " + n);
} else {
  console.error("usage: bun run run.ts <identity|features|wasi|imports> <dir-or-file>");
  process.exit(2);
}
