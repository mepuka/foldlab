import { expect, layer } from "@effect/vitest"
import { Effect } from "effect"
import {
  assertFamilyRed,
  remoteStepLayer,
  RemoteStepSUT,
} from "../conformance/harness.ts"
import { remoteBinding, runRemoteRow } from "./MachineFixtures.ts"
import { mutantStep as cacheBeforeAdmission } from "./mutants/RMT001_CacheBeforeAdmission.ts"
import { mutantStep as oversizeAccepted } from "./mutants/RMT002_OversizeAccepted.ts"
import { mutantStep as retryUnchangedBytes } from "./mutants/RMT003_RetryUnchangedBytes.ts"
import { mutantStep as duplicateUploadTransfers } from "./mutants/RMT004_DuplicateUploadTransfers.ts"
import { mutantStep as substitutedDelivery } from "./mutants/RMT015_SubstitutedDelivery.ts"

layer(remoteStepLayer(cacheBeforeAdmission))("direction 2 RMT001 cache-before-admission mutant", (it) => {
  it.effect("RMT-001 is red with named kill witnesses", () => RemoteStepSUT.use((sut) =>
    assertFamilyRed(remoteBinding("RMT-001"), (row) => runRemoteRow(sut, row)).pipe(
      Effect.tap((witnesses) => Effect.sync(() =>
        expect(witnesses).toContain("load-wrong-bytes-rejected-001"))),
    )))
})

layer(remoteStepLayer(oversizeAccepted))("direction 2 RMT002 oversize-accepted mutant", (it) => {
  it.effect("RMT-002 is red with named kill witnesses", () => RemoteStepSUT.use((sut) =>
    assertFamilyRed(remoteBinding("RMT-002"), (row) => runRemoteRow(sut, row)).pipe(
      Effect.tap((witnesses) => Effect.sync(() =>
        expect(witnesses).toContain("upload-over-budget-000"))),
    )))
})

layer(remoteStepLayer(retryUnchangedBytes))("direction 2 RMT003 unchanged-retry mutant", (it) => {
  it.effect("RMT-003 is red with named kill witnesses", () => RemoteStepSUT.use((sut) =>
    assertFamilyRed(remoteBinding("RMT-003"), (row) => runRemoteRow(sut, row)).pipe(
      Effect.tap((witnesses) => Effect.sync(() =>
        expect(witnesses).toContain("upload-rejected-then-repeat-000"))),
    )))
})

layer(remoteStepLayer(duplicateUploadTransfers))("direction 2 RMT004 duplicate-transfer mutant", (it) => {
  it.effect("RMT-004 is red with named kill witnesses", () => RemoteStepSUT.use((sut) =>
    assertFamilyRed(remoteBinding("RMT-004"), (row) => runRemoteRow(sut, row)).pipe(
      Effect.tap((witnesses) => Effect.sync(() =>
        expect(witnesses).toContain("upload-after-load-needs-no-transfer-000"))),
    )))
})

layer(remoteStepLayer(substitutedDelivery))("direction 2 RMT015 substituted-delivery mutant", (it) => {
  it.effect("RMT-015 is red with named kill witnesses", () => RemoteStepSUT.use((sut) =>
    assertFamilyRed(remoteBinding("RMT-015"), (row) => runRemoteRow(sut, row)).pipe(
      Effect.tap((witnesses) => Effect.sync(() =>
        expect(witnesses).toContain("load-substituted-bytes-refused-001"))),
    )))
})
