# Kernel Formal Specification: proof audit, countermodels, and primary sources

Audit date: 2026-08-11

This note audits **every numbered clause, axiom, theorem, proposition,
corollary, proof obligation, cost claim, residue, and open problem** in
[*The Kernel: A Formal Specification*](../SPEC.md). External claims use primary
sources only: RFCs, NIST publications, official NATS documentation and tagged
source/tests, and original or peer-reviewed research papers. Self-contained
claims receive explicit proofs or countermodels below. Implementation claims
are checked against the current source and executable gates, but a passing law
suite is never promoted from falsification evidence to a universal proof.

The authoritative paste and `docs/SPEC.md` are text-identical after newline
normalization. The audit therefore covers the requested document exactly.

## Classification

- **Supported** — the claim follows from the cited source within the scope
  stated in the specification.
- **Conditional** — the claim is defensible only after adding the listed
  precondition or restricting its scope.
- **Overstated** — the source supports a narrower claim than the prose makes.
- **False** — a counterexample exists under the document's own definitions or
  the cited substrate expressly does not provide the claimed property.
- **Assumption** — the claim is intentionally posited rather than derived.
- **Open problem** — the document supplies neither a construction nor a proof;
  no source is treated as closing it.

## Executive findings

The specification has a sound core: deterministic canonical bytes, hash-linked
chains under a collision assumption, prefix verification, pure replay, and
write-once outcomes are all defensible after their domains are made precise.
The following statements are not presently proved to academic rigor:

1. **The JCS value domain is too broad.** Section 1.1 excludes lone surrogates
   but admits Unicode noncharacters, while I-JSON excludes both. The declared
   total function `enc : V -> Sigma*` is therefore not RFC 8785 JCS on all of
   `V`.
2. **E1 needs an explicit signed-zero ruling.** RFC 8785 serializes both IEEE
   754 `+0` and `-0` as `0`; its verified erratum calls this out. E1 is false if
   those are distinct members of `V`. Exclude `-0` or define numeric equality
   modulo signed zero.
3. **Generic JetStream KV does not satisfy K3.** Official NATS documentation
   says direct KV gets can be served by followers or mirrors and do not provide
   read-your-writes. K3 requires R1/no mirror or an explicit leader-served read
   path.
4. **The fencing theorem in 6.3 does not follow from per-key CAS.** A stale
   committer can read fence `f`, a thief can update the claim key to `f+1`, and
   the stale committer can then create the distinct outcome key. Per-key
   linearizability provides no atomicity across those two keys.
5. **“Proof of execution” is too strong.** A hash-linked journal proves record
   integrity relative to an anchor and deterministic recomputation. It does not
   prove that an external effect occurred or that an observation was truthful.
6. **“Spawn is idempotent by construction” contradicts the admitted crash
   window.** Memoization makes the committed spawn outcome unique; it does not
   stop a spawn effect from running twice after a crash unless the target also
   deduplicates the plan identity atomically.
7. **The exactly-once impossibility claim is missing its boundary.** The
   indistinguishability argument is correct for an opaque external effect that
   cannot atomically commit with the journal and offers neither idempotency nor
   status lookup. It is false as a claim about every protocol: RIFL demonstrates
   exactly-once RPC semantics when the completion record and mutation are made
   durable atomically.
8. **The monadic-composition statement requires a monad morphism, and its
   refactoring conclusion requires stable operation identity.** Neither follows
   merely from calling the syntax `Free(Op, A)`.
9. **Finite law suites are falsification evidence, not universal proof.** They
   can refute a theorem and provide regression evidence; they cannot by
   themselves establish refinement for every execution or every substrate
   behavior.
10. **Blind retry cannot distinguish “mine stored” from an identical foreign
    write.** Both executions leave the same immutable bytes at the position;
    read plus digest comparison decides only same bytes versus different bytes.
11. **A terminal head anchor detects a fully re-chained mutation but cannot
    locate its first divergence.** Exact localization requires the original
    bytes or intermediate trusted anchors.
12. **The implementation does not use the formal operation identity.** Journal
    facts use raw `executionId/name/attempt` strings, while guarded work uses
    SHA-256 over the raw string; neither is `id(work) = H(enc(work))` as defined
    in section 1.
13. **PO-19 through PO-22 are explicitly owed, and OP-1 through OP-5 are
    explicitly open.** No current executable suite proves P6/P7 composition,
    spawn, or cross-chain anchoring.

## Section-by-section audit

### Section 1 — values, canonical encoding, and identity

| Claim | Classification | Primary-source finding |
| --- | --- | --- |
| The JSON/JCS domain consists of finite JSON values with binary64 finite numbers and strings with no lone surrogates. | **False as stated.** | RFC 8785 requires input adapted to I-JSON ([RFC 8785 §3.1](https://www.rfc-editor.org/rfc/rfc8785.html#section-3.1)). I-JSON also forbids Unicode noncharacters, not only surrogate code points ([RFC 7493 §2.1](https://www.rfc-editor.org/rfc/rfc7493.html#section-2.1)). `V` currently admits those noncharacters. The exclusions of NaN, infinities, duplicate map keys, and lone surrogates are supported. |
| `enc` is RFC 8785 JCS: no whitespace, ECMAScript primitive serialization, recursively sorted raw property names by unsigned UTF-16 code units, UTF-8 output. | **Supported on the corrected I-JSON domain.** | These are the explicit rules in [RFC 8785 §§3.2.1–3.2.4](https://www.rfc-editor.org/rfc/rfc8785.html#section-3.2). RFC 8785 is Informational, not Standards Track, but uses normative conformance language. |
| E1: JCS is injective on `V`. | **Conditional.** | The verified [RFC 8785 erratum 7920](https://www.rfc-editor.org/errata/eid7920) records that `-0` is a valid JSON number but serializes as `0`. Thus `enc(+0) = enc(-0)`. E1 holds only if `-0` is excluded or `+0` and `-0` denote the same value in `V`. It also requires maps to have unique names and strings to be compared as exact, unnormalized Unicode sequences. |
| E2: parse after encode is identity, and encode after parse is identity on canonical bytes. | **Conditional/project definition.** | RFC 8785 specifies canonical serialization, not a distinct canonical-only parser. The retraction follows for a parser that rejects noncanonical bytes, duplicate names, invalid Unicode, out-of-domain numbers, and `-0` according to the chosen ruling. The parser restriction is an additional project contract. |
| E3: conforming encoders in every language emit identical bytes for the same admitted value. | **Supported.** | Platform-independent canonical output is the purpose of deterministic property sorting and mandatory UTF-8 in [RFC 8785 §§1 and 3.2.4](https://www.rfc-editor.org/rfc/rfc8785.html). “Conforming” must include exact ECMAScript number formatting and the full input-domain checks. |
| SHA-256 has a 256-bit digest. | **Supported.** | [FIPS 180-4 §6.2](https://doi.org/10.6028/NIST.FIPS.180-4) specifies SHA-256 and its 256-bit result. Hex is merely an encoding of those 256 bits. |
| C1: feasible collision resistance of SHA-256. | **Assumption, correctly labeled.** | FIPS 180-4 specifies the function; it does not prove that no feasible collision attack exists. Content identity is computational, not literal mathematical injectivity. |
| A content hash is a location-independent, verifier-recomputable name, and names confer no authority. | **Supported with the collision and trusted-name assumptions.** | [RFC 6920 §10](https://www.rfc-editor.org/rfc/rfc6920.html#section-10) describes a hash name as a name-to-bytes integrity binding, warns that the proof is only as good as the integrity of the starting name, and expressly separates that binding from authority. |
| Exactly five sorts are content-addressed. | **Assumption/project policy.** | No external standard determines this enumeration. It is coherent as a closed project vocabulary, not a theorem. |

### Sections 2 and 4 — chains and state machines

These results are chiefly self-contained mathematics rather than claims owed to
an external authority.

| Claim | Classification | Reason |
| --- | --- | --- |
| Equal final digest and equal length determine an equal linked history. | **Supported, conditional on E1 and C1.** | Reverse induction is valid: equality of terminal entry digests yields equality of the entries under the collision assumption; equal `prev` fields then recurse. The digest is a commitment to bytes, not by itself a proof that the bytes exist or are available. |
| Incremental `stepVerify` accepts exactly linked chains and agrees with whole-chain verification. | **Supported.** | This follows by induction on the list prefix. “Fold fusion” is a proof technique, but the one-line proof should explicitly state the base and inductive cases for academic completeness. |
| A cursor proves a verified prefix. | **Conditional.** | It is a checkable claim only when the verifier also has the exact bytes and a trusted starting anchor. It says nothing about an omitted suffix. |
| `E*` acts on `S` through repeated `evolve`, and suffix evolution equals cold replay. | **Supported.** | Extending a total event transition to finite event lists by `foldl` gives the free-monoid action. Incremental equivalence additionally assumes the cached state is the fold of exactly the consumed prefix and the suffix is applied once. |
| Reachable states are in bijection with `E*/~`, where histories are equivalent when replay states match. | **Supported.** | This is the standard quotient-by-kernel construction: equivalence classes correspond exactly to the image of `replay`, i.e. reachable states. |

Calling a head a “proof-carrying name” is **overstated terminology**. A head is
a compact commitment. Verification still requires the history bytes, an anchor
whose integrity is independently established, the canonicalization rule, and
the hash assumption.

### Section 3 — JetStream log and register substrates

#### Log substrate

| Claim | Classification | Primary-source finding |
| --- | --- | --- |
| JetStream stream publications are linearizable. | **Supported.** | Official [JetStream consistency documentation](https://docs.nats.io/nats-concepts/jetstream) identifies writes to a stream as linearizable and explains that a single publication is the unit replicated and voted on. This does not make a multi-key or multi-message protocol atomic. |
| `Nats-Expected-Last-Subject-Sequence` provides subject-level optimistic concurrency control. | **Supported.** | The official [JetStream header reference](https://docs.nats.io/nats-concepts/jetstream/headers) defines the expectation and version. Tagged server tests cover [create-only expectation 0](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_test.go#L11020-L11061) and [concurrent contenders](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_test.go#L16182-L16262). |
| The pinned single-subject stream models J1. | **Conditional.** | It does so only if sequence starts at 1, messages cannot be removed, configuration and ACLs are frozen, and no foreign publisher can bypass the expectation header. JetStream supplies the primitive; the restricted interface and deployment policy supply the rest of J1. |
| Deny-delete, deny-purge, and unlimited retention make successful appends immutable forever (J2). | **Conditional.** | Official [stream configuration documentation](https://docs.nats.io/nats-concepts/jetstream/streams) confirms that the flags reject message delete/purge and that limits govern eviction. They do not prevent deleting or reconfiguring the entire stream. J2 therefore holds only inside the restricted append/read API and an ACL that withholds stream administration. |
| An acknowledged file-store append survives crash-stop of every process (J3). | **Conditional/assumption.** | Official [JetStream durability documentation](https://docs.nats.io/nats-concepts/jetstream) says file writes are synchronously flushed to the OS, but default operation does not immediately `fsync`; acknowledged data may be lost on an OS/power/storage failure. The stated process-crash model is defensible with intact OS storage. A stronger physical-failure reading needs `sync_interval: always` and, for independent failure domains, replication. |
| Blind retry decides the three origins “mine-stored / byte-identical duplicate / foreign-conflict.” | **False as a three-way decision; supported as a two-way byte decision under J1/J2 and a leader-consistent read.** | If exactly one immutable byte string occupies the position, comparison decides `stored == proposed` versus `stored != proposed`. It cannot reveal which process wrote identical bytes. The normal non-direct message-get path has an explicit [leader check](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_api.go#L3354-L3398). Administrative deletion, eviction, foreign writes, or stale reads invalidate even the two-way argument. |
| At standalone R1, subject CAS is checked before message-id deduplication. | **Supported only with “standalone/nonclustered” stated explicitly.** | In v2.14.4 the nonclustered path checks [subject expectation first](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L6440-L6466) and [deduplication later](https://github.com/nats-io/nats-server/blob/v2.14.4/server/stream.go#L6671-L6693). The clustered path does [deduplication first](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_batching.go#L609-L633) and [CAS later](https://github.com/nats-io/nats-server/blob/v2.14.4/server/jetstream_batching.go#L762-L817). Replication factor 1 alone does not logically mean the nonclustered path. |
| `nats-server >= 2.14.4` is an available pinned baseline. | **Supported.** | The official [v2.14.4 release/tag](https://github.com/nats-io/nats-server/releases/tag/v2.14.4) is dated 2026-07-30. The source above is pinned to that tag. The claim that 2.14.4 is the earliest version with subject CAS is false; the official header reference dates that header to 2.3.1. |
| Oversized values are a named residue. | **Supported.** | NATS enforces server payload and stream message-size limits; see the official [server configuration](https://docs.nats.io/running-a-nats-service/configuration) and [stream limits](https://docs.nats.io/nats-concepts/jetstream/streams). |

#### Register substrate

| Claim | Classification | Primary-source finding |
| --- | --- | --- |
| KV `create(k,v)` is write-once. | **Conditional.** | The Go client implements create using expected subject revision zero ([nats.go v1.53.1 `Create`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1061-L1092)). However, official KV semantics permit deletion and `Create` can resurrect a deleted key. “Ever” requires a deletion-free restricted interface, TTL zero, and stable retention. |
| KV `get` returns value plus revision. | **Supported.** | See the tagged [`Get` implementation](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L925-L1017). |
| KV `cupdate(k,v,rev)` succeeds only if `rev` is current. | **Supported for the write.** | The tagged [`Update` implementation](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L1116-L1150) publishes with the expected last subject revision and reports a mismatch. |
| K3: `create`, `get`, and `cupdate` are all linearizable per key; “JetStream KV models K.” | **False without an additional read rule.** | Official [KV consistency documentation](https://docs.nats.io/nats-concepts/jetstream/key-value-store) says direct gets can be served by followers or mirrors and do not guarantee read-your-writes. The Go client configures KV streams with [`AllowDirect=true`](https://github.com/nats-io/nats.go/blob/v1.53.1/jetstream/kv.go#L672-L690). Writes are linearizable; generic reads are not. K3 becomes defensible for R1/no mirror or a leader-served get implementation. |

This qualification is material: Herlihy and Wing define linearizability by
equivalence to a legal sequential history that respects real-time precedence
([original paper](https://www.cs.columbia.edu/~wing/publications/HerlihyWing90.pdf)).
A read invoked after a completed write cannot legally return the earlier value.

### Section 5 — journaled interpretation

| Claim | Classification | Primary-source finding or proof assessment |
| --- | --- | --- |
| A program can be represented as a free monad over an operation signature. | **Supported.** | Swierstra's original “Data types à la carte” work explicitly uses free monads to assemble effect syntax ([DOI](https://doi.org/10.1017/S0956796808006758)). The free construction gives a unique monad morphism from an operation interpretation; see Piróg and Wu's formal treatment of [free-monad folds](https://research-information.bris.ac.uk/ws/files/87127912/Nicolas_Wu_String_Diagrams_for_Free_Monads.pdf). |
| All nondeterminism and effects occur through `Op`. | **Assumption, correctly labeled.** | The free-monad representation does not enforce this property for arbitrary host-language code. It requires a closed effect surface or a separate static/dynamic proof. |
| Operation identity from `(executionId,name,attempt)` is content rather than position. | **Supported as a definition; schedule independence is open.** | Content hashing makes the tuple's name position-independent. It does not prove the tuple itself is stable under concurrency, retries, renaming, or refactoring; the document correctly leaves unrestricted concurrency as OP-5. |
| Fixed complete facts make sequential replay deterministic. | **Conditional.** | The free-monad induction works when the program spine and continuation are total deterministic functions, every dynamic operation has a stable unique `opId`, facts define a unique value for each visited ID, decoding is deterministic, and the program terminates. Parallel/race constructs require their scheduling decisions or winners to be facts as well; they are not proved by the sequential `Free(Op)` induction. |
| At most one fact outcome is committed per `opId` by J1/J2 and adoption. | **Conditional; proof sketch incomplete.** | J1 is uniqueness per *position*, not per `opId`. The result can be proved for the stated interpreter only by an additional earliest-counterexample argument: every contender either loses at the winning position and observes/adopts the key, or must verify through that position before trying a later one and therefore takes rule 1. The specification's sentence “first commit wins by J1 + J2” omits that essential invariant. Defining `memo` to keep the first pair makes the map functional by definition but does not prove the journal contains no later conflicting pair. |
| No protocol can achieve exactly-once execution of an external effect after a crash between effect and fact commit. | **Overstated; conditional impossibility.** | The indistinguishability proof is valid for an opaque external effect that cannot participate in the same atomic commit and exposes neither an idempotency key nor authoritative status lookup. It is not universal. RIFL obtains exactly-once RPC semantics by durably recording the RPC ID/result atomically with the operation's mutations ([Lee et al., SOSP 2015](https://web.stanford.edu/~ouster/cgi-bin/papers/rifl.pdf), [DOI](https://doi.org/10.1145/2815400.2815416)). The theorem must state the nontransactional, non-idempotent, non-queryable boundary. |
| Crash-free deterministic evaluation agrees with the live oracle. | **Conditional.** | The proof is valid for a single writer when every append succeeds, operation identity is stable, and the journal itself introduces no visible result difference. “Crash-free” alone does not rule out storage/network failure or a nondeterministic host-language spine. |
| Recording observation/gate/sleep outcomes makes execution deterministic forever. | **Overstated.** | Recorded inputs make replay deterministic under a fixed program, stable operation naming, available untampered facts, stable decoding/canonicalization rules, and C1. “Forever” elides program evolution, unavailable facts, compromised anchors, and OP-5. |

### Section 6 — effector and fencing

| Claim | Classification | Primary-source finding or proof assessment |
| --- | --- | --- |
| A monotonically increasing sequencer/fence lets a protected resource reject stale lock holders. | **Supported as a protocol pattern.** | Chubby lock holders pass a sequencer containing the lock generation to the protected server, which is expected to validate it before acting ([Burrows, OSDI 2006, §2.4](https://research.google.com/archive/chubby-osdi06.pdf)). Crucially, the protected resource performs the validation on the protected operation. |
| K1 on the outcome register gives one committed result value per work digest. | **Supported under deletion-free K1.** | A write-once outcome key admits at most one successful creation. Equal-byte retries can be classified idempotently after a leader-consistent read. |
| 6.3: checking the current claim fence and then creating a separate outcome key refuses every stale holder after a newer claim linearizes. | **False.** | Counterexample: stale holder reads claim fence `f`; a thief CAS-updates the claim key to `f+1`; stale holder then successfully creates the empty outcome key. K1–K3 are per key and supply no atomicity between the claim read and outcome create. Chubby avoids this exact logical gap by requiring the protected server to validate the sequencer as part of the protected request. Repair requires one atomic same-key state transition, a transaction coupling claim revision to outcome creation, or a different outcome-selection rule with a proof. |
| Expired work is eventually claimable under partial synchrony. | **Assumption, correctly labeled but underspecified.** | Lease liveness additionally requires eventual substrate availability, fair retries, and a clock model sufficient to compare expiry. The original lease paper treats leases as time-based rights and separates fault-tolerance assumptions from performance ([Gray and Cheriton, SOSP 1989](https://www.cs.cmu.edu/afs/cs.cmu.edu/academic/class/15712-s12/www/papers/gray89.pdf)). Partial synchrony alone does not imply a particular client's retry fairness. |
| Failure-free guarded execution runs each body exactly once system-wide. | **Conditional.** | It holds only while the lease remains live for the entire body/commit interval, exactly one claim holder exists, and no caller bypasses the effector. A long-running body without renewal can outlive its lease even in a failure-free run. Agreement also inherits the journal and read-consistency conditions above. |
| With failures, re-execution is bounded by claim generations. | **Conditional.** | This requires at most one body start per successful claim generation and a finite number of successful steals. It is not a finite bound if the environment permits unbounded crashes/lease expirations. |

### Section 7 — trust, tamper evidence, and execution records

| Claim | Classification | Primary-source finding or proof assessment |
| --- | --- | --- |
| A trusted `(seq, head)` detects modification/reordering/forgery of its anchored prefix **at the exact first divergent position**. | **Detection is supported under canonical decoding and C1; exact localization from the terminal anchor alone is false.** | A fully re-chained alternative prefix is structurally valid and fails only when its recomputed terminal head is compared with the anchor. The verifier can locate the first divergence only if it also has the original bytes or trusted intermediate anchors. The anchor must itself arrive with integrity. RFC 6920 makes that boundary explicit ([RFC 6920 §10](https://www.rfc-editor.org/rfc/rfc6920.html#section-10)). |
| `(journal, claimed result)` is a proof of execution. | **False as phrased.** | Two worlds produce the same record: in one the external effect occurred and returned `o`; in the other a writer recorded `o` without performing the effect. Chain verification and deterministic replay cannot distinguish them. The record proves *integrity and internal replay consistency relative to an anchor*, not occurrence or truth of external events. Proving occurrence needs trusted attestation, a signed receipt from the effect authority, or an atomic authoritative-system transaction. |
| Hash chains cannot detect stale-prefix omission or split views without external anchoring/gossip. | **Supported.** | [RFC 9162 §11.3](https://www.rfc-editor.org/rfc/rfc9162.html#section-11.3) explains that a malicious log can present inconsistent views and that detecting them requires clients to compare authenticated heads (“gossip”). SUNDR's original fork-consistency result likewise detects server inconsistency only when clients observe each other's operations ([Li et al., OSDI 2004](https://www.usenix.org/conference/osdi-04/secure-untrusted-data-repository-sundr)). |
| Availability cannot be forced against an adversarial substrate. | **Supported/assumption boundary.** | Neither hashing nor canonicalization makes an unavailable object retrievable. RFC 6920 expressly gives no guarantee that named content is available from a mapped location. |

### Section 8 — composition

| Claim | Classification | Primary-source finding or proof assessment |
| --- | --- | --- |
| `I(W >>= f) = I(W) >>= (I . f)` and workflows form a Kleisli category. | **Conditional.** | A free-monad operation interpretation extends uniquely to a **monad morphism**, which then preserves unit and bind. An arbitrary evaluator called `I` need not do so. The equation also needs type-correct domains/codomains and explicit treatment of failure, interruption, and concurrency. |
| Refactoring across bind preserves recorded semantics. | **Overstated.** | Monad-law reassociation preserves denotation for a lawful monad morphism. Recorded semantics additionally require the refactor to preserve every dynamic operation's name, attempt rule, order where observable, and `opId`. The document's own OP-5 concedes that identity stability under unrestricted concurrency is unresolved. |
| Parallel workflows with disjoint `opId` spaces have an interleaving-independent final memo, while chain bytes remain order-dependent. | **Conditional and mathematically sound in the stated fragment.** | Independent write-once keys form a grow-only union, so permutation does not change the map. This requires genuinely disjoint keys, deterministic continuations, no “first completed wins” result, and no cross-branch reads of partial memo state. |
| “The CALM boundary runs exactly” at chain-position allocation. | **Overstated.** | The CALM theorem characterizes monotone queries and coordination-free relational-transducer computations in a particular formal model ([Ameloot, Neven, and Van den Bussche, JACM 2013](https://doi.org/10.1145/2450142.2450151)). It supports the intuition that grow-only disjoint facts converge without coordination. It does not prove this system's exact boundary; uniqueness of a shared position and any same-key first-winner property are nonmonotone and coordinated, while the application must first prove that all semantic outputs are monotone in the CALM model. |
| Cross-chain content anchors transitively authenticate a reachable closure (“Merkle DAG”). | **Conditional.** | Hash references compose integrity commitments if each referenced object/prefix is fetched and verified, every root anchor is trusted, reference interpretation is canonical, and the graph is acyclic. Availability and freshness still do not compose. “DAG” is an extra invariant; content addressing alone does not syntactically prohibit cycles. |
| Memoized spawn is idempotent by construction. | **False without target-side deduplication.** | A crash after the child is started but before the spawn fact is committed causes rule 2 to run spawn again, exactly as §5.7 admits for every external effect. Plan content identity enables idempotent target behavior only if the target atomically creates/looks up execution by that identity. |
| `programRef = id(enc(program))` is well-typed under §1. | **False as written.** | Section 1 defines `enc : V -> Sigma*` and `id = H . enc : V -> D`; therefore `id(enc(program))` passes bytes to a function whose domain is `V`. Use `id(program)` for a value representation or `H(enc(program))`; opaque bytes use `H` directly under §1.5. |
| A general decision procedure for replay-validity under a changed program is open. | **Open problem, but likely needs a restricted language.** | For unrestricted Turing-complete programs, termination and general program equivalence are undecidable; Turing's original result establishes the underlying decision barrier ([Turing 1936](https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf)). A decidable `valid(F,P')` requires a terminating/restricted workflow language, a bounded execution, proof-carrying programs, or a sound incomplete checker. |

### Sections 9 and 10 — costs, conformance, and open problems

| Claim | Classification | Assessment |
| --- | --- | --- |
| Substrate-operation counts are exact and schedule-independent. | **Assumption/project metric.** | Counts are reproducible only after defining what constitutes one operation, how retries/conflicts are charged, and which schedule is quantified. They are preferable to timing for deterministic assertions but are not automatically schedule-independent. |
| Cold replay performs `n` entry reads in `O(1)` batched reads. | **Conditional/ambiguous.** | This can mean `n` entry reads delivered through a constant number of unbounded range requests. With a fixed maximum batch size `B`, request count is `Theta(ceil(n/B))`, not `O(1)`. The asymptotic unit must be stated. |
| Warm resume is `O(delta)` and `k` cold restarts cost `Theta(k*n)` without snapshots. | **Conditional.** | These follow for an implementation that retains a verified cursor for warm resume and rereads all `n` entries after each cold restart. They are algorithm/model claims, not consequences of JetStream itself. |
| Total appends are at most `2n`, independent of fan-out. | **Unproved project claim.** | No derivation is given from §§1–8. The bound needs an explicit accounting proof over conflict/retry transitions and the number of interpreters; a finite test suite can find violations but cannot establish the universal bound. |
| A checkpoint is sound iff replay of its anchored prefix yields its state. | **Supported as a definition.** | Recomputing replay is a sound verifier under the chain, decider, encoder, and hash assumptions. It does not by itself establish checkpoint freshness or availability. |
| Passing the law suites shows memory and JetStream are interchangeable refinements. | **Overstated.** | Passing a finite suite establishes agreement on the exercised traces. Universal refinement requires a proof or exhaustive finite-state model under explicit abstractions. The document is correct to call tests a *falsification harness*; it should not later promote that evidence to proof of all behaviors. |
| OP-1 through OP-5 are open. | **Open problems/project declarations.** | OP-1 has established literature (SUNDR and Certificate Transparency gossip) but remains unimplemented here. OP-2 and OP-4 are design obligations. OP-3 needs computability restrictions. OP-5 needs a formal concurrency language and equivalence notion before “schedule-independent naming” can be proved possible or impossible. |

## Formal counterexamples that require amendment

### CEX-1 — E1 and signed zero

Let `u = +0` and `v = -0` as distinct IEEE-754 values. RFC 8785 delegates
number serialization to ECMAScript, which emits `0` for both. Then
`u != v` but `enc(u) = enc(v) = "0"`. Excluding `-0` or quotienting the two
values repairs E1.

### CEX-2 — K3 with a follower-served KV read

Let update `U` complete at the stream leader with revision `r+1`. Invoke get
`G` only after `U` has returned. A direct get served by a lagging follower may
return revision `r`. Because `U` precedes `G` in real time, no legal sequential
history can place `G` before `U`; the history is not linearizable. Pinning R1/no
mirror or using a leader-served message-get repairs the model.

### CEX-3 — stale fence can commit through the two-key protocol

Initial state: claim key is `(f, oldOwner, expiry)` and outcome key is absent.

1. `oldOwner.commit` reads the claim and observes `f`.
2. After expiry, `newOwner.claim` CAS-updates the claim key to `f+1` and
   returns success.
3. `oldOwner.commit` creates the absent outcome key and returns success.

Every individual K operation is linearizable and satisfies K1–K3. Nevertheless
the old holder commits after the new claim. Fence validation and protected
mutation must be one atomic transition, or the theorem must be weakened.

### CEX-4 — integrity record is not evidence that an effect occurred

World A executes an external effect, receives `o`, and appends a valid fact.
World B never executes the effect but appends the same valid fact `o`. The
canonical journal, chain head, memo, replay, and claimed result are byte-for-byte
identical. No verifier using only those bytes can distinguish the worlds.
Therefore §7.3 proves record integrity and replay consistency, not execution.

### CEX-5 — spawn replay after the crash window

The interpreter invokes `spawn(p)`, the target starts the child, and the worker
crashes before appending the spawn fact. Recovery sees no fact and invokes
`spawn(p)` again. Without atomic target-side create-by-`id(p)`, two children
start. Content identity makes deduplication possible; it does not perform it.

### CEX-6 — blind retry cannot determine the writer of identical bytes

Fix position `i` and bytes `x`. Consider two histories whose externally
visible calls and final store are identical:

1. In history A, writer `p` wins `append(i,x)` and its reply is lost.
2. In history B, writer `q` first wins `append(i,x)`; `p`'s concurrent append
   is refused and that reply is lost.

In both histories `read(i) = x` and every digest comparison is equal. Any
algorithm using only `read(i)` and hashing therefore has the same observation
in both histories and cannot decide whether `p` stored the value or encountered
an identical prior value. It can decide only **same bytes** versus **different
bytes** (or fail to decide when the read is unavailable). This refutes the
three-element decision claim in §3.2 while preserving the useful retry rule.

### CEX-7 — a terminal anchor does not localize a fully re-chained fork

Let the anchored chain be the honest build of payloads `["a","b","c"]` and
let the presented chain be the honest build of `["a","x","c"]`. Both chains
are structurally valid. Their first divergent entry is position 1, but a
verifier holding only the original terminal head sees valid links through all
three presented entries and discovers a mismatch only at the final anchor
comparison. The current pure implementation demonstrates exactly this:

```text
verify(presented)                   = { ok: true, length: 3, ... }
verifyAgainst(anchor, presented)    = { ok: false, seq: -1, reason: "head" }
firstDivergence(original, presented)= 1
```

`firstDivergence` succeeds because it receives **both histories**, information
not contained in `(seq, head)`. Section 7.2 must separate detection from
localization.

### CEX-8 — unstable or colliding operation IDs break oracle agreement

Let one execution contain two dynamic operations with the same `name` and
`attempt`, the first deterministically returning `1` and the second
deterministically returning `2`. The current identity tuple gives both the
same key. `I_live` runs both and the second continuation receives `2`;
`I_empty` records `1` for the first operation and rule 1 supplies `1` to the
second. Thus `I_empty(W) != I_live(W)` although the run is crash-free and both
effects are deterministic. Oracle agreement needs injective, stable dynamic
operation identity, not merely a deterministic hash function.

There is a second scheduling counterexample. If both branch facts already
exist, `race(act(A), act(B))` presents two immediately completed branches.
The fixed fact map determines both values but not which completion the host
scheduler reports first. `race` is not in the §5.1 operation signature and no
winner fact is defined. The sequential `Free(Op)` induction therefore cannot
prove schedule independence for this program.

### CEX-9 — the global `2n` append-attempt bound is false

Take one new fact (`n = 1`) and three conforming interpreters that have all
replayed the same empty head. Each may attempt to append its candidate at
position 0 before learning the winner. There are three append attempts, so
`3 > 2n`. J1 ensures one stored fact, not at most two attempted appends. With
`w` contenders, the elementary bound is at least `w` attempts for this
schedule. The current semaphore proves absence of **self**-conflict inside one
engine; it does not bound foreign contenders independently of `w`.

### CEX-10 — formal `id(work)` and implemented work IDs differ

For a string `s`, §1 defines `id(s) = H(enc(s)) = H('"' + escaped(s) + '"')`.
The guarded engine instead computes `digestHex(s) = H(s)`. These byte strings
differ for every ordinary nonempty string, hence so do their hashes modulo C1.
Journal `activityId` fields store `s` itself rather than either digest. The
implementation can be internally consistent, but it is not the §5.2/§6
identity construction as written.

## Minimum amendments for an academically defensible statement

1. Define `V` as the exact RFC 8785/I-JSON value domain, including exclusion
   of Unicode noncharacters, unique object names, and an explicit `-0` rule.
2. State that `dec` is a project canonical-byte recognizer rather than an RFC
   8785 parser primitive, and specify all rejection conditions.
3. Restrict the JetStream log model to a frozen, access-controlled,
   standalone/nonclustered or explicitly clustered configuration; separate
   process-crash durability from OS/power/storage durability.
4. Replace generic KV `get` with a leader-consistent read, or restrict K to
   R1/no mirror; prohibit deletion, TTL expiry, and administrative mutation in
   the modeled interface.
5. Repair the effector so fence validation and outcome commitment are atomic
   with respect to claim generation. Per-key CAS on two keys is insufficient.
6. Expand the §5.6 proof with the verified-through-winning-position/adoption
   invariant, and distinguish functional `memo` by definition from absence of
   conflicting duplicate facts in the journal.
7. Scope §5.7 to opaque nontransactional effects without target idempotency or
   status lookup.
8. Rename §7.3 to “verifiable execution-record consistency,” unless external
   effects supply independently verifiable receipts or attestations.
9. Require target-side atomic create/lookup by plan identity before declaring
   spawn idempotent.
10. Define every interpreter as a monad morphism and state exactly which
    refactorings preserve operation identity.
11. Replace `id(enc(program))` with a well-typed construction and restrict the
    replay-validity decision problem enough to address termination and
    undecidability.
12. Keep law-suite results explicitly empirical. A universal theorem needs a
    proof, exhaustive finite-state argument, or mechanically checked model in
    addition to tests.
13. Replace §3.2's three provenance outcomes with the two observable byte
    outcomes `same` and `different`; provenance requires a separate receipt.
14. Require operation identities to be stable and injective over dynamic
    instances covered by an execution, and add `race`/parallel winner recording
    to `Op` before claiming schedule independence.
15. Split §7.2 into terminal-anchor detection and two-history localization;
    the latter requires both histories or trusted intermediate anchors.
16. Scope the `2n` append-attempt bound to the measured single-interpreter
    regime, or parameterize it by writer count and adversarial conflicts.
17. Align P3/P4 identifiers with `id : V -> D` or amend §§1.5, 5.2, and 6 to
    declare the raw-string hash and raw journal key as distinct named sorts.

## Formal derivations for the valid core

The proofs in this section use a corrected domain `V_c`: finite I-JSON values;
finite binary64 numbers other than NaN, infinities, and `-0`; exact Unicode
strings containing neither unpaired surrogates nor Unicode noncharacters;
finite arrays; and finite extensional maps with unique string keys. Equality of
maps is extensional and string equality performs no Unicode normalization.
`H` is treated as injective only in the computational sense asserted by C1.

### Lemma F1 — canonical retraction and injectivity (E1–E2)

**Statement.** For every `v in V_c`, `dec(enc(v)) = v`. For every
`b in image(enc)`, `enc(dec(b)) = b`. Consequently `enc` is injective on
`V_c`.

**Proof.** Proceed by structural induction on `v`.

- `null` and booleans have one prescribed token and JSON parsing returns the
  same value.
- A number has the unique ECMAScript shortest representation selected by JCS;
  the binary64 round-trip property returns the same finite number. Excluding
  `-0` removes the only signed-zero collapse relevant here.
- A valid string is serialized by the prescribed JSON escaping algorithm and
  UTF-8 encoded. JSON unescaping and UTF-8 decoding recover the same sequence
  of scalar values; no normalization step occurs.
- For an array, delimiters and commas determine the element boundaries.
  Applying the induction hypothesis elementwise recovers the same finite
  sequence.
- For a map, JCS emits every unique key once in strictly increasing unsigned
  UTF-16 order. JSON member delimiters recover the same key/value pairs, and
  the induction hypothesis recovers every value. Extensional map equality
  ignores the source insertion order.

Thus `dec(enc(v)) = v`. If `b` is in the image, choose `v` with `b = enc(v)`;
then `enc(dec(b)) = enc(dec(enc(v))) = enc(v) = b`. Finally, if
`enc(u) = enc(v)`, apply `dec` to both sides and use the first equality to get
`u = v`. ∎

This proof is about the mathematical canonical recognizer. The repository's
exported TypeScript `decode` intentionally accepts noncanonical JSON (the P0
key-order test depends on that); it is not the partial `dec` whose domain is
exactly `image(enc)` unless a byte-canonicality check is added around it.

### Lemma F2 — portable content identity (E3, §1.4)

**Statement.** Two conforming encoders produce the same bytes for a fixed
`v in V_c`; and, under C1, `H(enc(u)) = H(enc(v))` implies `u = v` for feasible
adversaries.

**Proof.** A conforming encoder implements the single-valued algorithm used to
define `enc`, so both outputs equal `enc(v)`. If the hashes are equal and the
canonical bytes differ, those bytes form a SHA-256 collision, contrary to C1.
Hence the bytes agree, and F1 gives value equality. This is a computational
conditional, not mathematical injectivity of SHA-256. ∎

### Lemma F3 — head/history identity (§2.3)

**Statement.** Let `c` and `c'` be linked chains of the same finite length. If
their heads agree, then their entries agree componentwise, modulo C1.

**Proof by induction on length `n`.** If `n = 0`, both are empty. Let `n > 0`.
The head equality is equality of the digests of the two last entries. By C1
and F1, the last entries are equal. Their `prev` fields are therefore equal;
those fields are precisely the heads of the length `n-1` prefixes. The prefixes
are linked and have equal length, so the induction hypothesis makes them
equal. Appending the equal last entry gives `c = c'`. ∎

The equal-length premise is actually redundant for linked chains whose last
entry includes `seq`: equal terminal entries imply equal final sequence numbers
and hence equal lengths. Retaining it is harmless.

### Lemma F4 — incremental verification completeness (§2.5)

**Statement.** Folding `stepVerify` from `(-1,G)` accepts exactly the linked
chains; after an accepted prefix of length `m` it returns
`(m-1, head(prefix))`.

**Proof by induction on `m`.** At `m=0`, the returned cursor is `(-1,G)`, the
defined head of the empty chain. Assume the statement for `m`. On entry `e_m`,
`stepVerify` accepts exactly when `e_m.seq=m` and `e_m.prev=head(prefix)`, which
is exactly the linkage predicate for extending the prefix. On acceptance it
sets the cursor to `(m,digest(e_m))`, the required cursor for length `m+1`; on
rejection neither the cursor nor any later byte is certified. ∎

### Lemma F5 — cursor safety (§2.6)

If a reader initializes at a valid cursor and changes it only on an accepted
`stepVerify`, F4 is an inductive invariant: after every return, its cursor is
valid for exactly the bytes it has accepted. This proves the abstract rule. It
does not prove that an arbitrary reader implementation follows the transition
discipline; that is a refinement obligation tested at several boundaries.

### Lemma F6 — fold segmentation and the free-monoid action (D2)

For all states `s` and event lists `x,y`,

`foldl(evolve, foldl(evolve,s,x), y) = foldl(evolve,s,x ++ y)`.

**Proof by induction on `y`.** For `y=[]`, both sides are
`foldl(evolve,s,x)`. For `y=e::ys`, expand one fold step on each side and apply
the induction hypothesis to `ys`. The empty list acts as identity and list
concatenation is associative, so `E*` acts on `S`. ∎

### Lemma F7 — history quotient (§4.2)

Let `R = image(replay)` and define `x ~ y` iff `replay(x)=replay(y)`. Define
`phi : E*/~ -> R` by `phi([x])=replay(x)`. It is well-defined by the definition
of `~`; surjective by the definition of `R`; and injective because
`phi([x])=phi([y])` implies `x~y`, hence `[x]=[y]`. Therefore `phi` is a
bijection. ∎

### Lemma F8 — chain/decider bridge (§4.3)

For an event sequence `es`, build a chain whose payloads are `enc(e)` in the
same order. Honest construction satisfies linkage, so F4 accepts. Mapping
`dec` over the payloads yields `es` elementwise by F1. Folding `evolve` over
that list is therefore definitionally the same replay as folding the original
events. ∎

### Lemma F9 — canonical-wire recognition (§3.4)

Let raw bytes `b` parse to entry `e` and suppose a reader checks
`H(b)=H(enc(e))`. Under C1, equality of the digests implies `b=enc(e)`. Thus
the combined parse, linkage, and digest comparison accepts only canonical wire
bytes, subject to the corrected value domain and a parser that rejects
out-of-domain values. ∎

### Lemma F10 — deterministic sequential replay (§5.5, corrected)

Assume: (i) `W` is genuinely in `Free(Op,A)`; (ii) its continuations are total
deterministic functions; (iii) every visited dynamic operation has a stable,
injective ID; (iv) fixed `F` supplies one decodable outcome for every visited
ID; and (v) evaluation terminates. Then the returned value is a function of
`F`.

**Proof by structural induction on the free monad.** `Pure(a)` returns `a`.
For an impure node `Op(k, continuation)`, rule 1 selects the unique `F(k)` and
the continuation produces one next program. Apply the induction hypothesis to
that program. There is no remaining environment or scheduling choice. ∎

This proof does not cover host-language `race`, unrestricted fibers, unstable
ordinals, or duplicate operation IDs. CEX-8 shows why each omitted premise is
load-bearing.

### Lemma F11 — uniqueness of journal facts under the compliant interpreter

Assume J1/J2, leader-consistent reads, and the §5.4 rule that a writer may retry
after conflict only after verifying every newly occupied position and checking
the resulting memo. Suppose, for contradiction, that two different positions
are the first two facts for key `k`. Consider the later append. Before choosing
its position, its writer either (a) had already verified the earlier position,
in which case rule 1 forbids the append, or (b) attempted from an older head,
in which case J1 makes it lose at or before the occupied prefix and the retry
rule forces it to verify through the earlier fact before another attempt.
Both cases contradict the later append. Hence at most one compliant fact for
`k` is stored. ∎

This is the invariant missing from §5.6's one-sentence proof. Separately,
`memo(F)` is functional by its **definition** as the first fact per key even if
a malformed journal contains duplicates; that tautology is weaker than the
commitment theorem.

### Lemma F12 — the scoped crash-window impossibility (§5.7, corrected)

Assume the external effect is opaque, non-idempotent, non-queryable, and cannot
commit atomically with the journal. Compare two executions at recovery:

- `h0`: the worker crashes immediately before the external effect;
- `h1`: the effect occurs, but the worker crashes immediately before recording
  its fact.

The recovery process sees the same journal and process state in `h0` and `h1`.
If it does not run the effect, `h0` has zero executions. If it runs the effect,
`h1` has two. No decision satisfies exactly once in both indistinguishable
histories. ∎

RIFL and idempotent transactional targets escape a premise, which is why the
unqualified “no protocol” wording is false.

### Lemma F13 — unique outcome under K1 (§6.2)

In the deletion-free abstract register, `create(done.d,v)` linearizes
successfully at most once. Therefore at most one value is ever installed at
`done.d`; later equal retries are observations of that value and later unequal
retries are refusals. The result is independent of clocks and claim races. ∎

This lemma does **not** prove §6.3. CEX-3 is a legal history satisfying K1–K3
in which a stale fence creates that one unique outcome.

### Lemma F14 — failure-free guarded execution with a continuously live lease

Assume one claim is live for the entire interval from body start through
outcome commit, all participants use the effector, reads meet K3, and the body
terminates. Any competing claim on the same digest is refused while that lease
is live, so only its holder starts the body. K1 gives one outcome; later callers
observe and adopt it. Thus the body starts once and successful callers agree.
∎

The theorem does not apply when the body outlives a nonrenewed lease, and its
agreement conclusion does not repair the stale-fence interleaving in CEX-3.

### Lemma F15 — monadic sequencing (§8.1, corrected)

Let `I` be the catamorphism induced by an `Op` algebra into a target monad `M`.
By the universal property of the free monad, `I` is the unique monad morphism
extending that algebra. Monad morphisms preserve bind, hence

`I(W >>= f) = I(W) >>= (I . f)`.

The Kleisli arrows `A -> Free(Op,B)` form a category by the monad laws.
Recorded semantics are preserved only by transformations that preserve this
denotation **and** every dynamic operation identity. Merely naming an evaluator
`I` or performing an arbitrary “refactor” is insufficient. ∎

### Lemma F16 — parallel confluence in the disjoint fixed-outcome fragment

Let branch fact maps `F1` and `F2` have disjoint domains and fixed values.
Map union is then commutative, associative, and idempotent:
`F1 union F2 = F2 union F1`. Every interleaving of write-once commits therefore
has the same final memo. A chain records one linear extension, so its entry
sequence and terminal digest may differ with the interleaving. The result
claim follows only for a join/pair operator whose continuation is a function
of the final maps, not for first-completion races or cross-branch partial reads.
∎

### Lemma F17 — transitive cross-chain integrity (§8.3, corrected)

Assume a finite acyclic reference graph, a trusted root anchor, canonical
anchor interpretation, all referenced bytes available, and C1. Verify the root
prefix. Each embedded child anchor is then integrity-protected by its verified
parent payload. Induct on graph distance from the root: a protected child
anchor plus F3/F4 protects that child's prefix, which protects its own child
anchors. Thus every reachable prefix is transitively integrity-bound to the
root. Freshness, availability, and truth of payload assertions do not follow.
∎

### Lemma F18 — checkpoint soundness (§9.3)

Fix the decider/program version, initial state, codec, and anchored prefix. A
checkpoint `(seq,head,enc(state))` is accepted exactly when (a) F4 verifies the
prefix to `(seq,head)` and (b) replaying its decoded events yields a state whose
canonical encoding equals the checkpoint bytes. By F1 and F7 this equality is
exactly equality of the represented reachable state. This proves state
consistency, not freshness or storage availability. ∎

## Complete normative-clause ledger

The table is exhaustive at the clause level. “Proved” always means under the
explicit assumptions in the proof named; “empirical” means the current gate
exercised the claim but did not establish it universally.

| Clause | Kind | Result | Decisive evidence |
| --- | --- | --- | --- |
| 1.1 | definition | **Requires amendment** | `V` admits I-JSON noncharacters; signed zero is ambiguous. |
| 1.2 / E1 | theorem | **Proved only on corrected domain** | F1; CEX-1 otherwise. |
| 1.2 / E2 | theorem/project parser | **Proved abstractly; implementation API differs** | F1; TS `decode` accepts noncanonical JSON. |
| 1.2 / E3 | conformance theorem | **Definitionally proved; implementations empirical** | F2; RFC and cross-language vectors. |
| 1.3 / C1 | assumption | **Assumed, not provable here** | FIPS defines SHA-256, not collision resistance. |
| 1.4 | theorem | **Conditionally proved** | F2. |
| 1.5 | architecture declaration | **Partly unimplemented and internally inconsistent** | Five-sort policy; CEX-10; plans/programs absent. |
| 2.1–2.2 | definitions | **Coherent on corrected encoding domain** | Direct construction. |
| 2.3 | theorem/corollary | **Conditionally proved** | F3. A head is a commitment, not a self-contained proof. |
| 2.4 | definition | **Coherent** | F4. |
| 2.5 | theorem | **Proved** | F4. |
| 2.6 | interface invariant | **Proved for the transition discipline; refinement empirical** | F5 and cursor law suites. |
| 3.1 / J1–J3 | substrate axioms | **Axioms; JetStream refinement conditional** | Leader writes, frozen ACL/config, deletion-free retention; J3 process-crash scope only. |
| 3.2 | theorem | **False as a three-way provenance decision** | CEX-6; corrected two-way byte result follows J1/J2. |
| 3.2a | model assertion | **Conditional** | Standalone/nonclustered ordering, payload limit, and durability qualifications above. |
| 3.3 / K1–K3 | substrate axioms | **K1/K2 conditional; generic JetStream K3 false** | CEX-2 and official KV consistency limit. |
| 3.4 | refinement/invariant | **Conditionally proved** | F9 plus linkage F4. |
| 4.1 / D1 | definition/assumption | **Determinism follows from mathematical functionhood; totality/purity are implementation obligations** | Type signatures and finite laws cannot enforce host purity. |
| 4.1 / D2 | theorem | **Proved** | F6. |
| 4.1 / D3 | decider axiom | **Not derivable; catalog evidence passes** | Explicit absorption predicate and P0 L6. |
| 4.2 | theorem | **Proved** | F7. |
| 4.3 | theorem | **Proved** | F8. |
| 5.1 | model/assumption | **Coherent for sequential `Free`; not discharged for arbitrary Effect programs** | Host `race` is outside `Op`; CEX-8. |
| 5.2 | definition/open frontier | **Not injective over dynamic instances and not implemented as stated** | OP-5 and CEX-8/CEX-10. |
| 5.3 | definition | **Coherent as a first-value map; weaker than log uniqueness** | F11 distinction. |
| 5.4 | operational semantics | **Coherent under leader-consistent J1/J2 reads** | F11; failure/unavailability remains a residue. |
| 5.5 | theorem | **Conditionally proved for sequential fragment** | F10; CEX-8 refutes the broad schedule claim. |
| 5.6 | theorem | **Conditionally proved after adding adoption invariant** | F11; original proof is incomplete. |
| 5.7 | impossibility proposition | **Overstated; corrected theorem proved** | F12; RIFL escapes the premises. |
| 5.8 | theorem | **False without stable injective IDs and pure sequential spine** | CEX-8; true under F10 plus crash-free successful appends. |
| 5.9 | corollary | **Conditional; race claim unproved** | F10; a recorded winner operation is missing. |
| 6.1 | protocol | **Unsafe for the stated fencing property** | CEX-3: separate-key TOCTOU. |
| 6.2 | theorem | **Proved under deletion-free K1** | F13. |
| 6.3 | theorem | **False** | CEX-3. |
| 6.4 | liveness assumption | **Assumption, underspecified** | Needs availability, fair retry, finite lease/clock bounds. |
| 6.5 | theorem | **Conditionally proved only for continuously live leases** | F14; failures inherit CEX-3. |
| 7.1 | threat-model declaration | **Inconsistent with unprotected K** | A malicious substrate can delete/replace KV authority records; no anchor protects them. |
| 7.2 | theorem | **Detection true; exact localization false** | F3/F4 and CEX-7. |
| 7.3 | theorem | **False as “proof of execution”** | CEX-4; only replay consistency is proved. |
| 7.4 | limits | **Supported** | RFC 9162/SUNDR and availability boundary. |
| 8.1 | theorem/category claim | **Conditional** | F15; arbitrary refactoring claim overstated. |
| 8.2 | theorem | **Proved only in disjoint fixed-outcome fragment** | F16; not first-completion races. |
| 8.3 | theorem | **Conditional** | F17; P7 implementation absent. |
| 8.4 | theorem | **False without target-side create-by-plan-ID** | CEX-5; P6 absent. |
| 8.5 | definition/open problem | **Ill-typed and open** | `id(enc(program))` domain error; general decision problem undecidable. |
| 9.1 | metric declaration | **Needs a schedule and accounting model** | Operation counts are not automatically schedule-independent. |
| 9.2 / cold | complexity claim | **True for current unbounded batch implementation** | One request, `n` entry folds; scope must distinguish requests from entries. |
| 9.2 / warm | complexity claim | **Ambiguous/conditional** | Current engine reads `delta` entries but may issue an empty read per resume. |
| 9.2 / appends | universal bound | **False globally** | CEX-9; single-engine self-conflict result is narrower. |
| 9.2 / restarts | complexity claim | **Scenario-specific** | `Theta(k*n)` only when each of `k` cold runs rereads the full `n` prefix. |
| 9.3 | future construction | **Soundness criterion proved; implementation absent** | F18 and OP-2. |
| 10.1 | conformance definition | **A defensible test philosophy, not a completed refinement proof** | Finite gates plus missing P6/P7. |
| 10.2 | residues | **Mostly accurate; incomplete after this audit** | Add KV consistency, fencing TOCTOU, ID mismatch, and AsyncAPI drift. |
| 10.3 | open-problem list | **Correctly open; not proved or implemented** | OP ledger below. |
| Appendix A | traceability map | **Accurate for existing suites, explicitly incomplete for P6/P7** | PO ledger below. |

## Proof-obligation ledger (PO-1 through PO-25)

| PO | Stated target | Formal status | Current executable evidence |
| --- | --- | --- | --- |
| PO-1 | cross-language canonical agreement | **Conditional** on corrected `V_c`; E1–E3 proved by F1/F2 | 49 value and 10 chain fixtures; RFC checks 6/6 structured, 26/26 Appendix B, 3/3 invalid Unicode, 1/1 `-0`. |
| PO-2 | head/history identity | **Proved** by F3 modulo C1 | P1 CL1/CL3/CL4 and golden heads pass. |
| PO-3 | incremental equals whole verification | **Proved** by F4 | P1 CL6/CL6b pass. |
| PO-4 | cursor law across readers | **Abstract invariant proved** by F5; each adapter remains a refinement obligation | P1, Go journal, memory engine, and live tests pass on exercised traces. |
| PO-5 | crash durability | **Assumption, not theorem** | LP3/LP4 and Go reopen pass for process kill with intact file store. |
| PO-6 | blind retry decidability | **Refuted as written** | CEX-6; JL3/LP7 prove only identical-byte absorption. |
| PO-7 | canonical journal wire | **Proved** by F9 under C1/domain/parser premises | JL1/JL5 and `TestNonCanonicalWireRejected` pass. |
| PO-8 | decider laws | **D2 proved; D1/D3 are obligations** | P0 property suite passes for six catalog plus three generated deciders. |
| PO-9 | chain/decider bridge | **Proved** by F8 | CL5 passes. |
| PO-10 | replay determinism | **Conditional sequential proof** F10 | EL1/EL2 and LP6 finite catalogs pass; host races remain outside proof. |
| PO-11 | exactly-one fact per operation key | **Conditionally proved** by F11 | EL6/LP8 pass on exercised schedules. |
| PO-12 | oracle agreement | **Refuted without added ID/spine premises** | CEX-8; tested catalogs satisfy the narrower premise. |
| PO-13 | nondeterminism absorption | **Conditional** | DT1–DT4 pass; general race/winner theorem is absent. |
| PO-14 | unique effector outcome | **Proved under deletion-free K1** by F13 | Go concurrent/foreign-outcome tests and EF1/EF3 pass. |
| PO-15 | fencing safety | **Refuted** | CEX-3 is not scheduled by Go `TestStolenClaimCannotCommit` or TS EF2. |
| PO-16 | liveness after lease lapse | **Assumption/conditional liveness** | Finite lapsed-claim and crash-schedule tests pass. |
| PO-17 | guarded failure-free execution | **Conditionally proved** by F14 | EF1/EF3 pass for short effects and 30-second live leases. |
| PO-18 | tamper evidence | **Detection proved; exact-position clause refuted** | CEX-7; current `verifyAgainst` returns `seq:-1` for fully re-chained forks. |
| PO-19 | sequential composition | **Conditional theorem** F15 | **No P6 suite exists.** |
| PO-20 | parallel confluence/isolation | **Conditional theorem** F16 | EL7/LP8 are examples; **no P6 suite exists.** |
| PO-21 | cross-chain anchoring | **Conditional theorem** F17 | **No P7 suite exists.** |
| PO-22 | plan spawn idempotence | **Refuted without target dedupe** | CEX-5; **no P6 suite or spawn implementation exists.** |
| PO-23 | cold replay cost | **Static current-implementation argument; not substrate-universal** | PP3 passes at `n=24`: one read call, 24 entries, zero appends. |
| PO-24 | warm resume cost | **Conditional/metric-ambiguous** | PP2 bounds entries read but does not bound empty read calls. |
| PO-25 | append cost | **Refuted as global `2n`; true in measured single-engine scope** | CEX-9; PP1/PP4 pass at fan-out 8/32. |

## Assumption and open-problem ledger

| Item | Status | What would discharge or narrow it |
| --- | --- | --- |
| C1 | cryptographic assumption | A stated security parameter/adversary model; it cannot be proven from FIPS. |
| J3 | physical/process durability assumption | Pin process-crash-only scope, intact storage, sync policy, replication, and recovery model. |
| §5.1 program constraint | per-program assumption | A closed workflow language or static/dynamic effect audit proving no ambient nondeterminism. |
| §6.4 partial synchrony | liveness assumption | Bounded clock/error model, eventual service, fair retry, finite lease generations. |
| OP-1 | open | Authenticated head gossip/cross-anchoring protocol plus fork/freshness proof and tests. |
| OP-2 | open | Versioned checkpoint format, verifier, reachability/GC safety proof, and laws. |
| OP-3 | open | Well-typed program content representation and a restricted decidable validity language. |
| OP-4 | open | Atomic budget accounting tied to claim generations and an invariant proof. |
| OP-5 | open | Formal concurrency syntax, stable dynamic occurrence naming, and race-winner semantics. |

## Current implementation and executable evidence (2026-08-11)

### Commands and exact results

The audit ran from the repository root against the current dirty worktree:

```text
bun run typecheck                         PASS (including Effect LS diagnostics)
bun test                                  61 pass, 0 fail, 15,270 expect calls
gofmt -l .                                empty
go vet ./...                              PASS
go test -race ./...                       PASS: canonical, journal, effector, cmd/journald
bun run conformance:rfc8785               36/36 including signed-zero check
bun run conformance:cloudevents           28/28
bun run conformance:asyncapi              local 9/9; official CLI 0 errors
```

The AsyncAPI CLI reported one informational governance item: the document uses
AsyncAPI 3.0.0 rather than the then-latest 3.1.0. This is not a validation
error.

### What those results establish

- The checked source typechecks at the pinned Effect
  `4.0.0-beta.107` API.
- All currently collected finite examples, property samples, live process-kill
  scenarios, operation-count assertions, and race-detector executions pass.
- TypeScript and Go agree on the 49-value/10-chain frozen canonical corpus.
- The current P4/P5 working implementation passes its Go and TypeScript laws.

### What those results do not establish

- They do not quantify over all chains, programs, schedules, crashes, clock
  skews, broker configurations, or adversarial storage behaviors.
- They do not exercise the CEX-3 interleaving between the internal fence read
  and outcome create. The tests steal before calling the stale `Commit`.
- They do not provide P6/P7 coverage for PO-19 through PO-22.
- They do not turn process-kill evidence into OS/power/storage durability.
- They do not validate that an external effect really occurred.

### Source-level refinement findings

1. [`canonical.ts`](../../packages/kernel/src/canonical.ts) sorts keys
   recursively, rejects lone surrogates and nonfinite numbers, rejects `-0` for
   the schema encoder, and hashes UTF-8 bytes with SHA-256. It does not reject
   Unicode noncharacters. Its exported `decode` is a permissive JSON/schema
   decoder, not canonical-byte recognition.
2. [`chain.ts`](../../packages/kernel/src/chain.ts) implements F3–F5. Its
   anchored mismatch deliberately reports `seq: -1`, which confirms CEX-7.
3. [`journal.go`](../../go/journal/journal.go) uses expected-last-subject
   sequence, leader-served `GetMsg`, canonical-wire hashing, no-eviction shape
   checks, and verified cursor advance. Its abstract guarantees still depend on
   frozen administration and intact file storage. The coordinator's committed
   black-box [`conformance_test.go`](../../go/cmd/journald/conformance_test.go)
   now independently proves that the Go sidecar itself rejects an unchained
   tail rather than relying on the TypeScript verifier to mask it.
4. [`engine.ts`](../../packages/kernel/src/engine.ts) serializes local append
   decisions with a semaphore and refreshes through every foreign winning
   position before retry. This supplies the F11 invariant and the narrow PP
   bounds. Facts are keyed by raw activity/deferred/observation strings, not
   formal digest-valued `opId`s.
5. [`effector.go`](../../go/effector/effector.go) correctly uses `kv.Create`
   for the outcome and revision CAS for claim steals, which proves unique
   outcome under K1. Its fence check (`Get(claimKey)`) and protected mutation
   (`Create(doneKey)`) are separate operations on different keys, exactly
   CEX-3.
6. [`engine-guarded.ts`](../../packages/kernel/src/engine-guarded.ts) hashes
   the raw `executionId/name/attempt` bytes for work identity and adopts
   committed exits. This follows the P4 rung but differs from formal `id(work)`.
7. [`durable.ts`](../../packages/kernel/src/durable.ts) records time/deadline
   observations and polls deferred facts. Observation ordinals are per runtime
   execution order; unrestricted concurrent schedule independence remains
   OP-5.
8. The CloudEvents projection includes Observation, but
   [`asyncapi.json`](../../packages/standards/asyncapi.json) still enumerates
   only activity and deferred event types/facts. The local AsyncAPI check tests
   that two-member schema, so passing validation does not prove the extended
   fact alphabet is represented end-to-end.
9. Plans, program-content validation, spawn, P6 composition laws, P7
   cross-chain anchoring, checkpoints, federation, and budget fences are not
   implemented in the current tree.

## Amendment-ready replacement clauses

This section is a proposed **recorded amendment**, not a silent rewrite of the
normative document. It gives exact statements that are compatible with the
proofs above. Applying them still requires the coordinator ruling demanded by
`AGENTS.md`, and repairing P4 requires a new frozen law that schedules the
internal commit/steal interleaving.

### A1 — replace §1.1 and clarify §1.2

> **1.1 (Canonical value universe).** `V` is the least set containing `null`,
> booleans, IEEE-754 binary64 values other than NaN, infinities, and negative
> zero, Unicode strings consisting only of scalar values permitted by I-JSON
> (no unpaired surrogates and no Unicode noncharacters), finite sequences over
> `V`, and finite extensional maps from such strings to `V` with unique keys.
> String equality is code-point-sequence equality without normalization.
>
> **1.2 (Canonical encoding and recognizer).** `enc : V -> Sigma*` is RFC 8785
> serialization. Define `parseJson : Sigma* ⇀ V` by strict I-JSON parsing and
> define `dec(b)=v` iff `parseJson(b)=v` and `enc(v)=b`. Thus `dec` recognizes
> canonical bytes; a permissive boundary parser is a distinct operation.

F1 then proves E1 and E2 without a signed-zero or Unicode-domain exception.

### A2 — replace §3.2's retry theorem

> **3.2 (Theorem — blind-retry byte decidability).** After an
> `append(i,x)` with unknown outcome, a successful leader-consistent `read(i)`
> decides between: (a) `read(i)=x`, so retry is safely absorbed regardless of
> which writer stored the bytes; and (b) `read(i)!=x`, so the position is a
> foreign conflict. If no value can be read, the operation remains unavailable.
> No observation of the immutable position distinguishes “my original append
> succeeded” from “another writer first stored identical bytes.”

This is exactly the strongest theorem allowed by CEX-6.

### A3 — replace the JetStream refinement sentence in §3.3

> JetStream KV refines `K` only in a deletion-free, TTL-free configuration
> whose reads are leader-consistent. The current reference deployment uses
> standalone R1 with no mirror; a clustered deployment MUST replace direct KV
> `Get` with a leader-served read or separately prove linearizability. Generic
> follower/mirror direct reads are outside the model.

This leaves K1–K3 as abstract axioms and stops treating an officially weaker
read API as their unconditional model.

### A4 — replace §5.2 and restrict §§5.5, 5.8, and 5.9

> **5.2 (Operation identity).** In the proved fragment, each dynamic operation
> has an explicit occurrence label `path` that is stable and injective within
> the execution. `opId = id({executionId,path,attempt})`. Human-readable names
> are metadata and need not be unique. Sequential and structured-parallel
> combinators MUST assign disjoint paths compositionally. Programs whose host
> scheduling can change paths are outside the proved fragment pending OP-5.
>
> **5.5 (Replay determinism).** The theorem ranges over terminating programs
> in the proved fragment whose continuations are total deterministic functions
> and whose entire nondeterminism—including race winners—is represented by an
> `Op` outcome in `F`.
>
> **5.8 (Oracle agreement).** Equality means equality of returned exits. It
> holds for a crash-free, failure-free, single-writer evaluation of a program
> in the proved fragment with deterministic operation implementations.
>
> **5.9 (Nondeterminism absorption).** Recorded observations determine replay
> for a fixed program/codec version and trusted available fact log. A race is
> covered only when its winner is itself a recorded operation outcome.

F10 proves these statements. This amendment intentionally does not pretend to
solve OP-5 for unrestricted Effect fibers.

### A5 — replace §5.7

> **5.7 (Proposition — opaque-effect crash window).** No protocol can guarantee
> exactly one execution of an opaque, non-idempotent external effect that
> neither participates in an atomic transaction with the fact log nor exposes
> an idempotency key or authoritative status lookup. A crash between effect and
> fact commit creates the indistinguishable histories of F12. Systems such as
> RIFL escape this proposition by adding a durable atomic completion record at
> the authoritative target.

### A6 — replace §6.1 with one-key fenced commitment

For each work digest `d`, use **one** authority key `work.<d>`, whose canonical
value is one of:

```text
Claim(f, owner, expiry)     where f >= 1
Done(f, result)             where f >= 1
```

The abstract transition system is:

```text
claim(d,o,lease):
  Absent --create--> Claim(1,o,now+lease)
  Claim(f,_,expired) --cupdate(observedRevision)-->
      Claim(f+1,o,now+lease)
  Claim(_,_,live) -> Held
  Done(_,_)       -> Committed

commit(d,f,result):
  read Claim(f,_,_) at revision r
  cupdate(work.d, Done(f,result), r)
    success -> first
    revision mismatch -> reread:
      Claim(f',_,_) with f' != f -> Fenced
      Done(f',_)     with f' != f -> Fenced
      Done(f,result)              -> idempotent success
      Done(f,other)               -> Committed
      Absent                      -> Fenced

lookup(d):
  Absent or expired Claim -> Unclaimed
  live Claim              -> Held
  Done                     -> Committed
```

`Done` is terminal: the protocol exposes no transition out of it. No delete,
purge, TTL, or administrative update is in the modeled interface.

#### Theorem A6.1 — single-key fencing safety

Suppose claim generation `f' > f` linearizes before a commit under `f`.
Generation `f'` changes the revision of `work.d`. The stale commit's conditional
update expects the older revision and must fail by K2. Conversely, if the
commit under `f` linearizes first, the key becomes terminal `Done` and no later
claim generation can linearize. Therefore a commit under `f` cannot succeed
after a claim under any `f' > f` has linearized. ∎

#### Theorem A6.2 — unique terminal outcome

Only a conditional update from `Claim` can produce `Done`, and every successful
update changes the key revision. After the first `Done`, no protocol transition
updates the key. Hence every reachable history contains at most one terminal
outcome value. A repeated commit at the same fence/result merely reads that
value and reports idempotent success. ∎

#### Theorem A6.3 — lease-independent safety and conditional liveness

The proofs above mention neither `now` nor `expiry`; time controls eligibility
for the `Claim(f)->Claim(f+1)` transition only. Thus safety is clock-free. If
the store is eventually available, clocks satisfy the stated expiry model, and
a claimant retries fairly after a finite lease lapses, K2 permits some claimant
to win the next generation. This is conditional liveness, not an unconditional
theorem. ∎

#### Bounded transition-system check

As an independent error-finding check, a breadth-first enumerator split commit
into `begin` (read fence/revision) and `finish` (protected write), allowed either
of two owners to steal at every claim state (stronger than waiting for expiry),
and searched for a successful commit whose fence was below the maximum
linearized generation.

```text
old two-key protocol, depth 6:
  unsafe after 14 transitions
  trace = A:begin, A:steal, A:finish

repaired single-key protocol, depth 12:
  3,919 distinct states; 9,254 transitions; no violation
```

The same-owner steal is legal because the P4 contract explicitly increments a
lapsed claim even for its original owner. The bounded result is not substituted
for proof; Theorems A6.1–A6.3 establish the invariant for arbitrary trace
length, while enumeration independently catches mistakes in the transition
formulation.

The current two-key P4 wire cannot implement A6.1. It needs a coordinator
amendment and migration; adding another test without changing the state layout
can only expose the defect, not repair it.

### A7 — replace §§7.2 and 7.3

> **7.2 (Tamper detection and localization).** A reader holding a trusted
> terminal anchor detects any different fully supplied prefix of the same
> anchored length by a terminal-head mismatch, modulo C1. Structural corruption
> is reported at the first failed `stepVerify`. Locating the first divergence
> of two individually valid, fully re-chained histories requires both histories
> (or trusted intermediate anchors); a terminal head alone does not contain
> that location.
>
> **7.3 (Verifiable record consistency).** Given a trusted root anchor, the
> exact program and input, all journal bytes, fixed codecs, and the program
> constraint, a verifier can prove chain integrity and recompute the claimed
> result from recorded facts. This proves internal replay consistency. It does
> not prove that an external effect occurred or an observation was truthful;
> those claims require an independently verifiable receipt, signature,
> attestation, or authoritative atomic transaction.

### A8 — replace the overbroad composition claims

> **8.1.** Each interpreter used in the theorem is explicitly the free-monad
> catamorphism induced by an `Op` algebra into its state/error target monad.
> It therefore preserves bind. Only monad-law transformations that also
> preserve dynamic operation paths preserve recorded semantics.
>
> **8.2.** Parallel confluence ranges over join-style parallel composition with
> disjoint operation-ID domains, fixed per-key outcomes, no cross-branch reads
> of partial state, and no first-completion result. It does not cover races.
>
> **8.3.** Cross-chain integrity assumes a finite acyclic reference graph,
> canonical references, a trusted root, and availability of every referenced
> prefix. It proves integrity, not freshness or availability.
>
> **8.4.** Spawning a plan is idempotent only when the child authority performs
> atomic create-or-lookup by `id(plan)`. Memoizing the parent spawn outcome
> alone gives exactly-once commitment but retains the §5.7 crash window.
>
> **8.5.** Define `programRef = id(program)` when `program in V`, or
> `programRef = H(programBytes)` for opaque canonical program bytes. The
> validity procedure remains OP-3 and MUST be scoped to a terminating or
> otherwise decidable program representation.

### A9 — replace §9.2's universal cost wording

> For the current unbounded-range reader, cold replay performs one range-read
> request and exactly `n` entry verifications. Warm catch-up verifies exactly
> `delta` new entries but may issue one empty read request per resume. In one
> interpreter whose local appends are serialized and with no foreign writer,
> each new fact causes exactly one append attempt. Under `w` foreign
> interpreters or an adversarial schedule, attempts MUST be parameterized by
> contention; J1 alone supplies no `2n` global bound. `k` completed cold
> replays of the same `n`-entry prefix perform `k*n` entry verifications.

### A10 — amend §10's conformance claim

> Law suites are finite falsification and regression evidence. A substrate is
> declared a universal refinement only after a proof over its abstract model
> plus evidence that its concrete deployment satisfies that model's premises.
> Missing P6/P7 suites, every named OP, and every declared assumption remain
> explicit non-discharged obligations. Conformance reports MUST distinguish
> formal proof, bounded model checking, property sampling, integration tests,
> and deployment assumptions.

## Overall proof verdict

The document cannot receive an exception-free “proved” verdict in its current
form. The valid mathematical core is proved above, but §§3.2, 6.3, 7.2's exact
localization, 7.3, 8.4, the unqualified forms of 5.7/5.8/5.9, and the global
append bound have countermodels. Generic JetStream KV fails K3; several
implementation identities differ from the formal identity; PO-19–PO-22 are
owed; and every OP remains open.

This is not an absence of evidence. It is positive evidence of
non-provability: one legal countermodel is sufficient to refute a universal
claim. The academically rigorous next state is a **recorded normative
amendment** implementing the minimum changes above, followed by a new proof
and, for the repaired effector, an atomic same-key state transition or another
substrate primitive whose linearization point couples fence validation to
outcome commitment.

## Primary-source index

- A. Rundgren, B. Jordan, and S. Erdtman, [RFC 8785: JSON Canonicalization
  Scheme](https://www.rfc-editor.org/rfc/rfc8785.html), 2020; verified
  [erratum 7920](https://www.rfc-editor.org/errata/eid7920).
- T. Bray, [RFC 7493: The I-JSON Message
  Format](https://www.rfc-editor.org/rfc/rfc7493.html), 2015.
- NIST, [FIPS 180-4: Secure Hash
  Standard](https://doi.org/10.6028/NIST.FIPS.180-4), 2015.
- S. Farrell et al., [RFC 6920: Naming Things with
  Hashes](https://www.rfc-editor.org/rfc/rfc6920.html), 2013.
- M. Herlihy and J. Wing, [Linearizability: A Correctness Condition for
  Concurrent Objects](https://www.cs.columbia.edu/~wing/publications/HerlihyWing90.pdf),
  *ACM TOPLAS* 12(3), 1990.
- NATS authors, [JetStream](https://docs.nats.io/nats-concepts/jetstream),
  [streams](https://docs.nats.io/nats-concepts/jetstream/streams),
  [headers](https://docs.nats.io/nats-concepts/jetstream/headers), and
  [KV](https://docs.nats.io/nats-concepts/jetstream/key-value-store)
  documentation; tagged [nats-server
  v2.14.4](https://github.com/nats-io/nats-server/tree/v2.14.4) and
  [nats.go v1.53.1](https://github.com/nats-io/nats.go/tree/v1.53.1) source.
- W. Swierstra, [Data types à la
  carte](https://doi.org/10.1017/S0956796808006758), *Journal of Functional
  Programming* 18(4), 2008.
- M. Piróg and N. Wu, [String Diagrams for Free
  Monads](https://research-information.bris.ac.uk/ws/files/87127912/Nicolas_Wu_String_Diagrams_for_Free_Monads.pdf),
  *FLOPS 2016*.
- C. Lee et al., [Implementing Linearizability at Large Scale and Low
  Latency](https://web.stanford.edu/~ouster/cgi-bin/papers/rifl.pdf), *SOSP
  2015*, [DOI](https://doi.org/10.1145/2815400.2815416).
- M. Burrows, [The Chubby Lock Service for Loosely-Coupled Distributed
  Systems](https://research.google.com/archive/chubby-osdi06.pdf), *OSDI
  2006*.
- C. Gray and D. Cheriton, [Leases: An Efficient Fault-Tolerant
  Mechanism](https://www.cs.cmu.edu/afs/cs.cmu.edu/academic/class/15712-s12/www/papers/gray89.pdf),
  *SOSP 1989*.
- T. Ameloot, F. Neven, and J. Van den Bussche, [Relational Transducers for
  Declarative Networking](https://doi.org/10.1145/2450142.2450151), *JACM*
  60(2), 2013.
- J. Li et al., [Secure Untrusted Data Repository
  (SUNDR)](https://www.usenix.org/conference/osdi-04/secure-untrusted-data-repository-sundr),
  *OSDI 2004*.
- B. Laurie, E. Messeri, and R. Stradling, [RFC 9162: Certificate
  Transparency Version 2.0](https://www.rfc-editor.org/rfc/rfc9162.html),
  2021.
- A. Turing, [On Computable Numbers, with an Application to the
  Entscheidungsproblem](https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf),
  1936.
