/**
 * The runner, wearing the everyday register.
 *
 * ## Why this module exists
 *
 * Every refusal a VERB raises already reads in house words: the
 * `userFacing` fold in `commands.ts` turns it into a `CliError.UserError`,
 * and the runner prints that alone — no help document (`Command.ts:2699`,
 * `showUserError`). The audit's grade-D rows were the refusals raised
 * BEFORE a verb runs, by the runner's own parser, which arrive as
 * `CliError.ShowHelp` and are printed as a twenty-line help dump with
 * the one useful sentence at the bottom.
 *
 * Two things are done about that, in this order.
 *
 * FIRST, and mostly: judgment was moved out of the parser. A tag byte
 * and a file that must exist are the ESTATE's laws, not the shape of an
 * argument vector, so `commands.ts` takes a plain integer and a plain
 * string and rules on them inside the handler — where `userFacing`
 * already answers at grade A. That is not a workaround; it is the
 * correct seam, and it is what removes the help dump from every row of
 * the audit's transcript.
 *
 * SECOND, for what genuinely remains — a flag that does not exist, a
 * missing argument, a misspelled verb — this module answers in the same
 * register. The runner offers no hook for it: `showHelp`
 * (`Command.ts:2684-2696`) writes the help document with an
 * UNCONDITIONAL `Console.log`, and `renderErrors: false` suppresses
 * only the error block beneath it, so catching `ShowHelp` downstream of
 * `Command.run` is too late — the dump is already on stdout. The one
 * seam that reaches that line is `CliOutput.Formatter`, which
 * `showHelp` resolves from the context.
 *
 * So the formatter here DEFERS instead of printing: it keeps the
 * document and returns nothing, and this module decides afterwards what
 * the invocation deserved. A `ShowHelp` carrying no errors is help that
 * was asked for — `cas --help`, or `cas` with no verb — and the held
 * document is printed in full. A `ShowHelp` carrying errors is a
 * refusal, and it gets the clause, the guidance, and the one usage line
 * that is actually relevant.
 */
import { Console, Effect, Option, Runtime } from "effect"
import { CliError, CliOutput, Command } from "effect/unstable/cli"
import type { HelpDoc } from "effect/unstable/cli"

/** The verbs a parent command offers, flattened out of the help
 * document's groups — what a misspelled verb is answered with. */
const verbsOf = (doc: HelpDoc.HelpDoc): ReadonlyArray<string> =>
  (doc.subcommands ?? []).flatMap((group) => group.commands.map((command) => command.name))

/** The flags a command takes, spelled as a reader would type them. The
 * runner's own globals are left out: a reader who mistyped `--store`
 * needs this verb's flags, not `--completions`. */
const flagsOf = (doc: HelpDoc.HelpDoc): ReadonlyArray<string> =>
  doc.flags.map((flag) => `--${flag.name}`)

/** A list, in prose, with no trailing punctuation to fight the line
 * it sits in. */
const listed = (items: ReadonlyArray<string>): string => items.join(", ")

/**
 * One parser refusal in the everyday register: the clause first, then
 * what would have been right. The runner's own message is used verbatim
 * only where it is already a plain sentence and there is nothing this
 * estate can add — never as a substitute for saying the fix.
 */
const refusalLines = (
  error: CliError.NonShowHelpErrors,
  doc: HelpDoc.HelpDoc,
): ReadonlyArray<string> => {
  switch (error._tag) {
    case "UnrecognizedOption": {
      const known = flagsOf(doc)
      return [
        `no such flag: ${error.option}`,
        known.length === 0
          ? `${doc.usage.split(" ")[0] ?? "this verb"} takes no flags of its own`
          : `this verb takes: ${listed(known)}`,
        ...(error.suggestions.length > 0 ? [`did you mean ${listed(error.suggestions)}?`] : []),
      ]
    }
    case "UnknownSubcommand": {
      const verbs = verbsOf(doc)
      return [
        `no such verb: ${error.subcommand}`,
        ...(verbs.length > 0 ? [`the verbs are: ${listed(verbs)}`] : []),
        ...(error.suggestions.length > 0 ? [`did you mean ${listed(error.suggestions)}?`] : []),
      ]
    }
    case "MissingArgument":
      return [
        `missing ${error.argument}`,
        ...(doc.args ?? []).filter((arg) => arg.name === error.argument).flatMap((arg) =>
          Option.match(arg.description, { onNone: () => [], onSome: (text) => [text] })
        ),
      ]
    case "MissingOption":
      return [`missing the ${error.option} flag`]
    case "UnexpectedArgument":
      return [
        `too many arguments: ${listed(error.arguments)}`,
        "this verb takes the ones its usage line names, and no more",
      ]
    case "InvalidValue":
      return [
        `${error.kind === "flag" ? error.option : `<${error.option}>`} will not take "${error.value}"`,
        error.expected,
      ]
    case "DuplicateOption":
    case "UserError":
      // A `UserError` reaching here was raised during parsing rather
      // than by a verb, and its message is already this estate's own.
      return error.message.split("\n")
    }
}

/** The refusal as the runner's formatter would have laid it out — the
 * same ERROR heading and two-space indent every other refusal in this
 * CLI already uses, so the register does not change with the source of
 * the complaint. The blank line above it is the one the runner has
 * already written by the time this is rendered. */
const renderRefusal = (
  errors: ReadonlyArray<CliError.NonShowHelpErrors>,
  doc: HelpDoc.HelpDoc,
): string =>
  [
    ...errors.flatMap((error) => refusalLines(error, doc)),
    `usage: ${doc.usage}`,
  ].map((line) => `  ${line}`).join("\n")

/**
 * A refusal, written and then marked as written.
 *
 * `renderErrors: false` is what keeps the runner from writing the error
 * block under the help document it was not supposed to print — but the
 * same switch also turns off its rendering of `UserError`
 * (`Command.ts:3102-3108`), which is the good path every verb here
 * already takes. So it is done here instead, in the runner's own two
 * steps: write the message, then mark it reported, so the runtime does
 * not print it a second time as an unhandled failure.
 *
 * `leadIn` is the blank line that separates a refusal from the command
 * above it, and it is a parameter because who owes it differs: on the
 * `UserError` path nothing has been written yet, and on the `ShowHelp`
 * path the runner has already written one.
 */
const showRefusal = (
  message: string,
  error: CliError.CliError,
  leadIn: string,
): Effect.Effect<void> =>
  Console.error(`${leadIn}ERROR\n${message}`).pipe(
    Effect.andThen(Effect.sync(() => {
      ;(error as { [Runtime.errorReported]?: boolean })[Runtime.errorReported] = false
    })),
  )

/**
 * Run the command tree over an argument vector, answering every
 * refusal in the everyday register.
 *
 * The held document is a local `let` rather than a `Ref` on purpose:
 * `CliOutput.Formatter` is a record of SYNCHRONOUS functions, so there
 * is no effect to run inside it, and the cell lives and dies inside one
 * invocation of this function.
 */
export const runCas = <Name extends string, Input, E, R, ContextInput>(
  command: Command.Command<Name, Input, ContextInput, E, R>,
  options: { readonly version: string },
) =>
(args: ReadonlyArray<string>) => {
  let held: HelpDoc.HelpDoc | undefined
  const base = CliOutput.defaultFormatter()
  const deferring: CliOutput.Formatter = {
    ...base,
    formatHelpDoc: (doc) => {
      held = doc
      return ""
    },
  }
  /** The document the runner tried to print, printed. */
  const releaseHeld = Effect.suspend(() =>
    held === undefined ? Effect.void : Console.log(base.formatHelpDoc(held))
  )
  return Command.runWith(command, { ...options, renderErrors: false })(args).pipe(
    // Success with a held document is help that was asked for: the
    // `--help` flag prints through the same formatter (`GlobalFlag.ts`),
    // and it is the only thing that reaches here having stored one.
    Effect.tap(() => releaseHeld),
    Effect.tapError((error) => {
      if (!CliError.isCliError(error)) return Effect.void
      if (error._tag === "UserError") {
        // The estate's own multi-line refusals already carry the
        // two-space indent on their continuation lines, so only the
        // first needs one — exactly what the runner's formatter does.
        // Nothing has been written yet on this path, so the blank line
        // that separates a refusal from the command above it is ours.
        return showRefusal(`  ${error.userMessage ?? String(error.cause)}`, error, "\n")
      }
      if (error._tag !== "ShowHelp") return Effect.void
      // No errors beneath it means the document IS the answer: `cas`
      // with no verb, whose help is what a bare invocation should
      // print. Errors beneath it mean a refusal, and a refusal is not
      // a help request.
      if (error.errors.length === 0) return releaseHeld
      // The runner has already written one blank line here — the empty
      // string the deferring formatter handed its `Console.log` — so
      // this path must not write a second.
      return Effect.suspend(() =>
        held === undefined
          ? Effect.void
          : showRefusal(renderRefusal(error.errors, held), error, "")
      )
    }),
    Effect.provideService(CliOutput.Formatter, deferring),
  )
}
