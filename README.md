# Foldlab

Hi! I'm Mepuka Kessy.

This is my personal playground. I've always loved functional programming, and lately I've become fascinated with formal verification in Lean 4. At the same time, I've spent a lot of time in the TypeScript ecosystem building with [Effect](https://effect.website/). Foldlab is where I experiment with bringing those two worlds together.

Fair warning: this repository is very much an active workbench. Excuse the mess while things are being built, torn down, and reorganized!

## The idea

If you've used Effect, you're already familiar with the idea of separating *describing* a computation from *running* it. An effect is basically a recipe: a plain data structure that says "here are the operations I want to perform and what kinds of errors or environments they need," without actually executing network calls or disk writes on the spot.

Continuations are the other side of that coin. When an operation finishes, what happens next? A continuation is just the function that takes that result and keeps going. When you treat programs as trees of operations and continuations, you can do some pretty neat things:

1. **Interpret them in different ways.** In Lean, I can define a purely mathematical reference semantics and prove theorems about how a program behaves. In TypeScript, I can hand the exact same operations to an Effect runtime with real fibers, concurrency, and error handling.
2. **Content-address them.** Because the operations and data shapes are just values, you can hash them, store them in a content-addressed store (CAS), and know that the code and the data it touches are tied together mechanically.
3. **Verify the seams.** Instead of trying to formally verify an entire massive TypeScript runtime, you prove the small, core algebraic model in Lean, generate the TypeScript and wire interfaces from that model, and use byte-level conformance checks to make sure nothing drifts.

## What's here so far

- **First formally verified SHA3-512 in Lean 4** ([`formal/fips202`](formal/fips202/)): A bit-level transcription of the NIST FIPS 202 specification in Lean, an executable implementation, and a machine-checked proof (`sha3_512_bridge`) showing that they produce the exact same bytes for every possible input. To my knowledge, this is the first complete Lean 4 proof of an executable SHA3-512 against the FIPS 202 spec.
- **The CAS store language** ([`library/cas`](library/cas/)): A Lean 4 model of a content-addressed store expressed as an effects language. It models operations (`put`, `load`, `fail`), execution handlers, and program representations, while generating TypeScript types, programs, and MCP tool manifests under byte-identity gates.
- **Effect lift harness** ([`experiments/lift-harness`](experiments/lift-harness/)): Tooling to recognize and lift straight-line Effect programs from real TypeScript code into store-language operations, cross-checked between the TypeScript compiler API and an oxc linter rule.
- **The real-world Effect corpus** ([`experiments/parser-census`](experiments/parser-census/)): A pinned collection of open-source Effect repositories across different API generations to test how real-world code patterns match up with our models.

## Get in touch

If you're interested in functional programming, Lean 4, algebraic effects, or verifying practical software systems, I'd love to chat! Please feel free to reach out, open an issue, or start a discussion.

## License

Code is licensed under Apache-2.0 ([LICENSE](LICENSE)); documents under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
