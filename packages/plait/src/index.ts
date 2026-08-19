/**
 * Plane: surface — entry points.
 *
 * @module
 */
/** Canonical JSON values and their unique RFC 8785 byte form. */
export * as Canonical from "./truth/Canonical.js"

/** Directories, explicit roots, and paths that walk by iterated resolve. */
export * as Address from "./planes/Address.js"

/** Declared reducers, the rung ladder of earned laws, and the carrier each rung licenses. */
export * as Algebra from "./truth/Algebra.js"

/** Durable fold checkpoint facts and their contiguous-frontier transition. */
export * as Anchor from "./planes/Anchor.js"

/** The planes served over HTTP: bounded reads, one live change stream, no write. */
export * as Api from "./surface/api.js"

/** The public content-addressed blob store: put, verified get, presence. */
export * as Blob from "./planes/Blob.js"

/** The content-addressed value store and its internal payload seam. */
export * as Catalog from "./planes/Catalog.js"

/** Lattice cells: the join, the merge-write loop, and the cell service. */
export * as Cell from "./planes/Cell.js"

/** SHA-256 identity over canonical uncompressed bytes. */
export * as Digest from "./truth/Digest.js"

/** The language-speaking service: judgment through the one door, then carriage. */
export * as Engine from "./carriage/Engine.js"

/** Environments as directories: positioned provision facts and the greatest-position read. */
export * as Environment from "./planes/Environment.js"

/** Scope-owned transport-free fabric client service. */
export * as FabricClient from "./carriage/FabricClient.js"

/** Declared fold programs and scope-owned durable deployment. */
export * as Fold from "./planes/Fold.js"

/** Declared partitioned evidence lanes and durable emission. */
export * as Lane from "./planes/Lane.js"

/** The generated candidate language and its one admission function. */
export * as KernelDoor from "./kernel/KernelDoor.js"

/** The language as plain TypeScript: the candidate grammar and the eight generators. */
export * as KernelSdk from "./kernel/KernelSdk.generated.js"

/** The kernel language served over MCP: eight tools, served equals derived. */
export * as Mcp from "./surface/mcp.js"

/** Structural and absence refusals plus the absence-only retry policy. */
export * as Refusal from "./truth/Refusal.js"

/** Fenced five-action commitment registers over NATS KV revision CAS. */
export * as Register from "./planes/Register.js"

/** References that decode by resolving, with verify-on-read unskippable. */
export * as Resolved from "./planes/Resolved.js"

/** Read-plane sessions and the declared views their writ scopes. */
export * as Session from "./planes/Session.js"

/** Typed constructors for the `flb.fab.*` routing grammar. */
export * as Subjects from "./kernel/Subjects.js"

/** Closed envelope-v0 schemas, canonical encoding, and constrained decode. */
export * as Wire from "./kernel/Wire.js"
