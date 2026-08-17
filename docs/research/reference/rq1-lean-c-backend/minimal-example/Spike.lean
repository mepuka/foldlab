/-!
# RQ-1 minimal example — one Lean function through the C backend

Own-authored for foldlab RQ-1, 2026-08-16. Nothing here is copied from
another project; it exists to answer, mechanically, what `@[export]`
actually emits and what a C caller owes the runtime.

Four exports, chosen to probe four separate questions:

* `spike_add`   — scalar in, scalar out (does anything need boxing?)
* `spike_step`  — `ByteArray → ByteArray`, the pure shape D-d wants
* `spike_pair`  — `ByteArray → ByteArray × ByteArray`, the real D-d
                  arity: one input, two outputs, so we learn what a
                  product return looks like at the C ABI
* `spike_io`    — the same work in `IO`, to see what the `IO` wrapper
                  costs the caller
-/

/-- Scalar in, scalar out. -/
@[export spike_add]
def spikeAdd (a b : UInt64) : UInt64 := a + b

/-- Bytes in, bytes out. Total: every input returns a value. -/
@[export spike_step]
def spikeStep (input : ByteArray) : ByteArray :=
  input.push 0x21  -- ASCII '!'

/-- Bytes in, two byte strings out — the `(state', receipt)` shape. -/
@[export spike_pair]
def spikePair (input : ByteArray) : ByteArray × ByteArray :=
  (input.push 0x21, ByteArray.mk #[0x6f, 0x6b])  -- "ok"

/-- The same work, but in `IO`. -/
@[export spike_io]
def spikeIO (input : ByteArray) : IO ByteArray :=
  pure (input.push 0x21)

/-- Byte length of a `ByteArray`, returned unboxed. -/
@[export spike_size]
def spikeSize (input : ByteArray) : UInt64 :=
  input.size.toUInt64

/-- A partial function forced off its domain: what does the host see when
Lean panics? D-d says a trap is a gate failure, so we need to know what
`panic!` actually does to a C caller before REF-6 relies on totality. -/
@[export spike_panic]
def spikePanic (input : ByteArray) : ByteArray :=
  if input.size = 0 then
    panic! "spike: empty input"
  else
    input

/-- The refusal discipline D-d actually wants: no panic, a typed answer
for every input. Tag byte 0 = ok, 1 = refused. -/
@[export spike_total]
def spikeTotal (input : ByteArray) : ByteArray :=
  if input.size = 0 then
    ByteArray.mk #[1]
  else
    (ByteArray.mk #[0]) ++ input
