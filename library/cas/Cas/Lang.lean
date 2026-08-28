/-!
# The Cas language

An effects language over a content-addressed store. A program is a tree of
operations; each operation waits for an answer before the rest of the
program (its continuation) can proceed. `step` consumes exactly one
operation; `run` is iterated `step` — an operation with indeterminate end,
so it carries fuel.

Vocabulary: an `Obj` (kind, payload, links) is the stored thing, a `Link`
is a typed pointer (expected kind + address), an `Addr` is the digest.
Programs cannot mention concrete addresses except as answers from `put`
and `load` or as inputs — the address scheme is the interpreter's choice,
never the program's.

There is no loop primitive. Programs form a monad, so reduce-with-an-
opaque-function is `List.foldlM` — fold arrives for free.
-/

namespace Cas.Lang

/-! ## Objects — the nouns -/

/-- An address: the digest of an object's canonical encoding. -/
abbrev Addr := List UInt8

/-- A typed pointer: the address must resolve to an object of this kind. -/
structure Link where
  kind : UInt8
  addr : Addr
  deriving Repr, BEq

/-- The stored thing: a kind byte, opaque payload bytes, and links out. -/
structure Obj where
  kind : UInt8
  payload : List UInt8
  links : List Link
  deriving Repr, BEq

/-! ## Toy addressing — a stand-in digest so the semantics is executable.
The language never depends on which digest this is. -/

def fnv1a (bytes : List UInt8) : UInt64 :=
  bytes.foldl (fun h b => (h ^^^ b.toUInt64) * 0x100000001b3) 0xcbf29ce484222325

def digest (bytes : List UInt8) : Addr :=
  [56, 48, 40, 32, 24, 16, 8, 0].map (fun s => ((fnv1a bytes) >>> (UInt64.ofNat s)).toUInt8)

/-- 4-byte big-endian length frame. -/
def encNat (n : Nat) : List UInt8 :=
  [24, 16, 8, 0].map (fun s => UInt8.ofNat ((n >>> s) % 256))

/-- Canonical shallow encoding: version byte, kind, framed payload, framed
links. Children appear only as addresses. -/
def encode (o : Obj) : List UInt8 :=
  0 :: o.kind :: (encNat o.payload.length ++ o.payload
    ++ encNat o.links.length
    ++ o.links.flatMap (fun l => l.kind :: l.addr))

def addressOf (o : Obj) : Addr := digest (encode o)

/-! ## The operations — the verbs

Each operation declares its answer type. `fail` answers `Empty`: a refused
program has no continuation, by type — there is nothing a program could do
after failing. -/

inductive CasE where
  | put (obj : Obj)
  | load (addr : Addr)
  | ask (prompt : String)
  | fail (reason : String)

/-- What the interpreter owes each operation. -/
abbrev Ans : CasE → Type
  | .put _ => Addr
  | .load _ => Obj
  | .ask _ => String
  | .fail _ => Empty

/-! ## Programs — operation trees -/

/-- A program either is done, or performs one operation and continues as a
function of the answer. -/
inductive Prog (A : Type) where
  | pure (value : A)
  | vis (op : CasE) (continue_ : Ans op → Prog A)

def Prog.bind : Prog A → (A → Prog B) → Prog B
  | .pure a, f => f a
  | .vis e k, f => .vis e (fun r => (k r).bind f)

instance : Monad Prog where
  pure := .pure
  bind := .bind

/-- Perform one operation and return its answer. -/
def op (e : CasE) : Prog (Ans e) := .vis e .pure

def put (o : Obj) : Prog Addr := op (.put o)
def load (a : Addr) : Prog Obj := op (.load a)
def ask (prompt : String) : Prog String := op (.ask prompt)

/-- Refuse. The `Empty` answer means no continuation exists. -/
def fail (reason : String) : Prog A := .vis (.fail reason) (fun e => e.elim)

/-- Fail-closed guard: continue only if the condition holds. -/
def require (condition : Bool) (reason : String) : Prog Unit :=
  if condition then .pure () else fail reason

/-! ## The store and one step of interpretation -/

/-- The store: admitted objects at their addresses, newest first. -/
abbrev Store := List (Addr × Obj)

/-- A link resolves when its address holds an object of the expected kind. -/
def resolves (s : Store) (l : Link) : Bool :=
  match s.lookup l.addr with
  | some o => o.kind == l.kind
  | none => false

/-- Where a program stands after some steps. -/
inductive Status (A : Type) where
  | done (value : A)
  | running (rest : Prog A)
  | refused (reason : String)

def Status.isDone : Status A → Bool
  | .done _ => true
  | _ => false

def Status.isRefused : Status A → Bool
  | .refused _ => true
  | _ => false

/-- Consume exactly one operation. Admission is here: `put` refuses a
dangling or ill-kinded link, `load` refuses a missing address — fail
closed, the program's continuation is never invoked on a broken answer.
The oracle answers `ask`; its nondeterminism enters only as the recorded
answer. Re-putting identical bytes is the identity. -/
def step (oracle : String → String) : Prog A → Store → Status A × Store
  | .pure a, s => (.done a, s)
  | .vis (.put o) k, s =>
      if o.links.all (resolves s) then
        let a := addressOf o
        (.running (k a), if (s.lookup a).isSome then s else (a, o) :: s)
      else (.refused "dangling link", s)
  | .vis (.load a) k, s =>
      match s.lookup a with
      | some o => (.running (k o), s)
      | none => (.refused "no object at address", s)
  | .vis (.ask p) k, s => (.running (k (oracle p)), s)
  | .vis (.fail reason) _, s => (.refused reason, s)

/-- Iterated `step` — an operation with indeterminate end, so it carries
fuel. Out of fuel reports the program still `running`. -/
def run (oracle : String → String) (fuel : Nat) (p : Prog A) (s : Store) :
    Status A × Store :=
  match fuel with
  | 0 => (.running p, s)
  | fuel + 1 =>
      match step oracle p s with
      | (.running rest, s') => run oracle fuel rest s'
      | halted => halted

end Cas.Lang
