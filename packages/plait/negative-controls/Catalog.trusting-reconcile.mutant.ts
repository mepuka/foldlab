import type { KV } from "@nats-io/kv"

import { catalogStoreOver, trustCreateOutcome } from "../src/internal/catalogs.js"
import type { CatalogService } from "../src/planes/Catalog.js"

/**
 * NEGATIVE BUILD VARIANT — never import outside the named control test.
 *
 * This is the durable catalog store with exactly one step replaced: the
 * disposition of a create that reported wrong-last-sequence. The shipped store
 * reads the digest key back and compares bytes; this one believes the report
 * and refuses.
 *
 * Everything else is the shipped code path rather than a restatement of it —
 * the same `catalogStoreOver` derives the digest, canonicalizes, keys, creates,
 * classifies the cause by operation context plus code, verifies on read, and
 * decodes from the verified bytes. What the control varies is the one decision
 * whose tolerance is load-bearing.
 *
 * The variant is killed by the fact the upstream defect makes unavoidable: a
 * wrong-last-sequence is evidence about a sequence number, never about content,
 * so a create that actually landed can still report one. Under the shipped
 * disposition the read-back finds the presented bytes and the value is
 * admitted; under this one the report is taken at face value and a value the
 * store is holding is refused.
 */
export const trustingReconcileStore = (bucket: KV): CatalogService =>
  catalogStoreOver(bucket, trustCreateOutcome)
