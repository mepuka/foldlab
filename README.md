# Foldlab

Fold.lab is a personal research workbench maintained by Mepuka Kessy. 

The premise is straightforward: I like typed functional programming, I have spent a lot of time writing TypeScript with [Effect](https://effect.website/), and I have recently developed an unhealthy fascination with interactive theorem proving in Lean 4. This repository is where those interests collide. I also have a strong hunch we'll (ahem our agents) will be writing code that looks like this more than it does the popular high level languages today in the not so far future 

Apologies in advance for the mess. Things here are actively being constructed, broken, and refactored.

## Effects, Content Addressed Storage, Verification



If you work with Effect, you already know the basic separation: an effect is not the execution of a side effect, but an immutable description of one—a recipe specifying what operations to run, what environment is required, and what errors might occur.

A continuation is simply the answer to "what comes next?" When an operation yields a result, the continuation is the function waiting to receive that value and decide the subsequent step. When you represent an entire program as a free tree of operations and continuations, execution becomes a matter of interpretation:

- **Multiple semantics:** The same operation tree can be interpreted by Lean 4 as a pure mathematical transition over an abstract store to prove correctness theorems, or handed to a TypeScript runtime where Effect executes real async IO, fibers, and interruptions.
- **Content-addressing:** Because programs and data schemas are first-order values rather than opaque runtime closures, they can be canonicalized, hashed, and stored in a content-addressed storage (CAS) layer.

- **Gated boundaries:** Rather than attempting to formally verify the entire TypeScript compiler or Node runtime, the algebraic core is proved in Lean, the TypeScript types and wire schemas are generated from that model, and byte-level identity gates ensure the two never diverge.

## What has been built so far

- **Formally verified SHA3-512 in Lean 4** ([`formal/fips202`](formal/fips202/)): (Disclosure: I'm a total noob) A bit-level specification directly transcribed from the NIST FIPS 202 standard, an executable lane-level implementation, and a machine-checked refinement proof (`sha3_512_bridge`) establishing equivalence on all inputs. To my knowledge, this is the first complete Lean 4 proof linking an executable SHA3-512 implementation to the formal FIPS 202 specification.
- **The CAS store language** ([`library/cas`](library/cas/)): WIP: CAS as an effect? Effects as CAS? I think its all the same from the math's perspective. At any rate Lean 4 makes this very fun. A hash store as Algebraic effects semantics (`put`, `load`, `fail`), complete with execution handlers, defunctionalized code points, and a WIP: Seemless Effect4 interop from Lean4 ... also using a CAS

## Comments or advice welcome 

If you enjoy functional programming, algebraic effects, formal methods, or finding practical ways to make software verifiable without sacrificing developer ergonomics, feel free to reach out, open an issue, or start a discussion.

## License

Code is licensed under Apache-2.0 ([LICENSE](LICENSE)); documents under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
