import { it } from "@effect/vitest"
import { assertFamilyRows } from "../conformance/harness.ts"
import {
  mrk001Binding,
  mrk002Binding,
  mrk003Binding,
  mrk005Binding,
  mrk006Binding,
  mrk007Binding,
  mrk011Binding,
  mrk012Binding,
  realChunk,
  realConsistency,
  realInclusion,
  realOpeningDecode,
  realStep,
  realStreamDecode,
  runChunkRow,
  runConsistencyRow,
  runDecoderRow,
  runInclusionRow,
  runOpeningRow,
  runStreamRow,
} from "./MerkleFixtures.ts"

it.effect("MRK-001 consumes every ratified chunk-recipe row structurally", () =>
  assertFamilyRows(mrk001Binding, (row) => runChunkRow(realChunk, row)))

it.effect("MRK-002 consumes every ratified verified-emission row structurally", () =>
  assertFamilyRows(mrk002Binding, (row) => runDecoderRow(realStep, row)))

it.effect("MRK-003 consumes every ratified final-length row structurally", () =>
  assertFamilyRows(mrk003Binding, (row) => runDecoderRow(realStep, row)))

it.effect("MRK-005 consumes every ratified slice-consistency row structurally", () =>
  assertFamilyRows(mrk005Binding, (row) => runDecoderRow(realStep, row)))

it.effect("MRK-006 consumes every ratified inclusion-opening row structurally", () =>
  assertFamilyRows(mrk006Binding, (row) => runInclusionRow(realInclusion, row)))

it.effect("MRK-007 consumes every ratified consistency-proof row structurally", () =>
  assertFamilyRows(mrk007Binding, (row) => runConsistencyRow(realConsistency, row)))

it.effect("MRK-011 consumes every ratified opening-codec row structurally", () =>
  assertFamilyRows(mrk011Binding, (row) => runOpeningRow(realOpeningDecode, row)))

it.effect("MRK-012 consumes every ratified stream-codec row structurally", () =>
  assertFamilyRows(mrk012Binding, (row) => runStreamRow(realStreamDecode, row)))
