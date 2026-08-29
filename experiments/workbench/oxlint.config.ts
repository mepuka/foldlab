/**
 * Two houses, intersected at the stricter reading.
 *
 * The estate's posture (library/effects/oxlint.config.ts) puts every
 * signal category at error and leaves `restriction`/`nursery` off. The
 * scaffolded foldkit project instead turns `correctness` OFF and relies
 * on the framework's own rules. Turning a category off is not something
 * the estate does, so the categories stay at error and the foldkit rules
 * are added on top.
 *
 * `style` stays off for the same reason it is off in library/effects:
 * its rules (kebab-case filenames, no-ternary, sort-keys) contradict
 * ratified estate conventions.
 *
 * Deliberately ABSENT: `oxlint-plugin-effect`. library/effects runs it
 * with a long ledger of per-rule exemptions worked out against a mature
 * tree. Importing that preset into an empty package would produce a
 * ledger of exemptions for code nobody has written. The first module
 * that is Effect-heavy rather than foldkit-heavy is when to add it.
 */
import { defineConfig } from "oxlint"

export default defineConfig({
  jsPlugins: [{ name: "foldkit", specifier: "@foldkit/oxlint-plugin" }],
  plugins: ["typescript", "unicorn", "oxc"],
  categories: {
    correctness: "error",
    suspicious: "error",
    pedantic: "error",
    perf: "error",
  },
  rules: {
    "no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      },
    ],
    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-assertions": ["error", { "assertionStyle": "never" }],
    // Effect/foldkit idiom: `_tag` is the discriminator, not a private field.
    "no-underscore-dangle": ["error", { "allow": ["_tag"] }],
    // Schema class+type declaration merging is the Effect idiom.
    "no-redeclare": "off",
    // Error families per module are the Effect idiom (same ruling as
    // library/effects): a tagged-error class and its service class belong
    // in the file that owns the boundary.
    "max-classes-per-file": "off",
    // False positive on Effect. The rule matches `.catch(` as a promise
    // chain; `Effect.catch` is a combinator passed to `pipe`, and there is
    // no promise anywhere in the expression.
    "unicorn/prefer-top-level-await": "off",
    "foldkit/no-noop-message": "error",
    "foldkit/got-submodel-message-name": "error",
    "foldkit/got-prefix-requires-submodel-payload": "error",
    "foldkit/no-empty-commands-array": "error",
    "foldkit/no-empty-to-parent-out-message": "error",
    "foldkit/no-empty-object-tagged-call": "error",
    "foldkit/prefer-callable-message-constructor": "error",
    "foldkit/command-binding-matches-name": "error",
    "foldkit/no-module-level-mutable-state": "error",
  },
  ignorePatterns: ["dist", "node_modules", "**/*.d.ts"],
  overrides: [
    {
      // The runtime boundary. `document.getElementById` is foldkit's
      // documented container form and is typed `HTMLElement | null`,
      // which is what `container` accepts; `querySelector` widens it to
      // `Element | null` and stops compiling.
      files: ["src/entry.ts"],
      rules: { "unicorn/prefer-query-selector": "off" },
    },
  ],
})
