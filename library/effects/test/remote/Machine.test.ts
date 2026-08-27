import { layer } from "@effect/vitest"
import { Effect } from "effect"
import { step } from "../../src/internal/remoteMachine.ts"
import {
  assertFamilyRows,
  remoteStepLayer,
  RemoteStepSUT,
} from "../conformance/harness.ts"
import {
  assertRemoteGuards,
  remoteBinding,
  runRemoteRow,
} from "./MachineFixtures.ts"

layer(remoteStepLayer(step))("direction 1 remote machine mirror", (it) => {
  it.effect("RMT-001 consumes every ratified remote-admission row structurally", () =>
    RemoteStepSUT.use((sut) => assertFamilyRows(
      remoteBinding("RMT-001"),
      (row) => runRemoteRow(sut, row),
    )))

  it.effect("RMT-002 consumes every ratified remote-budget row structurally", () =>
    RemoteStepSUT.use((sut) => assertFamilyRows(
      remoteBinding("RMT-002"),
      (row) => runRemoteRow(sut, row),
    )))

  it.effect("RMT-003 consumes every ratified terminal-integrity row structurally", () =>
    RemoteStepSUT.use((sut) => assertFamilyRows(
      remoteBinding("RMT-003"),
      (row) => runRemoteRow(sut, row),
    )))

  it.effect("RMT-004 consumes every ratified deduplicated-upload row structurally", () =>
    RemoteStepSUT.use((sut) => assertFamilyRows(
      remoteBinding("RMT-004"),
      (row) => runRemoteRow(sut, row),
    )))

  it.effect("RMT-015 consumes every ratified remote-load agreement row structurally", () =>
    RemoteStepSUT.use((sut) => assertFamilyRows(
      remoteBinding("RMT-015"),
      (row) => runRemoteRow(sut, row),
    )))

  it.effect("remote admission and budget guards agree with their manifest consumers", () =>
    Effect.forEach(
      ["RMT-001", "RMT-002", "RMT-003", "RMT-004", "RMT-015"] as const,
      assertRemoteGuards,
      { discard: true },
    ))
})
