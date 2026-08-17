# MCP as a modeled device: from adapter to laws

Lane: extending MCP and modeling it as a core device inside the proof-based system.
Date: 2026-08-16. Repo: C:\Users\kokok\Dev\foldlab, branch agent/codex/kernel-hygiene-gates.
Scratch: ...\scratchpad\wf\mcp-core-device\. Nothing in the repo was modified.

Evidence labels: **RAN-IT** (executed here this session, transcript in `out/`),
**PRIMARY** (quoted from spec text fetched today or from repository/vendored source read),
**LEAD** (secondary source, unconfirmed), **UNVERIFIED** (memory; marked, not relied on).

---

## 0. Toolchain checks (recorded, per brief)

**RAN-IT.** `bun --version` -> `1.3.14`. `go version` -> `go1.26.5 windows/amd64`.
`lake --version` -> `Lake version 5.0.0-src+d8b1897 (Lean version 4.33.0)`;
`lean --version` -> `Lean (version 4.33.0, x86_64-w64-windows-gnu, commit d8b18978322de05a8f3dba51ef03cf5461676c17, Release)`.
**Lean/lake ARE available on this machine** - the brief listed this as UNKNOWN; it is now
known, so a Lean-side rung is not blocked on toolchain availability.

---

## 1. The mandatory experiment: the MCP surface, run for real

### 1.1 What ran

Three probes, all in scratch, all against a freshly built protod and the real
`bun src/mcp-main.ts` stdio server. No test harness reused; the probes speak raw
JSON-RPC over the subprocess's stdin/stdout.

| probe | file | what it did |
|---|---|---|
| 1 | probe.ts | build protod -> spawn -> spawn MCP -> initialize, tools/list, capability sweep, real envelopes, **byte-diff of served tool list vs toolsFromContract(contract.describe)** |
| 2 | probe2.ts | envelope totality under stress: excess-property at the daemon, **kill the daemon mid-session**, refusal-kind enum agreement |
| 3 | probe3.ts | drive a whole **multi-seat protocol round** through the MCP seam only: open, seat refusal, type refusal, repair, early close, dispute, fenced close |

All transcripts in `out/`; `out/99-raw-transcript.txt` is the verbatim JSON-RPC
line log of probe 1 (70,442 bytes).

### 1.2 The tool list, captured

**RAN-IT.** tools/list served exactly 15 tools, in contract order:

```
type_create, type_fill, type_unfill, journal_read, contract_describe,
session_open, session_move, session_state, session_commit,
protocol.create, protocol.session.open, protocol.session.fill,
protocol.session.close, protocol.session.state, publish
```

Each served tool carries exactly six keys: name, description, inputSchema,
outputSchema, annotations, _meta (out/11-diff-report.json).

initialize returned (out/01-initialize.json):

```json
{"protocolVersion":"2025-06-18",
 "capabilities":{"logging":{},"completions":{},"tools":{"listChanged":true}},
 "serverInfo":{"name":"flb-proto","version":"0.0.1"}}
```

### 1.3 The diff I was asked to do myself

I projected both sides onto the comparable surface - name, description, inputSchema,
annotations (three hints), _meta - sorted by name, canonicalized each with the repo's
own RFC 8785 encoder (proto/ts/src/jcs.ts canonicalize), and compared **bytes**, then
digested.

**RAN-IT** (out/11-diff-report.json, out/11a-served-canonical.json,
out/11b-derived-canonical.json):

```
servedOrderEqualsDerivedOrder : true
servedDigest                  : fc806f998befb62834805081ed9f9d02c4b480d0f5f94553be5f4f858f9d9ca7
derivedDigest                 : fc806f998befb62834805081ed9f9d02c4b480d0f5f94553be5f4f858f9d9ca7
byteIdentical                 : true
```

The contract itself canonicalized to
59ef16e2ec0c5a376e802a6ee5a070eddf2bfa2c5da5bcaaa730d941852058a9.

**The derived-surface claim holds today, on this machine, at byte level - for the
projected fields.** That scope qualifier is load-bearing; see section 2.3.

### 1.4 One real envelope

**RAN-IT** (out/04-envelope-refusal.json), tools/call type_create {"structure":{"k":"strng"}}:

```json
{"jsonrpc":"2.0","id":20,"result":{
  "content":[{"type":"text","text":"{\"ok\":false,\"refusal\":{...}}"}],
  "structuredContent":{"ok":false,"refusal":{
    "kind":"invalid-structure",
    "law":"flb.type.v0: unknown kind refuses - the grammar grows under ticket 004, never by admission on faith",
    "path":["structure","k"],"got":"strng",
    "expected":["string","bool","int","null","opaque","literal","list","struct","union","brand","check","ref"],
    "example":{"k":"string"},
    "next":[{"subject":"flb.req.type.create","note":"repair the node at path and resubmit; same bytes converge, they never error"},
            {"subject":"flb.req.contract.describe","note":"request the daemon's contract; every subject and body shape is described there","body":{}}],
    "sort":"structural","local":false}},
  "isError":false}}
```

isError: false. The refusal is a value. W8 crosses the seam intact.

### 1.5 What else the surface answers (capability sweep, RAN-IT)

| method | reply | file |
|---|---|---|
| resources/list | {"resources":[]} | out/03-resources_list.json |
| resources/templates/list | {"resourceTemplates":[]} | out/03-resources_templates_list.json |
| prompts/list | {"prompts":[]} | out/03-prompts_list.json |
| ping | {} | out/03-ping.json |
| logging/setLevel | {} (accepted) | out/03-logging_setLevel.json |
| completion/complete | **error** -32602 "Unknown completion reference or argument" | out/03-completion_complete.json |
| resources/subscribe | **error** -32601 "Resource subscriptions are not supported" | out/03-resources_subscribe.json |
| tools/list with cursor:"" | whole list, **no nextCursor**, cursor ignored | out/03-tools_list_cursor.json |
| tools/call unknown tool | **error** -32602 "Tool 'no_such_tool' not found" | out/07-unknown-tool.json |

---

## 2. Inventory: which MCP capabilities map to estate machinery

The 2026-08-14 deep read (docs/design/2026-08-14-mcp-surface-deep-read.md) did the
capability-by-capability read against pin and spec. I do not repeat it; I record what
has **changed since**, what my probes **contradict or sharpen**, and I re-derive the
elicitation ruling for the protocol-session era.

### 2.1 Status ledger, as run today

| MCP capability | shipped foldlab status (RAN-IT) | maps to estate machinery? |
|---|---|---|
| **tools/list, tools/call** | 15 tools, derived, byte-identical to toolsFromContract | **Yes - the whole load-bearing surface.** One tool per contract operation |
| **tool annotations** | served, correct per allowlist | Partial: hand-written classification, safe-by-default. Law L3 |
| **outputSchema** | served, type:"object", contains the 14-kind refusal enum | Yes - but the enum is **asserted, not derived**. Section 2.3 |
| **structuredContent** | set on every call, isError:false always | Yes - the refusal envelope |
| **_meta** | {"foldlab.dev/nats-subject": subject} on every tool | Yes - the structural subject-to-tool mapping that makes refusal `next` hints machine-followable |
| **resources / templates** | registered: **none**; both lists empty | Absent by design today; digest-addressed-resource design written up, unbuilt |
| **completions** | capability advertised; **zero handlers**; every call -32602 | **Refused** - stronger basis now, section 2.4 |
| **elicitation** | not used | **Re-derived (2.5) - ruling holds, for a different reason than in 2026-08-14** |
| **sampling / roots** | not used | Refused (deep read 3.4); now **Deprecated** upstream |
| **subscriptions** | resources/subscribe -> -32601 | Refused; journal_read with a verified {seq,head} cursor is the estate's answer |
| **pagination** | cursor accepted and **silently ignored**; no nextCursor | Absent. Not a problem at 15 tools; becomes one the moment resources ship |
| **logging** | capability advertised; setLevel accepted; nothing emitted | Unearned claim, section 2.2 |
| **caching (ttlMs/cacheScope)** | absent | Required at 2026-07-28 for tools/list (PRIMARY, 2.6) |

### 2.2 The three capability claims foldlab makes and cannot honor

**RAN-IT + PRIMARY.** initialize advertised completions, logging, and
tools.listChanged: true. In the pin
(repos/effect/packages/effect/src/unstable/ai/McpServer.ts:1937-1943) the first two
are **unconditional**:

```ts
const capabilities: Types.DeepMutable<typeof ServerCapabilities.Type> = {
  completions: {},
  logging: {}
}
if (server.tools.length > 0) {
  capabilities.tools = { listChanged: true }
}
```

foldlab advertises completions while serving zero completion handlers (every
completion/complete is -32602), advertises logging while emitting nothing, and
advertises listChanged: true although mcpLayer builds the toolkit exactly once from
one contract.describe at startup (proto/ts/src/mcp.ts:197-212,
proto/ts/src/mcp-main.ts:21-34) and can never fire notifications/tools/list_changed.

The spec: "Servers that support completions **MUST** declare the `completions`
capability" (/specification/2026-07-28/server/utilities/completion, fetched
2026-08-16). Declaring while supporting none is the converse the sentence does not
cover - but by foldlab's own precept ("a claim absent from VERIFICATION.md is not
made"), **three claims are being made on the wire that no artifact backs.** They are
the pinned library's claims, not foldlab's - which is exactly why a modeled device
needs an explicit capability declaration rather than an inherited one.

### 2.3 The derived surface is derived - for half of the descriptor

**RAN-IT + PRIMARY.** The daemon's self-description does **not** enumerate its refusal
kinds. contract.describe returns (out/09-contract-describe.json):

```json
"refusal": {"k":"struct","fields":{"kind":{"k":"string"}, ...}}
```

kind is {"k":"string"} - an open string. Yet the served outputSchema enumerates
fourteen kinds. That enum is written by hand in proto/ts/src/mcp.ts:31-50
(DaemonRefusal ... Schema.Literals([...])) and :52-65 (ClientLocalRefusal). It is
**not** a function of contract.describe.

So the file's header comment - "drift is structurally impossible" - is true of
inputSchema, description, _meta, and the tool *set*; it is **false of the output
envelope**, which is the half a validating client uses to machine-check exhaustiveness
over refusals.

Four restatements of the kind vocabulary exist:

1. Go: proto/go/protod/refusal.go:29-46 and :48-64 refusalSortByKind
2. shared vector proto/wire/refusal-sorts.json, pinned by
   RefusalSortGrammarDigest = "26193b59e8c12952edaf206d1d31dca7974843c5db0f19f9be2f2faabc35ad03" (refusal.go:23)
3. TS: proto/ts/src/wire.ts:29-44 DAEMON_REFUSAL_SORTS
4. TS-MCP: proto/ts/src/mcp.ts:31-50

Items 1-3 are walled: proto/go/protod/refusal_sort_test.go and
proto/ts/test/refusal-sort.test.ts both recompute the canonical
{grammar, sortByKind} digest and require the pinned constant.
**Item 4 is walled against nothing but a fifth hand-written copy** -
proto/ts/test/mcp.test.ts:14-28 DAEMON_REFUSAL_KINDS. A drift editing mcp.ts and
mcp.test.ts together passes green.

I checked agreement mechanically rather than asserting it. **RAN-IT**
(out/21-refusal-kind-agreement.json): the enum extracted from the **served**
outputSchema equals Object.keys(wire.DAEMON_REFUSAL_SORTS) exactly, 14 for 14,
equal: true. The check is one assertion long, passes today, and is not in the suite.
Cheapest law in this report (L2).

### 2.4 Completion: the refusal holds, and now has a second reason

**PRIMARY**, /specification/2026-07-28/server/utilities/completion, fetched
2026-08-16. At the current revision the shape is unchanged:

- "`values`: Array of suggestions (max 100)" - the example is
  "values": ["python","pytorch","pyside"], i.e. strings.
- "Servers return an array of completion values **ranked by relevance**".
- No _meta on CompleteResult; no cursor - only total and hasMore, with no way
  to fetch more.
- Two reference types only: ref/prompt and ref/resource.

A frontier entry is {path, legal:[{kind, example}], refs:[digest...]}
(proto/wire/CONTRACT.md:91-95) in **identity order**, not relevance order, with the
law "every legal[].example is directly accepted at that path" (C4,
CONTRACT.md:107-112). None of that fits an array of ranked strings.

The **second** reason is new and comes from the probe: foldlab serves no prompts and no
resource templates, so there is **no reference a completion could name**.
completion/complete is not merely unfit - at the shipped surface it is *unreachable*
and returns -32602 for every input (out/03-completion_complete.json). A completion
channel would first require minting a resource-template surface: new machinery under
ADR-0010 discipline.

**The completion-query identity, stated honestly.** MCP completions and frontier refs
are *not* the same declared query fold and cannot be made so through
completion/complete. They *can* be the same fold through a **tool** whose result is
the frontier value itself, in identity order, with a declared bound. The estate already
computes exactly this for authoring sessions (session_state carries frontier,
CONTRACT.md:143-146) and for the stateless concierge (type_fill/type_unfill
replies). The frontier fold exists and is already served; MCP's completion primitive is
the wrong pipe, and the right pipe is the one already in use.

### 2.5 Elicitation, re-derived for the protocol-session era

The 2026-08-14 doc refused elicitation on three grounds: (1) requestedSchema is a flat
primitive subset that cannot carry a nested flb.type.v0 partial; (2) client validation
of the response is only SHOULD, and the pin's Effect.orDie (McpServer.ts:1851) turns
a mismatch into a server-side DEFECT, inverting W8; (3) axis-B - elicitation was about
to stop being a server-initiated request.

What changed. (3) has happened, and not as removal. PRIMARY,
/specification/2026-07-28/basic/patterns/mrtr, fetched 2026-08-16, verbatim:

> Servers MUST send server-to-client requests (such as roots/list,
> sampling/createMessage, or elicitation/create) using the MRTR pattern. The
> previous pattern of server-initiated requests is no longer supported. This is a
> breaking change.

ElicitRequest survives as a VALUE INSIDE A RESULT: InputRequiredResult carries
resultType "input_required", an inputRequests map whose values "MUST be one of
ElicitRequest, CreateMessageRequest, or ListRootsRequest", and an optional opaque
requestState. Clients "MUST NOT inspect, parse, modify, or make any assumptions
about its contents"; servers "MUST protect its integrity (e.g. HMAC or AEAD)" where
it influences authorization or business logic. tools/call is one of exactly three
requests that may return it.

The re-derivation. Grounds (1) and (2) survive unchanged. Ground (3) inverts into
something more interesting than a refusal. Under MRTR an elicitation is A TYPED
REFUSAL CARRYING A NEXT STEP. Term for term:

| MRTR | foldlab, shipped today |
|---|---|
| resultType "input_required" | {"ok": false, "refusal": {...}} |
| inputRequests - what the server still needs | refusal.expected + refusal.example + refusal.next[].body (a FILLED retry template) |
| requestState - opaque, AEAD-protected, client MUST NOT inspect | the SESSION NAME + HEAD: flb_protocol_session_v0_ plus 64 hex, plus a hex64 head, both re-derivable, both evidence |
| "the server encodes any needed context into requestState, which the client echoes back on retry" | the partial IS the state and travels in every request/reply; or the journal IS the state and the client echoes {session, expectedHead} |
| JSON-RPC id MUST differ between attempt and retry | irrelevant - foldlab's identity is the value, never the call |

The shipped foldlab MCP surface is ALREADY MRTR-SHAPED, and strictly stronger on the
axis that matters here: MRTR's requestState is a decision the client is forbidden to
read; foldlab's travelling state is evidence the client is expected to verify. That is
the three-sorts distinction the MCP spec draws without naming it.

RULING for the protocol-session era: the refusal of elicitation/create AS A MECHANISM
holds and hardens. In order of force:

1. A protocol-session fill is a seat-attributed journal append, not a form. The
   evidence is {value, seat} pairs (out/37-dispute.json); a value answered by "the
   human at the client" carries no seat. Elicitation has no place to put a principal.
   Since the estate has NO PRINCIPAL AUTHENTICATION (seat bindings are bare strings),
   an elicitation-sourced fill would attribute a human's answer to whatever principal
   the server chose - worse than the current honor system, because it launders
   attribution through the protocol.
2. Elicitation would create a second admission path. certify(bytes) yielding
   Certificate-or-Refusal is the single admission path; a value arriving by
   ElicitResult decoding must still pass value_check. The elicitation round is pure UX
   with an extra failure mode (the pin's orDie), never an admission.
3. The nested-subset limit still bites, UNEVENLY. A decision hole's type
   ({k:"union", of:[literal accept|revise|reject]} plus note) IS expressible in the
   flat subset. A review hole's type is {k:"list", of:{k:"struct",...}}
   (proto/ts/src/protocol.ts:20-32) - an array of objects, which "complex nested
   structures, arrays of objects (beyond enums)" excludes. Elicitation could carry SOME
   holes and not others - the worst outcome: a capability whose applicability is a
   property of the ontology rather than of the protocol. A device with laws cannot have
   a channel whose totality depends on which domain got modeled.

What is NOT refused, and is newly attractive: InputRequiredResult itself, as the
ENCODING of a refusal that needs a human. On a pin bump, a refusal whose next hint
requires a human decision could be served as resultType "input_required" with
requestState = the canonical {session, expectedHead} bytes - NOT opaque, and
explicitly so, with a declared statement that foldlab's request state is inspectable
evidence and the spec's "MUST NOT inspect" binds the client's OBLIGATIONS, not the
server's SECRECY. A deliberate decision with a cost (R6).

### 2.6 What 2026-07-28 adds that a modeled device must now answer

PRIMARY, changelog + server/tools, fetched 2026-08-16. Beyond the 2026-08-14 read:

- structuredContent MAY NOW BE ANY JSON VALUE - "object, array, string, number,
  boolean, or null" - and outputSchema examples now include a top-level "type":"array".
  The pin's outputSchema.type === "object" guard (McpServer.ts:1286) is therefore MORE
  divergent than before: the spec now blesses a shape the pin refuses to advertise.
- ttlMs and cacheScope are REQUIRED on tools/list, prompts/list, resources/list,
  resources/read, resources/templates/list (minor change 5, CacheableResult). foldlab
  emits neither. For digest-addressed resources this is the missing immutability channel
  the 2026-08-14 read said did not exist - it exists now, and foldlab does not use it.
- "Servers MUST validate all tool inputs" (server/tools, Security Considerations 1).
  This turns FINDING-MCP-001 from a disposition question into a compliance question.
- Tool set "MUST NOT vary per-connection" - foldlab is compliant by construction (one
  derivation at startup, no EnabledWhen). The carve-out ("MAY vary by the authorization
  presented on the request") is exactly the axis foldlab has no machinery for.
- Tool names: allowed characters are ASCII letters, digits, underscore, hyphen, dot;
  uniqueness within a server is SHOULD. foldlab's dotted names are legal, and
  toolsFromContract's injectivity refusal (W10, mcp.ts:128-148) is STRONGER THAN THE
  SPEC REQUIRES - a SHOULD enforced as a refusal.
- Stateful tools guidance, non-normative but directly on point:

> MCP has no protocol-level session, so a server cannot rely on implicit
> per-connection state ... Servers that need to maintain state across calls ... should
> do so by returning an explicit handle from a creation tool and accepting that handle
> as an argument on subsequent calls.

and, same section: "For authenticated servers, a handle is a name, not a capability...
For unauthenticated servers, where the handle is necessarily a bearer token, it should
be generated with sufficient entropy." foldlab's flb_protocol_session_v0_ + 64 hex IS
this handle, and the spec's own guidance names foldlab's known gap precisely: WITH NO
PRINCIPAL AUTHENTICATION, THE SESSION HANDLE IS A BEARER TOKEN TODAY. It has 256 bits
of entropy and is content-addressed from the open event, so the entropy clause is
satisfied; the authorization clause is not.

### 2.7 Input validation: nobody enforces the advertised schema - including the daemon

FINDING-MCP-001 (proto/ts/FINDING-MCP-001.md, status "STOPPED before implementation",
2026-08-13) records that Tool.dynamic with a raw JSON Schema receives no validation.
Still true at the pin (repos/effect/packages/effect/src/unstable/ai/Tool.ts:1310-1311,
the constructor's own doc): "When parameters is a JSON Schema: handler receives
unknown, no validation".

RAN-IT, and this is new. I re-ran the witness and probed one step further:

| call | served schema says | what happened |
|---|---|---|
| type_create {} | required: ["structure"] | NO -32602; dispatched; daemon returned a malformed refusal envelope (out/06-missing-required-arg.json) |
| type_create {structure:{k:"string"}, bogus:1} | additionalProperties: false | ADMITTED: ok:true, created:false, digest 3b67b844... (out/08-excess-property.json) |
| the same body STRAIGHT AT THE DAEMON, bypassing MCP | - | ADMITTED: ok:true, created:true (out/20-daemon-excess-property.json) |

Row 1 is FINDING-MCP-001's recorded behavior, unchanged, and arguably fine: the daemon
is the validator and it refused with a teaching refusal. Rows 2 and 3 are NOT fine and
are not in the finding: the served inputSchema declares additionalProperties false, the
MCP layer does not check it, AND NEITHER DOES THE DAEMON. A misspelled "submiter"
instead of "submitter" is silently dropped and the caller is told ok:true.

By the estate's own law - constrained decode "refuses, never repairs" - dropping an
unread field IS a repair. By the estate's own precept - claims sized to evidence -
advertising additionalProperties false is a claim with no enforcer anywhere in the
system. This is a soundness defect of the derived surface IN THE OPPOSITE DIRECTION
from FINDING-MCP-001: not "advertised but unvalidated at the boundary", but "advertised
as a law that the authority behind the boundary also does not apply".

Corroborating LEAD (recorded as such): Specmatic's "Exposed: MCP Servers Are Lying
About Their Schemas" and several 2026 posts on MCP schema drift report this as an
ecosystem-wide pattern. I did not verify their measurements.

---

## 3. The laws a modeled MCP device owes, each with its rung

Rungs use the estate ladder (VERIFICATION.md): R0 fixture wall, R1 property test,
R2 bounded model check, R3 inductive invariant, R4 lockstep conformance against the
binary, R5 mechanized proof. Each law is stated so it can be false, given the cheapest
rung that catches it being false, and given the witness that would kill it.

### L1 - Derived-surface soundness (the tool list is a function of the contract)

LAW. For every daemon contract C that toolsFromContract accepts, the tool list served
by tools/list equals toolsFromContract(C) under RFC 8785 canonical bytes of the
projection {name, description, inputSchema, annotations, _meta}, including order.

RUNG: R0, a generated fixture wall - available today, ~30 lines. The generator is the
daemon itself. proto/ts/test/mcp.test.ts already compares served-vs-derived field by
field with toEqual; the missing rung is the CANONICAL-BYTES DIGEST PIN, which is what
makes it a wall rather than a structural comparison. My probe is that wall, run once:
served = derived = fc806f99...9ca7 over contract 59ef16e2...58a9.

KILLING WITNESS. A pinned tool-list digest that does not move when the contract digest
moves, or moves when it does not. The fixture must pin BOTH digests as a pair - a
tool-list digest alone would freeze the surface and forbid the daemon from growing a
request, the opposite of the intent. Per the 2026-08-15 generated-vectors ruling this
fixture is emitted by executing the daemon, never hand-typed, and must regenerate
byte-identically.

NOT COVERED, NAMED: outputSchema - see L2.

### L2 - Envelope derivation (the refusal vocabulary is not asserted)

LAW. The set of refusal kinds in every served outputSchema equals the pinned
kind-to-sort manifest proto/wire/refusal-sorts.json, canonical digest
26193b59e8c12952edaf206d1d31dca7974843c5db0f19f9be2f2faabc35ad03.

RUNG: R0/R1, one assertion, available today. I ran it
(out/21-refusal-kind-agreement.json): served enum equals DAEMON_REFUSAL_SORTS keys,
14 = 14, equal true. It belongs next to refusal-sort.test.ts, which already walls the
other three restatements.

KILLING WITNESS. Delete one literal from mcp.ts:31-50 and one from mcp.test.ts:14-28;
today both suites stay green. That mutant is the negative control the gate needs.

THE STRONGER FORM, AND ITS COST. The truly derived version makes the daemon publish the
kind vocabulary in contract.describe (today kind is {"k":"string"}) - e.g. as
{"k":"union","of":[{"k":"literal","value":"malformed"}, ...]}, which the existing
flb.type.v0 grammar already expresses. Then the enum is genuinely a function of
describe and L2 collapses into L1. COST: it moves the contract canonical bytes, hence
the contract digest, hence any fixture pinned to it; and it commits the daemon to a
closed refusal vocabulary at the wire - a real semantic decision (the open-string kind
is presumably deliberate) that owes its own grill.

### L3 - Annotation honesty (a hint is a claim; make it a consequence)

LAW. readOnlyHint true is served for a tool if and only if that tool subject is served
by a daemon handler that performs no journal append.

TODAY IT IS A NAME-KEYED ALLOWLIST (mcp.ts:112-118): three names get READ_ONLY, five get
CONVERGENT_MUTATION, everything else falls to CONSERVATIVE_MUTATION (destructive,
non-idempotent). The default is the safe direction - verified by mcp.test.ts, which
plants a synthetic future_mutation request and requires the conservative
classification. RAN-IT: served annotations matched derived annotations for all 15 tools.

THE GAP, NAMED. The classification is a claim about the DAEMON, checked against nothing
in the daemon. Rename type_create and it silently becomes destructive (safe). Add a
journal append behind contract_describe and it silently keeps readOnlyHint true
(UNSAFE). The spec is explicit that the client cannot help: "clients MUST consider tool
annotations to be untrusted unless they come from trusted servers" (server/tools,
fetched 2026-08-16).

RUNG: R4, lockstep against the binary. For each read-only-annotated tool, run it against
a live daemon, read the affected journal heads before and after via journal_read, and
require head equality. Cheap; converts a claim into a checked consequence. journal_read
is the instrument - the estate already verifies heads locally (W6).

COST: requires enumerating "the affected journals", which for contract_describe is "all
of them" and for a session verb is a reserved journal whose name is content-addressed. A
bounded version (catalog + the session own journal + data) is honest if the bound is
stated.

### L4 - Envelope totality (every daemon reply maps to exactly one envelope)

LAW. For every tool call, the JSON-RPC response is a result (never an error) whose
structuredContent decodes as {ok:true, ...fact} or {ok:false, refusal} against the
served outputSchema, with isError false.

STATUS: holds for everything I could induce, and I tried to break it.

| stimulus | result | RAN-IT |
|---|---|---|
| daemon refusal (bad kind) | envelope, isError:false | out/04-envelope-refusal.json |
| daemon fact | envelope, isError:false | out/05-envelope-fact.json |
| missing required arg | envelope (malformed), isError:false | out/06-missing-required-arg.json |
| malformed journal_read args | envelope (client-local malformed) - path mcp.ts:237-253 | - |
| DAEMON KILLED MID-SESSION | envelope (unreachable, local:true), isError:false | out/23-after-kill.json |
| second call after the kill | envelope (unreachable, ClosedConnectionError) | out/24-after-kill-2.json |

The kill test matters most: the seam stayed total across the death of the authority
behind it, because ProtoClient.request catches transport errors and returns a local
refusal rather than rejecting (proto/ts/src/client.ts:153-170).

TWO LIVE HOLES, BOTH REAL.

L4a - UNKNOWN TOOL ESCAPES AS A PROTOCOL ERROR. RAN-IT (out/07-unknown-tool.json):
tools/call with name no_such_tool returns JSON-RPC -32602 "Tool no_such_tool not
found" (McpServer.ts:297). The daemon has a refusal kind for exactly this -
unknown-request, "request subject has no handler" (refusal.go:34). So the estate
vocabulary covers the case and the MCP layer answers in a different dialect. The spec
sanctions the protocol-error channel here (Unknown tool is listed under Protocol
Errors, server/tools), so this is a CONFLICT BETWEEN THE SPEC MODEL AND THE ESTATE
LAW, not a bug in either. It must be DECIDED, not discovered later.

L4b - A DEFECT WOULD SILENTLY BECOME A LIE. mcp.ts:216 wraps each handler in
Effect.promise. A rejected promise is a DEFECT, and the pin maps every defect to
toolErrorResult(INTERNAL_TOOL_ERROR_MESSAGE) - isError true, one text block, no
structuredContent (McpServer.ts:1337, :1247-1253). I could not induce it (the client is
careful), which means the law currently holds BY THE CLIENT DISCIPLINE, NOT BY THE
ADAPTER. Effect.tryPromise with an explicit catch producing a local refusal would make
it hold by construction.

RUNG: R1 property test over an induced-failure set, plus R0 fixtures for the two decided
cases. Property: for all stimuli in a declared fault set (bad args, dead daemon,
oversized body, malformed reply bytes), the response has no error key and isError is
false. The fault set is the honest bound; it is not "all stimuli".

### L5 - Verbatim replies, with the one declared exception

LAW. A tool result fact fields are byte-for-value identical to the direct ProtoClient
reply, except journal_read, whose purpose is to replace the daemon claimed head with
the client locally verified cursor.

This is D23 verbatim-reply law, already walled in mcp.test.ts (MCP reply equals
client.fillType(...) reply). The exception is visible in the served envelope: verified
{seq, head} present, head absent (mcp.ts:225-236; mcp.test.ts asserts readReply.head is
undefined).

RUNG: R0, shipped. Stating it as a law of the DEVICE matters because it is the
load-bearing reason the two open findings (FINDING-MCP-PATH-001,
FINDING-MCP-EMPTY-CATALOG-001) are held rather than repaired at the MCP layer: both
proposed fixes would create a second refusal dialect. A modeled device makes "no second
dialect" a named law, so future repairs route to the daemon by construction rather than
by memory.

### L6 - Capability declaration (the device declares what it serves)

LAW. The capabilities object advertised at handshake names exactly the features the
server implements, and every advertised capability has a passing check.

STATUS: violated three ways today (2.2), and violated BY INHERITANCE - the pin
advertises completions and logging unconditionally (McpServer.ts:1937-1940) and
listChanged whenever tools exist.

RUNG: R0 fixture pinning the served capability object, plus one check per advertised
capability. The fixture is one line of probe output. The check per capability is what
makes it a law rather than a photograph: if completions is advertised, some
completion/complete call must succeed.

COST OF THE FIX: removing completions/logging requires patching the pin (the repo
already carries patches/), suppressing them at the transport, or accepting the
divergence with a written statement. All three are decisions; none is free.

### L7 - Handle discipline (the session name is a name, not a capability)

LAW. Possession of a session handle confers no authority; every state-changing call
carries a principal, and authority is decided by the seat bindings recorded at open.

STATUS: written into the daemon, unenforceable at the seam. RAN-IT
(out/31-seat-refusal.json), builder principal carol filling the coordinator hole:

```json
{"kind":"seat-unauthorized",
 "law":"a protocol fill principal must hold one of the target hole declared seats",
 "path":["principal"],"got":"carol","expected":["coordinator"],
 "sort":"structural","local":false}
```

(law sentence quoted with its possessive apostrophe removed for shell safety; the
verbatim text is in out/31-seat-refusal.json.)

Correct, and it teaches. But principal is a bare string supplied by the caller. The
spec stateful-tools guidance says a handle "is a name, not a capability" FOR
AUTHENTICATED SERVERS and "is necessarily a bearer token" for unauthenticated ones.
foldlab is the second case today, and MCP gives the estate no place to put an
authenticated principal that the daemon would believe.

RUNG: NONE AVAILABLE. THIS IS THE GAP, STATED AS A GAP. No rung is honest until
principal authentication exists. What IS available now: an R0 fixture pinning the
refusal-on-wrong-seat behavior (so the honor system is at least a CHECKED honor system),
plus a written statement in the device doc that seat authority is unauthenticated.
When the transport becomes Streamable HTTP, OAuth 2.1 / RFC 9728 is where this could
live - a build, not a wiring.

---

## 4. What a small formal model would look like, and what it would catch

### 4.1 The question, sharpened

Is this a TLA question like `verify/pipeline`, or a fixture wall like `proto/wire`?
**Neither alone** — and the MCP project has already made this exact choice and published
the trade.

**PRIMARY**, SEP-2484 ("Require Conformance Tests for Standards Track SEPs to Reach Final
Status", status Final, fetched 2026-08-16):

> This SEP **supersedes** SEP-1627 by accepting the conformance repository as the
> canonical home for conformance tests… SEP-1627's golden-trace approach was not
> carried forward; the scenario-and-checks model trades language-neutral fixtures for
> runtime expressiveness.

The MCP project **considered and rejected** language-neutral golden traces — exactly
foldlab's instrument — in favour of runtime scenarios in TypeScript. That is not an
argument that foldlab is wrong; the two optimize different things (one implementation's
identity vs many SDKs' interoperability). But a foldlab MCP fixture wall is a
**deliberate divergence from upstream's chosen model**, and should be stated as such
rather than presented as the obvious choice.

The same SEP hands foldlab something directly transplantable: the **traceability file**,
`sep-NNNN.yaml`, mapping "each MUST, MUST NOT, SHOULD, SHOULD NOT … to the check that
exercises it, or documents why it is excluded", with two exclusion flavours (framework
gap with a tracking issue; not-protocol-observable). That is `VERIFICATION.md`'s claims
ledger with a different filename, and the rationale is foldlab's own: "Without a defined
coverage bar, 'has a conformance test' would be relitigated on every SEP."

### 4.2 The three-part answer

**(a) The fixture wall is right for the derived surface, and it is R0.** L1, L2, L5, L6
are statements about *one input producing byte-identical output*. That is `proto/wire`'s
shape and exactly what the probe did. No state machine is involved: `tools/list` is a
pure function of the contract. A TLA+ spec for it would be modeling a function.

**(b) The state machine worth modeling is not the MCP session — it is the protocol
session projected through a stateless transport.** At 2026-07-28, MCP has **no**
protocol-level session: sessions, `Mcp-Session-Id`, `initialize`, and resumability are
all removed (changelog major 1, 2, 9). There is no MCP session state machine left to
model. What remains is:

> a client holds a handle `s`, issues independent `tools/call`s carrying `s`, may retry
> any of them, may interleave them with other clients' calls, and may lose any response

against a daemon whose protocol-session fold *is* a state machine (open →
filled/disputed/decided/sealed/unfilled, open → closed, with a per-session serialization
point at close). **The model's subject is the interaction between MCP's at-least-once,
unordered, no-resume delivery and the fold's convergence claims.**

That *is* a TLA question, and it is the same question `verify/pipeline` answered one
layer down. The MCP-layer analogue:

> **The MCP projection law.** For any interleaving of tool calls from any number of
> clients over one session handle, with arbitrary response loss and arbitrary client
> retry, the session's final state digest is a function of the *set* of admitted
> `(hole, value, seat)` triples and the close event, never of arrival order or retry
> count.

The estate already claims the fold half ("redelivering a journaled pair replies OK with
the head unchanged, so at-least-once delivery cannot grow the journal",
`CONTRACT.md:199-203`). What is **not** claimed, and what the model adds, is the
*transport* half: MCP loses responses ("A broken response stream loses the in-flight
request; clients **MUST** re-issue it as a new request with a new request ID"), so a
client that fills, loses the response, and refills is the normal case, not the edge case.

**What such a model would catch — four concrete things:**

1. **Lost-response retry against `close`.** Close is atomic under the per-session
   serialization point and "repeated closes refuse" (`CONTRACT.md:217-222`). A client
   whose close response is lost retries and receives `session-closed` — a **refusal** —
   for an operation that *succeeded*. **RAN-IT**: `out/34-early-close.json` shows the
   successful close returning `outcome: "abandoned"`; `out/35-post-close-fill.json` shows
   the terminal refusal. Is `session-closed` on a retried close distinguishable from
   `session-closed` on a genuinely late fill? Today the client must call
   `protocol.session.state` to find out, and nothing in the refusal says so. A real,
   cheap, findable defect in the *teaching*, not in the fold.
2. **Retry against a dispute.** A lost response on a fill that *created* a dispute,
   retried, is idempotent by the `(value, seat)` rule. A lost response on a fill that a
   *different* seat then contradicted, retried, absorbs into the candidate set. Both are
   claimed total; a model checks the claim survives every interleaving at small bounds
   (2 seats, 2 holes, 2 values).
3. **The cursor under retry.** `journal_read` returns a locally verified `{seq, head}`;
   MCP may lose it. A client re-reading from its last verified cursor is safe; one
   re-reading from scratch and folding twice is not. The model states which the tool's
   contract requires.
4. **Two clients, one handle.** MCP has no per-connection state, so nothing stops two MCP
   clients sharing a session handle and a principal. The fold's answer is expected-head
   CAS for `flb.session.v0` and the serialization point for `flb.protocol.session.v0`.
   The model is where "expected-head CAS is sufficient under MCP's delivery model"
   becomes a checked statement rather than an inherited one.

**Sizing (honest).** A small TLA+ spec: constants `{Seats, Holes, Values}` at 2/2/2,
actions `Fill(seat,hole,value)`, `Close(seat)`, `LoseResponse`, `Retry(op)`, one
invariant (final-state-digest is a function of the admitted set). Roughly the size of
`Pipeline.tla`, whose clean run was "43 states generated / 28 distinct, depth 7, under
1 s" (`verify/pipeline/README.md`). The refuted-configuration discipline transfers
directly: model the *shipped* rule as a second config and keep the counterexample as a
regression guard.

**(c) The Lean lane is not the right home — and I checked that it could be.** Lean 4.33.0
and Lake 5.0.0 are installed. `verify/moves` is a live Lake package with a `Moves.Wire`
slice already specced (`scratch/dispatch/24-ref1-wire-model-spec.md`). One could state
the MCP projection law in Lean; one should not, yet. The REF ladder's thesis is that the
*kernel* is what is worth extracting, and the MCP projection is not kernel — it is a
host-side transport property over a journal the kernel does not own (spec 24's ruling:
"the kernel-state footprint excludes the journal; the journal is host-owned"). Putting
the MCP law in Lean would grow the kernel footprint with session-length-dependent state,
which 24 explicitly forbids. **TLA+ is the right instrument because the property is about
schedules, not about values.**

### 4.3 The device's own ledger

What makes this a "modeled device" rather than a pile of tests is a `sep-NNNN.yaml`-shaped
**ledger for the MCP seam**: every normative sentence in the targeted revision, mapped to
a check or a documented exclusion. Two exclusion kinds from SEP-2484, both needed:
*framework gap* (observable but the harness cannot express it — e.g. HTTP transport
behaviors while foldlab is stdio-only) and *not protocol-observable* (client rendering).
Plus a third, foldlab-specific: *refused by law* — the capability exists, foldlab declines
it, and the sentence naming why is the entry. `completion/complete`,
`resources/subscribe`, `sampling/createMessage`, `elicitation/create` all become rows in
the ledger rather than absences in a doc.

---

## 5. Human collaboration through MCP, concretely

Grounded in probe 3: an entire two-round, three-seat task-acceptance protocol driven
**only** through MCP `tools/call`. Everything quoted is a real reply an MCP client
received.

### 5.1 What the client sees when it asks "what is going on"

`protocol.session.state` on a fresh round (`out/30-state-empty.json`):

```json
{"ok":true,
 "session":"flb_protocol_session_v0_c294de57…",
 "protocol":"2543ef8efd038e8f140b5887820d5b376b55920b823b95b9d6382a6e2b3cb4a6",
 "bindings":{"builder":"carol","coordinator":"bob","operator":"alice"},
 "holes":{"authorization":{"state":"open"},"build_report":{"state":"open"},
          "decision":{"state":"open"},"review":{"state":"open"},"spec":{"state":"open"}},
 "status":"open","head":"2f6a2e4a…",
 "next":[{"subject":"flb.req.protocol.session.state",
          "note":"read the verified current protocol-session fold",
          "body":{"session":"flb_protocol_session_v0_c294de57…"}}]}
```

**The finding: there is no frontier here.** `ProtocolStateReply`
(`proto/ts/src/wire.ts:237-249`) carries `holes: Record<name, HoleState>` and nothing
else per hole — no type digest, no authorized seats, no legal-value example, no path.
And the single `next` hint is *"read the state again"* — a fixpoint, not a move.

Contrast the authoring session, which does carry a frontier: `flb.session.v0` state facts
carry `frontier` computed from the partial and the catalog snapshot
(`CONTRACT.md:143-146`), and the stateless concierge returns
`{path, legal:[{kind,example}], refs}` on every fill/unfill (`CONTRACT.md:91-95`).

**So the estate has a frontier fold, and the protocol-session projection does not expose
it.** An MCP client wanting to render "what may I do next" must: `protocol.session.state`
→ take the `protocol` digest → `journal_read` the catalog → find the protocol record →
read its `holes[].type` and `holes[].seats` → `journal_read` again to resolve each type
digest → cross-join with the state's hole states — and only then know that `bob` may
fill `spec` with a `{title: string, body_digest: string}`. Six round trips to answer the
first question a human asks.

### 5.2 The asymmetry: the system only teaches after you are wrong

**RAN-IT**, the wrong-seat fill (`out/31-seat-refusal.json`) returns
`expected: ["coordinator"]`. The type-invalid fill (`out/32-value-refusal.json`) returns:

```json
{"kind":"invalid-structure",
 "law":"a protocol fill value must conform to the hole's cataloged flb.type.v0 structure",
 "path":["value","title"],"got":7,"expected":{"type":{"k":"string"}}, …}
```

Both refusals contain exactly the frontier information the state reply omits: the
authorized seats, and the hole's type structure. **The daemon knows the frontier; it
discloses it only on refusal.** For an LLM quarantined to proposing among frontier-legal
moves, that is the wrong way round: the quarantine gets enforced by letting the model make
an illegal move and reading the refusal — learning-by-refutation as a *runtime* strategy
rather than a *design* one.

The single most consequential UX finding in this lane, with a small fix: **add `frontier`
to `ProtocolStateReply`** — for each open hole, its seats, its type digest, and a worked
example the daemon guarantees it would accept (C4's law, one layer up). Cost: it moves the
reply shape, hence the contract, hence the tool's `outputSchema`, hence any pinned
fixture; and the "worked example" obligation is a real proof obligation (C4 is witnessed
today at `proto/go/protod/conformance_test.go:554` for the type frontier and would need
its protocol-session analogue).

### 5.3 Seat decisions, as an MCP client sees them

**RAN-IT**, the dispute (`out/37-dispute.json`) — coordinator says accept, operator says
reject:

```json
{"ok":true,"head":"f73d0fa1…",
 "hole_state":{"state":"disputed",
   "candidates":[{"value":{"note":"lgtm","verdict":"accept"},"seat":"coordinator"},
                 {"value":{"note":"no","verdict":"reject"},"seat":"operator"}]}}
```

and the terminal fold after close (`out/40-state-closed-2.json`):

```json
"decision":{"state":"decided","value":{"note":"no","verdict":"reject"},
            "candidates":[…both…]},
"status":"closed","outcome":"completed",
"final_state_digest":"99d68c52dce3f054da74edf1cd58e4e14a13bc1851dfe06127a02eae87ac9e96"
```

**This is the strongest part of the surface.** Three things an MCP client can render
honestly with zero extra machinery:

1. **A dispute is a value, not an error.** The client shows both candidates, each
   attributed to a seat. Nobody's answer was destroyed.
2. **The fence's outcome is explained by data already on the wire.** The protocol declared
   `fence: {rule:"seat-authority", order:["operator","coordinator"]}`, and the decided
   value is the operator's. A client holding the protocol record can render "resolved by
   declared seat authority: operator outranks coordinator" without asking anything.
3. **The round's identity is a digest.** `final_state_digest` is the artifact a downstream
   session can pin.

Missing for UX: the state reply gives `candidates` but not *why* one won — the fence rule
lives in the protocol record, which the client must fetch separately (the same six-hop
problem as 5.1). A `decided_by: {rule, seat}` field would close it, and it is derivable,
not new information.

### 5.4 Refusal-repair rounds, as a loop

**RAN-IT**, the actual sequence a client walked:

```
fill spec (title: 7)      -> refusal invalid-structure, path ["value","title"], expected {"type":{"k":"string"}}
fill spec (title: "ship…") -> ok, hole_state.state = "filled"
                                  candidates: [{value, seat:"coordinator"}]
```

Two properties make this loop mechanical rather than conversational:

- **The refusal names the path in the request body.** `["value","title"]` is a pointer into
  the exact JSON the client sent, so a repair is a set-at-path, not a re-authoring.
  (Caveat: not universally true — `FINDING-MCP-PATH-001` records that `type_fill` refusals
  report paths relative to the reconstructed partial, not the request body. The
  protocol-session fill path is the good case; the type-fill path is the recorded open
  finding.)
- **`next[].body` is a filled retry template**, so a client can replay it byte for byte.
  The shipped MCP test does exactly this and asserts the replay returns an equal refusal;
  the `_meta` NATS-subject mapping is what makes the hint's `subject` resolvable to a tool
  name (`mcp.test.ts`, and `mcp.ts:210`).

**The repair loop an MCP client can run today, without new machinery:** call → if
`ok:false`, read `refusal.next[0].subject` → find the tool whose
`_meta["foldlab.dev/nats-subject"]` equals it → apply the repair at `refusal.path` →
call again. Four steps, all data-driven. That is the concrete answer to "how do
refusal-repair rounds surface in an MCP client": **as a fold over the refusal value, using
`_meta` as the routing table.**

### 5.5 The three concrete UX deficits, ranked

1. **No frontier in the protocol-session projection** (5.1/5.2). Six round trips to answer
   "what may I do next", and the answer is only complete after an illegal move. Fix:
   `frontier` on `ProtocolStateReply`.
2. **`next` hints are a fixpoint at the happy path.** Every successful protocol-session
   reply's only hint is "read the state again" (`out/33-repaired-fill.json`,
   `out/37-dispute.json`, `out/39-close-completed.json`). W7 says replies teach; on the
   success path they currently teach only how to re-read. Fix: hints naming the next
   *legal move* — the frontier again.
3. **No way to be told.** With `subscriptions/listen` refused and notifications distrusted
   (correctly — broadcast, dropped pre-initialization, never redelivered), a human
   collaborator learns their seat is needed by **polling `protocol.session.state`**. That
   is the honest design and should be *stated* as such, with the interval a client concern,
   rather than left as an apparent omission. The estate's alternative — "a notification is
   a hint to go read something; the read is the evidence" — is right, and it means the
   device owes a *documented polling contract*, not a subscription.

---

## 6. Gaps this lane could not close

1. **I could not test the 2026-07-28 behaviors.** The pin implements one adapter,
   `McpProtocol.v2025_06_18` (`repos/effect/.../McpProtocol.ts:16`), and foldlab selects it
   (`mcp.ts:266`). Every claim about `InputRequiredResult`, `server/discover`,
   `subscriptions/listen`, `ttlMs`/`cacheScope`, and `resultType` is **PRIMARY from the
   spec text, not RAN-IT**. I did not attempt a pin bump.
2. **I did not run the upstream conformance suite.** `modelcontextprotocol/conformance`
   exists (SEP-2484, PRIMARY) and would give a compliance percentage against the foldlab
   server. Running it needs a network install and a dev-dependency decision, both outside a
   research lane's writ. **The single highest-value unrun experiment in this report.**
3. **L3's unsafe direction is unproven either way.** I did not verify that
   `contract_describe` and `protocol.session.state` truly append nothing; I read the
   annotation table and confirmed it is a name-keyed allowlist. The R4 rung is proposed,
   not run.
4. **L4b is unfalsified, not proven.** I could not induce a defect through the MCP handler;
   that is evidence the client is careful, not evidence the seam is total. A
   fault-injecting `ProtoClient` stub would settle it in ten lines.
5. **No multi-client interleaving was exercised.** Probe 3 is a single client issuing
   ordered calls. The MCP projection law (§4.2) is a conjecture supported by the fold's own
   claims, not by a run.
6. **The excess-property defect's blast radius is unmeasured.** I showed `type.create`
   ignores an unread field. I did not check whether *every* handler does, nor whether any
   handler has a field whose misspelling would change meaning (`submitter`,
   `assertedDigest`, `principal`, `expectedHead`). A misspelled `expectedHead` would be the
   dangerous case and I did not test it.
7. **Prior art on formally modeling MCP: searched, essentially not found.** Searched for
   TLA+ / state-machine / formal models of MCP (WebSearch, 2026-08-16). Results were
   security taxonomies and general TLA+ material, plus one paper stating that defining the
   MCP exchange in process calculi or state machines is an open direction. **No published
   formal model of the MCP session was found.** The conformance work (SEP-2484 and its
   repository) is scenario-based, explicitly not fixture-based. The schema-drift literature
   found is blog-level (LEAD). **Absence recorded as a finding**: if foldlab builds §4.2's
   spec, it is plausibly first.
8. **Two open MCP findings remain unratified and untouched by this lane** —
   FINDING-MCP-PATH-001 (fill refusals lose request-body provenance) and
   FINDING-MCP-EMPTY-CATALOG-001 (fill overwrites unknown-ref resolver hints). Both are
   daemon-side decisions; a modeled MCP device makes the reason they cannot be fixed at the
   MCP layer into a named law (L5), which is the most this lane can contribute.

---

## 7. Recommendations, each with its cost and its reversal

**R1 — Pin the derived surface by canonical digest (L1).** *Cost:* the fixture must pin
(contract digest → tool-list digest) as a pair and be regenerated by executing the daemon
per the 2026-08-15 ruling; a regeneration step joins CI. Adds nothing to the trusted base.
*Reversal:* delete two files.

**R2 — Add the one-line refusal-vocabulary agreement check (L2), with a planted mutant.**
*Cost:* ~15 lines in `proto/ts/test/`, plus one negative control. Nothing else.
*Reversal:* delete the test. **Do this first — the cheapest closed drift channel here.**

**R3 — Decide the `additionalProperties` claim (§2.7).** Either the daemon refuses unread
request-body fields (constrained decode applied to the envelope, not just the value), or
`toJsonSchema` stops emitting `additionalProperties: false`. *Cost:* option one is a
wire-behavior change that moves refusal fixtures and could break callers who send extra
fields today; option two weakens the advertised schema and makes typo-detection impossible
forever. *Reversal:* option one is a one-line revert plus fixture regeneration; option two
is not reversible in a shipped client's expectations. **Recommend option one, gated on
measuring the blast radius (gap 6).**

**R4 — Decide L4a: unknown tool.** Either accept the spec's protocol-error channel for
"unknown tool" and *write it down* as the device's one sanctioned exception to envelope
totality, or intercept and return an `unknown-request`-shaped envelope. *Cost:* the second
diverges from `server/tools`, which explicitly lists "Unknown tool" as a protocol error,
and would make a compliance run fail. *Reversal:* trivial either way. **Recommend the
first — write the exception down.**

**R5 — Add `frontier` to `ProtocolStateReply` (§5.5.1).** *Cost:* highest here. It moves
the contract's canonical bytes → the contract digest → the tool's `outputSchema` → every
fixture pinned to any of those. It creates a new proof obligation (the C4-analogue: every
offered example is directly accepted). And DEV-670's corpus must not already be frozen
against the current shape — check before proposing. *Reversal:* expensive once a corpus is
generated; cheap before. **Highest-value UX change and the one most constrained by the wall
schedule; belongs to a grill, not to a research lane.**

**R6 — Do not adopt elicitation; do pre-decide the MRTR posture (§2.5).** Write one
paragraph now stating that on a pin bump, foldlab's `InputRequiredResult.requestState`
will carry *inspectable canonical evidence* (`{session, expectedHead}`), not an AEAD blob,
and that the spec's client-side "MUST NOT inspect" is read as a client obligation rather
than a server-secrecy requirement. *Cost:* commits foldlab to a reading a strict reader
could contest, and forecloses encoding server-side secrets in request state. *Reversal:*
free until the pin bumps.

**R7 — Build the MCP projection TLA+ spec (§4.2) at 2 seats / 2 holes / 2 values.**
*Cost:* one more spec in `verify/`, one more tool pin (TLC), and the usual risk that a
refuted config becomes a permanent regression guard with an abstraction caveat (as
`Pipeline.orphan.cfg` already carries). Adds nothing to the *runtime* trusted base.
*Reversal:* delete `verify/mcp/`; the seam status returns to `walled`.

**R8 — Stand up the device's traceability ledger in SEP-2484 shape (§4.3).** Every
normative sentence of the targeted revision → a check, or one of three documented
exclusions (framework gap / not-observable / refused-by-law). *Cost:* real authoring
effort, and it makes the coverage gap *visible* — the point, and the discomfort.
*Reversal:* delete a file; the claims revert to prose.

**R9 — Run the upstream conformance suite once (gap 2).** *Cost:* a dev dependency, a
network install, and a percentage that may be uncomfortable. *Reversal:* remove the
dependency. **The single experiment most likely to change this report's conclusions, and
one I could not justify running inside a no-repo-writes research lane.**

---

## 8. Sources

### Executed on this machine, 2026-08-16 (transcripts in `out/`)

- `probe.ts` → `out/01-initialize.json`, `02-tools-list.json`, `03-*.json` (capability
  sweep), `04-envelope-refusal.json`, `05-envelope-fact.json`,
  `06-missing-required-arg.json`, `07-unknown-tool.json`, `08-excess-property.json`,
  `09-contract-describe.json`, `10-derived-tools.json`, **`11-diff-report.json`** (the byte
  diff), `11a`/`11b` canonical bytes, `12-one-served-tool.json`,
  `13-outputSchema-type_create.json`, `99-raw-transcript.txt`.
- `probe2.ts` → `out/20-daemon-excess-property.json`, `20b-daemon-clean.json`,
  **`21-refusal-kind-agreement.json`**, `22-before-kill.json`, **`23-after-kill.json`**,
  `24-after-kill-2.json`.
- `probe3.ts` → `out/30-state-empty.json` … `out/41-full-transcript.json`.
- Toolchain: `bun 1.3.14`, `go1.26.5 windows/amd64`, `Lake 5.0.0-src+d8b1897 / Lean 4.33.0`.

### foldlab repository (read, cited file:line)

- `proto/ts/src/mcp.ts` — `:1-10` derivation discipline; `:31-50` hand-written
  daemon-refusal kind literals; `:52-65` local-refusal literals; `:71-77`
  `McpOutputEnvelope`; `:112-118` `annotationsForRequest`; `:123-181` `toolsFromContract`
  incl. `:128-148` W10 injectivity refusal; `:197-270` `mcpLayer`, `:216` `Effect.promise`,
  `:225-253` the `journal_read` branch, `:260-269` the served protocol list.
- `proto/ts/src/mcp-main.ts:1-38` — startup derivation, one `describe`.
- `proto/ts/src/client.ts:80-180` — `connect`/`request`, `:153-170` transport-error →
  local-refusal; `:185-292` publish/read; `:377-423` protocol verbs.
- `proto/ts/src/wire.ts:8-22` subjects; `:29-56` `DAEMON_REFUSAL_SORTS` +
  `REFUSAL_SORT_GRAMMAR_DIGEST`; `:213-250` protocol reply shapes.
- `proto/ts/src/protocol.ts:4-48` task-acceptance hole types; `:58-96` the protocol record
  used by probe 3.
- `proto/ts/src/jcs.ts:36-108` canonicalize / structureDigest.
- `proto/ts/test/mcp.test.ts:14-28` the fifth kind restatement; `:159-380` the live wall.
- `proto/ts/test/mcp-derivation-conformance.test.ts:30-49` W10 controls.
- `proto/ts/test/refusal-sort.test.ts:16-53` the grammar-digest wall.
- `proto/ts/FINDING-MCP-001.md` (2026-08-13, STOPPED), `FINDING-MCP-PATH-001.md`,
  `FINDING-MCP-EMPTY-CATALOG-001.md` — three open, unratified findings.
- `proto/go/protod/refusal.go:1-70` — kind constants, `refusalSortByKind`,
  `RefusalSortGrammarDigest`.
- `proto/go/protod/refusal_sort_test.go:13-62` — the Go side of the wall.
- `proto/wire/CONTRACT.md:85-115` frontier + C1/C2/C4; `:117-150` `flb.session.v0` and its
  frontier-bearing state fact; `:165-235` `flb.protocol.v0` and protocol sessions;
  `:310-320` the refusal-kind/sort table.
- `verify/pipeline/README.md` — the TLA+ precedent, its verdicts, its run record.
- `docs/design/2026-08-14-mcp-surface-deep-read.md` — the prior deep read; this report
  updates its §3.1, §3.3, §3.5, and Part 4.
- `scratch/dispatch/24-ref1-wire-model-spec.md` — journal is host-owned, kernel footprint
  excludes it (why §4.2(c) routes to TLA+, not Lean).

### Vendored pin — `repos/effect/packages/effect/src/unstable/ai/`, `effect@4.0.0-rc.108`

- `McpProtocol.ts:16` — the single `v2025_06_18` adapter.
- `McpServer.ts:297` unknown-tool `InvalidParams`; `:1247-1253` `toolErrorResult`;
  `:1281-1298` the tool descriptor incl. **`:1286`** the `outputSchema.type === "object"`
  guard; `:1305-1338` result mapping, `:1312-1313` `isError:false` + `structuredContent`,
  `:1337` defect → generic error; `:1828-1857` `elicit`, `:1851` `Effect.orDie`;
  `:1936-1983` `initialize`, **`:1937-1940`** unconditional `completions`/`logging`,
  `:1941-1943` `listChanged`; `:1985-2052` wire handlers; `:2008-2037` subscribe →
  MethodNotFound; `:357-376` the completion handler and its 100-cap.
- `Tool.ts:1281-1311` — `dynamic`'s own doc: "When `parameters` is a JSON Schema: handler
  receives `unknown`, no validation".

### Model Context Protocol specification — all fetched 2026-08-16

- `https://modelcontextprotocol.io/specification/2026-07-28/changelog` — major 1-9,
  minor 1-12, Deprecated 1-4, Governance.
- `https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr` — the MUST
  on server-initiated requests; `InputRequests`/`InputResponses`/`InputRequiredResult`;
  `requestState` client and server requirements; the three supported client requests.
- `https://modelcontextprotocol.io/specification/2026-07-28/server/tools` — per-connection
  invariance; deterministic ordering SHOULD; tool-name rules;
  `outputSchema`/`structuredContent` (any JSON value); the two-channel error model with
  "Unknown tool" as a protocol error; annotations untrusted; Stateful Tools guidance;
  "Servers MUST: Validate all tool inputs".
- `https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion` —
  `values` max 100, relevance ordering SHOULD, two reference types, error codes.
- `https://modelcontextprotocol.io/seps/2484-conformance-tests-required-for-final-seps.md`
  — Final; conformance repository as canonical home; the `sep-NNNN.yaml` traceability file
  and its two exclusion flavours; **"SEP-1627's golden-trace approach was not carried
  forward"**.
- `https://modelcontextprotocol.io/llms.txt` — page index used to locate the above.

### Secondary (LEAD — recorded, not relied on)

- Specmatic, "Exposed: MCP Servers Are Lying About Their Schemas"; c-sharpcorner, "Testing
  MCP Servers for Schema Drift and Tool Compatibility"; dev.to, "My MCP Tools Broke
  Silently — Schema Drift Is the New Dependency Hell" (surfaced by search 2026-08-16).
  They corroborate §2.7's pattern ecosystem-wide; none was verified.
- arXiv 2604.05969 (formal security framework for MCP agents) and 2512.08290 (SoK:
  security and safety in the MCP ecosystem) — surfaced by search; **not fetched**, so their
  contents are UNVERIFIED here. Recorded only to support the absence claim in gap 7:
  nothing in the result set was a formal model of the MCP session.
