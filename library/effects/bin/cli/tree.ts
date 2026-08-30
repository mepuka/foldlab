/**
 * THE command tree — the value `bin/cas.ts` hands to the runner, and
 * the same one `test/Cli.test.ts` drives.
 *
 * It lives here rather than in the entry point because the entry point
 * runs it on import: a suite that wants to exercise the real surface
 * has to be able to hold the tree without starting a program. Composing
 * a second tree in the test file was the alternative, and a second tree
 * is a second thing to keep in step — the verb list, the description,
 * and the vocabulary block all silently diverge the moment one of them
 * moves.
 *
 * Help carries the vocabulary (the everyday register) beside the
 * commands, seeded from VOCABULARY.md — one coherent surface, per the
 * vocabulary law.
 */
import { Command } from "effect/unstable/cli"
import { doctor, init, ls, publish, put, serve, show, status, verify } from "./commands.ts"
import { vocabulary } from "./vocabulary.ts"

export const cas = Command.make("cas").pipe(
  Command.withDescription(
    `a content-addressed store as a data structure\n\n${vocabulary}`,
  ),
  // Roughly the order a newcomer meets them: make a store, ask what it
  // is, ask whether it is well, put something in, name it, look.
  Command.withSubcommands([
    init,
    status,
    doctor,
    put,
    publish,
    ls,
    show,
    verify,
    serve,
  ]),
)
