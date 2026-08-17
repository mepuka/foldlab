// RQ-1 — the native fallback lane's TypeScript half, exercised for real.
// Own-authored for foldlab RQ-1, 2026-08-16.
//
// Run: bun bun-host.ts   (after building kernel.dll, see README.md)
//
// Note what does NOT appear here: any lean_* symbol. The host speaks only
// the plain-C façade in shim.c. That is not a stylistic choice — the Lean
// object constructors are `static inline` in lean.h and have no linkable
// symbol for bun:ffi to dlopen.

import { dlopen, FFIType, ptr, toArrayBuffer, CString } from "bun:ffi";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const path = new URL("./kernel.dll", import.meta.url).pathname.replace(
  /^\//,
  "",
);

// D-d: the host computes the digest of the artifact it actually loaded.
const digest = createHash("sha256").update(readFileSync(path)).digest("hex");

const lib = dlopen(path, {
  kernel_init: { args: [], returns: FFIType.i32 },
  kernel_step: {
    args: [FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.ptr],
    returns: FFIType.i32,
  },
  kernel_free: { args: [FFIType.ptr], returns: FFIType.void },
  kernel_build_id: { args: [], returns: FFIType.cstring },
});

const rc = lib.symbols.kernel_init();
console.log("kernel_init ->", rc);
console.log("kernel_build_id ->", lib.symbols.kernel_build_id());
console.log("artifact sha256 ->", digest);

function step(input: Uint8Array): Uint8Array {
  const outPtr = new BigUint64Array(1);
  const outLen = new BigUint64Array(1);
  const inBuf = input.length ? input : new Uint8Array(1);
  const code = lib.symbols.kernel_step(
    ptr(inBuf),
    BigInt(input.length),
    ptr(outPtr),
    ptr(outLen),
  );
  if (code !== 0) throw new Error(`kernel_step returned ${code}`);
  const n = Number(outLen[0]);
  const p = outPtr[0];
  const view = new Uint8Array(toArrayBuffer(Number(p) as any, 0, n)).slice();
  lib.symbols.kernel_free(Number(p) as any);
  return view;
}

const hello = new TextEncoder().encode("hello");
console.log("step('hello') ->", Array.from(step(hello)));
console.log("step('')      ->", Array.from(step(new Uint8Array(0))));

// A crude steady-state timing at the 10 KB payload D-a's T3 names.
const payload = new Uint8Array(10240);
for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;
for (let i = 0; i < 5000; i++) step(payload); // warm-up
const samples: number[] = [];
for (let i = 0; i < 20000; i++) {
  const t0 = Bun.nanoseconds();
  step(payload);
  samples.push(Bun.nanoseconds() - t0);
}
samples.sort((a, b) => a - b);
const us = (n: number) => (n / 1000).toFixed(3);
console.log(
  `bun:ffi 10KB round trip  p50=${us(samples[10000])}us ` +
    `p90=${us(samples[18000])}us p99=${us(samples[19800])}us`,
);
