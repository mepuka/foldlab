#!/usr/bin/env bun
/**
 * cas — the content-addressed store, spoken from a shell.
 *
 * The entry point wires the command tree to the platform once:
 * `BunServices.layer` supplies the filesystem, path, stdio, and
 * terminal realizations the runner and every verb speak through, and
 * nothing below this file touches the platform directly. Bun is the
 * host everywhere — the shim runs this file under it, so the platform
 * layer is the Bun one and no Node realization is loaded.
 *
 * Help carries the vocabulary (the everyday register) beside the
 * commands, seeded from VOCABULARY.md — one coherent surface, per the
 * vocabulary law. `--wizard` on any command walks through its inputs.
 */
import { BunRuntime, BunServices } from "@effect/platform-bun"
import { Effect } from "effect"
import { Command } from "effect/unstable/cli"
import { init, ls, show, status } from "./cli/commands.ts"

/** The everyday register, seeded from VOCABULARY.md — the words every
 * rendered surface uses, and no others. */
const vocabulary = [
  "the words (see library/effects/VOCABULARY.md):",
  "  store    the content-addressed data itself — a directory (or db file)",
  "  address  the 64-hex identity of content; equal content, equal address",
  "  kind     the form a thing takes: value, file, blob, schema",
  "  link     a typed edge to another address, declaring the kind it expects",
  "  roots    the addresses published as entry points",
  "  refused  a put that broke a store law; every refusal carries its clause",
  "  verify   re-hash and re-decode everything reachable",
].join("\n")

const cas = Command.make("cas").pipe(
  Command.withDescription(
    `a content-addressed store as a data structure\n\n${vocabulary}`,
  ),
  Command.withSubcommands([init, status, ls, show]),
)

BunRuntime.runMain(
  Command.run(cas, { version: "0.1.0" }).pipe(
    Effect.provide(BunServices.layer),
  ),
)
