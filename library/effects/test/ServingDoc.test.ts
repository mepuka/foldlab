/**
 * The SERVING.md drift gate — the emitted-projection discipline
 * applied to the deployment doc, at the strength this lane can give
 * it without minting a Lean emitter (the doc's factual vocabularies
 * are RE-DERIVED from the live exported values and compared, so a
 * hand-typed fact that drifts from the estate is a red gate, not a
 * stale sentence; the judgment prose stays hand-written and
 * unjudged here).
 *
 * What is checked, and against which authority:
 *
 * - routes            ← `bin/mcp/http.ts` (mcpPath, metricsPath, projectionsPath)
 * - policy fields     ← `ServePolicy`'s own schema keys
 * - protocol ceiling  ← `offeredProtocols` (every offered revision named;
 *                        the ceiling stated as the newest)
 * - metric vocabulary ← the exported Metric instances' ids, BOTH ways:
 *                        every metric is documented, and every
 *                        `cas.`-prefixed token in the doc is a real id
 * - projections       ← `projectionSources` names
 * - log fields        ← the field names the front door and heartbeat
 *                        actually annotate
 */
import { describe, expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { ServePolicy } from "../bin/cli/store.ts"
import {
  mcpPath,
  metricsPath,
  projectionsPath,
  projectionSources,
  replicaAge,
  requestDuration,
  rssBytes,
  wireInflight,
} from "../bin/mcp/http.ts"
import { offeredProtocols } from "../bin/mcp/server.ts"
import * as Telemetry from "../bin/mcp/telemetry.ts"

const servingDoc = readFileSync(
  new URL("../../../docs/lab-core/SERVING.md", import.meta.url),
  "utf8",
)

describe("SERVING.md — the factual vocabularies match the estate", () => {
  it("names the routes the daemon actually binds", () => {
    for (const route of [mcpPath, metricsPath, projectionsPath]) {
      expect(servingDoc).toContain(`\`${route}\``)
    }
  })

  it("rules every ServePolicy field the schema actually has", () => {
    for (const field of Object.keys(ServePolicy.fields)) {
      expect(servingDoc, `ServePolicy.${field} is unruled in SERVING.md`)
        .toContain(field)
    }
  })

  it("states the offered protocol revisions, all of them, newest as the ceiling", () => {
    for (const protocol of offeredProtocols) {
      expect(servingDoc).toContain(protocol.protocolVersion)
    }
    const ceiling = offeredProtocols[0].protocolVersion
    expect(servingDoc).toContain(`**${ceiling}`)
  })

  it("documents every metric, and documents no metric that does not exist", () => {
    const metricIds = [
      Telemetry.inflight.id,
      Telemetry.calls.id,
      Telemetry.refused.id,
      Telemetry.sqlWait.id,
      requestDuration.id,
      wireInflight.id,
      rssBytes.id,
      replicaAge.id,
    ]
    for (const id of metricIds) {
      expect(servingDoc, `metric ${id} is undocumented`).toContain(`\`${id}\``)
    }
    // The reverse direction catches a renamed metric leaving its old
    // name behind in the doc.
    const documented = servingDoc.match(/`cas\.[a-z0-9_.]+`/gu) ?? []
    for (const token of documented) {
      const id = token.slice(1, -1)
      expect(metricIds, `SERVING.md documents ${id}, which no metric carries`)
        .toContain(id)
    }
  })

  it("lists every served projection by name", () => {
    for (const projection of projectionSources) {
      expect(servingDoc, `projection ${projection.name} is undocumented`)
        .toContain(projection.name)
    }
  })

  it("documents the hoover log-field vocabulary the hosts actually emit", () => {
    for (
      const field of [
        "seq",
        "plane",
        "method",
        "path",
        "status",
        "ms",
        "elapsedMs",
        "lateMs",
        "refused=host|origin",
        "message=heartbeat",
        "message=request",
      ]
    ) {
      expect(servingDoc, `log field ${field} is undocumented`).toContain(field)
    }
  })
})
