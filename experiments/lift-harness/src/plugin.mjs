// The oxc engine's OXLINT surface — a thin wrapper, nothing more.
//
// The recognition logic lives in `./oxc-engine.mjs` and is shared with the
// test suite's in-process surface (oxc-parser's `parseSync`). That sharing
// is deliberate and is not a gate weakness: the two surfaces are two ways
// to INVOKE one engine, and the agreement gate compares that engine against
// the independent `lift.ts` (ck) engine. A suite that re-implemented the
// recognizer would be testing a third thing and proving nothing about this
// one.
//
// DSL v0 — the store-language lift on the effect-oxlint chassis (grill
// ruling 2026-08-28: parser-spined, oxc hot path). Each candidate
// declaration yields ONE diagnostic whose message is the canonical-JSON
// verdict — evidence, not lint style; hoover-side under the direction law.
import * as Effect from 'effect/Effect';
import { Diagnostic, Plugin, Rule, RuleContext } from 'effect-oxlint';
import { canonJson, recognizeProgramWithNodes } from './oxc-engine.mjs';

const liftRule = Rule.define({
  name: 'lift',
  meta: Rule.meta({ type: 'suggestion', description: 'store-language v0 lift verdicts as evidence diagnostics' }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Program: (program) => {
        const found = recognizeProgramWithNodes(program);
        if (found.length === 0) return Effect.void;
        return Effect.forEach(found, ({ node, verdict }) =>
          ctx.report(Diagnostic.make({ node, message: canonJson(verdict) })));
      },
    };
  },
});

export default Plugin.define({
  name: 'dslv0',
  specifier: 'dslv0',
  rules: { lift: liftRule },
});
