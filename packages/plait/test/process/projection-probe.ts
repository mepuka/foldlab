/**
 * The permission projection's emitted subjects, printed for a byte diff.
 *
 * The projection was re-sourced from the wire vocabulary rather than writing
 * its subjects by hand. What that re-sourcing had to hold is that the emitted
 * subjects did not move: this probe prints them for one fixed scope, so a
 * before-and-after diff is bytes rather than reading.
 *
 * Test-only. Nothing imports this from `src/`.
 */
import { declareCarrierPermissionMap } from "../../src/internal/permissions.js"

const map = declareCarrierPermissionMap({
  evidenceLane: "lane",
  evidenceStreams: ["EV_ALPHA", "EV_BETA"],
  commonsStream: "COMMONS",
  factVenue: "venue",
  node: "node",
  inboxPrefixes: {
    "evidence-publisher": "_INBOX.ev",
    "fact-publisher": "_INBOX.fact",
    "node-publisher": "_INBOX.node",
    cell: "_INBOX.cell",
    anchor: "_INBOX.anchor",
    catalog: "_INBOX.cat",
    register: "_INBOX.reg",
    requester: "_INBOX.req",
  },
})
process.stdout.write(`${JSON.stringify(map, null, 2)}\n`)
