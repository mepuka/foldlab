// RQ-7 reference reproduction. Own-authored; not a foldlab gate.
//
// Runs a session through the toy kernel, writing:
//   journal.json      — the host-owned, append-only, hash-chained log
//   certificate.json  — everything a third party needs *besides* the
//                       kernel artifact and the journal
//
// Note what the certificate does NOT contain: the intermediate states.
// A third party re-derives those. A certificate that carried its own
// answers would be checking itself.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { step, canonical, MODEL_VERSION, BUILD_IDENTITY } from "./kernel.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const enc = new TextEncoder();

// The host computes the digest of the artifact it actually loaded
// (D-d item 3, amended: the artifact cannot embed the digest of its own
// bytes, so the host computes it and journals it).
const kernelDigest = sha256(readFileSync(join(here, "kernel.mjs")));

const genesis = { closed: false, holes: {} };
const ops = [
  { kind: "fill", hole: "author", value: "ada" },
  { kind: "fill", hole: "author", value: "ada" },
  { kind: "fill", hole: "title", value: "notes" },
  { kind: "fill", hole: "author", value: "grace" },
  { kind: "nonsense" },
  { kind: "close" },
];

let stateBytes = enc.encode(canonical(genesis));
const entries = [];
let chain = sha256(enc.encode("genesis:" + kernelDigest));

for (let seq = 0; seq < ops.length; seq++) {
  const opBytes = enc.encode(canonical(ops[seq]));
  const out = step(stateBytes, opBytes);
  stateBytes = out.state;
  const entry = {
    seq,
    op: canonical(ops[seq]),
    receipt: canonical(out.receipt),
  };
  // Append-only chaining: each entry commits to every entry before it.
  chain = sha256(enc.encode(chain + "|" + canonical(entry)));
  entries.push({ ...entry, chain });
}

const journal = { sessionId: "rq7-demo-0001", entries };

const certificate = {
  schema: "rq7-session-certificate/1",
  sessionId: journal.sessionId,
  // 1. what ran
  kernelDigest,
  modelVersion: MODEL_VERSION,
  buildIdentity: BUILD_IDENTITY,
  // 2. where it started
  genesisState: canonical(genesis),
  // 3. what it consumed — by commitment, not by copy
  journalDigest: sha256(enc.encode(canonical(journal))),
  journalHead: chain,
  entryCount: entries.length,
  // 4. what it concluded
  finalState: canonical(JSON.parse(new TextDecoder().decode(stateBytes))),
  finalStateDigest: sha256(stateBytes),
};

writeFileSync(join(here, "journal.json"), JSON.stringify(journal, null, 2) + "\n");
writeFileSync(join(here, "certificate.json"), JSON.stringify(certificate, null, 2) + "\n");
console.log("wrote journal.json and certificate.json");
console.log("kernelDigest      " + certificate.kernelDigest);
console.log("journalHead       " + certificate.journalHead);
console.log("finalStateDigest  " + certificate.finalStateDigest);
