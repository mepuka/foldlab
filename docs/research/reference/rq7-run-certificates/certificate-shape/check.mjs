// RQ-7 reference reproduction. Own-authored; not a foldlab gate.
//
// The third party's side. Holds ONLY: the kernel artifact, the journal,
// and the certificate. Re-derives the verdict; exits nonzero on any
// mismatch, naming which obligation failed.
//
// Every check below answers one question: "could I have reached this
// conclusion myself?" Nothing is taken from the certificate that the
// certificate is supposed to be evidence for.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { step, canonical, MODEL_VERSION } from "./kernel.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const enc = new TextEncoder();
const dec = new TextDecoder();

const certPath = process.argv[2] ?? join(here, "certificate.json");
const journalPath = process.argv[3] ?? join(here, "journal.json");

const fail = [];
const note = (obligation, detail) => fail.push(`${obligation}: ${detail}`);

let cert, journal;
try {
  cert = JSON.parse(readFileSync(certPath, "utf8"));
  journal = JSON.parse(readFileSync(journalPath, "utf8"));
} catch (e) {
  console.error("REFUSED  unreadable: " + e.message);
  process.exit(1);
}

// O1 — the artifact that ran is the artifact I hold.
const kernelDigest = sha256(readFileSync(join(here, "kernel.mjs")));
if (cert.kernelDigest !== kernelDigest) {
  note("O1 kernel identity", `certificate says ${cert.kernelDigest}, artifact here is ${kernelDigest}`);
}
// O2 — and it speaks the model version the certificate names.
if (cert.modelVersion !== MODEL_VERSION) {
  note("O2 model version", `certificate says ${cert.modelVersion}, artifact says ${MODEL_VERSION}`);
}
// O3 — the session the certificate names is the journal I hold.
if (cert.sessionId !== journal.sessionId) {
  note("O3 session identity", `certificate ${cert.sessionId} vs journal ${journal.sessionId}`);
}
if (cert.entryCount !== journal.entries.length) {
  note("O4 journal extent", `certificate ${cert.entryCount} entries, journal has ${journal.entries.length}`);
}
if (cert.journalDigest !== sha256(enc.encode(canonical(journal)))) {
  note("O5 journal integrity", "journal bytes do not match the certificate's journalDigest");
}

// O6 — the chain is intact and ends where the certificate says.
let chain = sha256(enc.encode("genesis:" + cert.kernelDigest));
for (const e of journal.entries) {
  chain = sha256(enc.encode(chain + "|" + canonical({ seq: e.seq, op: e.op, receipt: e.receipt })));
  if (e.chain !== chain) {
    note("O6 journal chain", `entry ${e.seq} chain mismatch`);
    break;
  }
}
if (chain !== cert.journalHead) note("O6 journal chain", "head does not match certificate journalHead");

// O7 — replay. Every receipt is re-derived, not read.
let stateBytes = enc.encode(cert.genesisState);
for (const e of journal.entries) {
  const out = step(stateBytes, enc.encode(e.op));
  const got = canonical(out.receipt);
  if (got !== e.receipt) {
    note("O7 replay", `entry ${e.seq}: journal receipt ${e.receipt}, kernel here returns ${got}`);
    break;
  }
  stateBytes = out.state;
}

// O8 — and the verdict the certificate asserts is the one replay reaches.
const finalDigest = sha256(stateBytes);
if (finalDigest !== cert.finalStateDigest) {
  note("O8 verdict", `replay reaches ${finalDigest}, certificate asserts ${cert.finalStateDigest}`);
}
if (dec.decode(stateBytes) !== cert.finalState) {
  note("O8 verdict", "replayed final state bytes differ from the certificate's finalState");
}

if (fail.length === 0) {
  console.log("VERIFIED  session " + cert.sessionId);
  console.log("          kernel   " + cert.kernelDigest);
  console.log("          final    " + finalDigest);
  process.exit(0);
}
for (const f of fail) console.error("REFUSED  " + f);
process.exit(1);
