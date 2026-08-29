import Cas.Lang.Handler

/-!
# Authenticated computation — the prover and the verifier, as handlers

λ•'s three modes over one source program (Miller–Hicks–Katz–Shi, POPL
2014) become, here, three HANDLERS over one `Prog CasSig`. There is no
second term and no compilation pass, so λ•'s agreement relation — one
rule per language construct — has nothing to relate; what it would have
proved is instead the absence of a construction.

**The operation correspondence, and the correction it forces.** `put`
is λ•'s `auth`: both digest a canonical encoding, answer the digest,
and reveal NOTHING to a proof stream, because a verifier holding the
node can digest it itself. `load` is λ•'s `unauth`: both take a digest,
must be HANDED content by someone, and check that the content digests
to the demanded address. So the proof stream is the LOAD trace. It is
not the store word, which is the PUT trace; conflating the two is the
mistake this module exists to not make.

**The proof word.** The carrier is reused unchanged: a proof word is a
`Word` in its verifier-facing role, in which the `address` field is
UNTRUSTED DECORATION and the check is `addr H ⟨b.node, _⟩ = a`, never
`b.address = a`. `verifyHandler` never reads `b.address`, and
`verify_load_accept` states that as a theorem rather than a comment.

**Three handlers, three trust postures, one carrier.** `replayHandler`
(`Handler.lean`) is NEITHER of these: it answers a `put` by comparing
the whole node against the recorded binding, so it presupposes the
replayer already holds the content and can never be deceived. A
verifier holds a digest only and is handed content by an untrusted
party. `proveHandler` records; `verifyHandler` checks; `replayHandler`
compares.

**Level 0 throughout.** `verify_load_or_collision` — ADSG's Lemma 6 in
estate form — has NO premise on `H`. It PRODUCES a collision pair
rather than assuming none exists, so CAS-003's empty Level 2 is
untouched, and the statement is a direct application of
`addr_eq_or_collision` (`Cas/Core/Address.lean`).

**ADSF's correction, at one-operation granularity.** Brun–Traytel (ITP
2019) found that ADSG's published security theorem has the wrong shape:
the verifier cannot DETECT that a collision occurred and keeps
consuming the stream, so evaluation does not stop at the collision. At
this slice's granularity the correction is a placement rule, and the
statements below obey it: the fact that the verifier consumed exactly
one head and continues on the tail is stated OUTSIDE the
resident-or-collision disjunction, holding identically in both
branches. Nothing here says the verifier halts on the collision branch,
because it does not. The multi-step lift inherits that placement as
ADSF's `π₀′`.
-/

namespace Cas.Lang

section Authenticated

variable (H : Bytes → Addr32)

/-! ## The honest word

The premise that separates a STORE word from a CLAIMED one. -/

/-- An honest word: every binding is address-correct — its node is a
codec-image node bound at its OWN address. This is the invariant the
reference semantics maintains (`referenceHandler_honest`), and it is
exactly what the `address` field of a PROOF word does not carry. -/
def HonestWord (w : Word) : Prop :=
  ∀ b ∈ w, ∃ h : b.node.WF, addr H ⟨b.node, h⟩ = b.address

/-- The empty word is honest. -/
theorem honestWord_nil : HonestWord H [] := by
  intro b hb
  exact absurd hb (by simp)

/-- Appending an address-correct binding preserves honesty. -/
theorem honestWord_snoc {w : Word} {a : Addr32} {n : Node}
    (hw : HonestWord H w) (h : n.WF) (ha : addr H ⟨n, h⟩ = a) :
    HonestWord H (w ++ [Binding.mk a n]) := by
  intro b hb
  rcases List.mem_append.mp hb with hmem | hmem
  · exact hw b hmem
  · have hb' : b = Binding.mk a n := by simpa using hmem
    subst hb'
    exact ⟨h, ha⟩

/-- An honest word's resident at an address is that address's
pre-image: what `find` answers digests to the address asked for. -/
theorem honestWord_find {w : Word} {a : Addr32} {n : Node}
    (hw : HonestWord H w) (hf : Word.find w a = some n) :
    ∃ h : n.WF, addr H ⟨n, h⟩ = a := by
  obtain ⟨h, ha⟩ := hw _ (Word.find_mem hf)
  exact ⟨h, ha⟩

/-! ## Mode P — the prover -/

/-- The prover's target: the store word and the emitted proof word
threaded together, refusal terminal. -/
abbrev ProveM := StateT (Word × Word) (Except Refusal)

/-- THE PROVER (λ• mode P). The store clauses are the reference
semantics unchanged — the prover is an honest interpreter — with one
addition: every `load` EMITS the binding it answered onto the proof
word. `put` emits nothing, because a verifier holding the node computes
the address itself; that asymmetry is the whole content of the
correspondence, and it is why the proof word is the load trace. -/
def proveHandler : Handler CasSig ProveM where
  handle
    | .put n => fun s =>
      if h : n.WF then
        match _root_.Cas.put H (Word.toStore s.1) ⟨n, h⟩ with
        | .error e => .error (.ofAdmission e)
        | .ok (.fresh a _) => .ok (a, (s.1 ++ [Binding.mk a n], s.2))
        | .ok (.duplicate a) => .ok (a, (s.1, s.2))
        | .ok (.conflict a _) => .error (.collision a)
      else .error .notWellFormed
    | .load a => fun s =>
      match Word.find s.1 a with
      | some n => .ok (n, (s.1, s.2 ++ [Binding.mk a n]))
      | none => .error (.noObject a)
    | .fail reason => fun _ => .error (.failed reason)

/-- The prover's store discipline IS the reference semantics: the
answer and the successor store word agree with `referenceHandler` at
every operation. The proof word is a pure addition — the prover cannot
lie about the store by recording. -/
theorem proveHandler_store_agree (op : CasSig.Op) (w π : Word) :
    ((proveHandler H).handle op (w, π)).map (fun r => (r.1, r.2.1))
      = (referenceHandler H).handle op w := by
  cases op with
  | put n =>
    by_cases h : n.WF
    · cases hp : _root_.Cas.put H (Word.toStore w) ⟨n, h⟩ with
      | error e =>
        simp [proveHandler, referenceHandler, dif_pos h, hp, Except.map]
      | ok o =>
        cases o <;>
          simp [proveHandler, referenceHandler, dif_pos h, hp, Except.map]
    · simp [proveHandler, referenceHandler, dif_neg h, Except.map]
  | load a =>
    cases hf : Word.find w a <;>
      simp [proveHandler, referenceHandler, hf, Except.map]
  | fail reason => simp [proveHandler, referenceHandler, Except.map]

/-! ## Mode V — the verifier -/

/-- The verifier's target: the CLAIMED proof word, consumed head-first,
and nothing else. No store — that is the point. -/
abbrev VerifyM := StateT Word (Except Refusal)

/-- THE VERIFIER (λ• mode V). It holds no store: a `put` is answered by
digesting the node it was handed, exactly as the prover would, because
the verifier constructed it. A `load` is the only stream-consuming
clause: pop the head of the claimed proof word, REQUIRE that its node
is a codec-image node whose address is the one demanded, and answer
that node. The head's own `address` field is never read.

The well-formedness gate is the codec's image condition, not an extra
assumption: `Node.WF` is decidable and, by image exactness
(`decode_exact`), is exactly membership in the encoder's image — the
verifier is checking that the bytes it was handed parse before it
believes their digest. -/
def verifyHandler : Handler CasSig VerifyM where
  handle
    | .put n => fun π =>
      if h : n.WF then .ok (addr H ⟨n, h⟩, π)
      else .error .notWellFormed
    | .load a => fun π =>
      match π with
      | [] => .error (.failed "verify: proof word exhausted")
      | b :: rest =>
        if h : b.node.WF then
          if addr H ⟨b.node, h⟩ = a then .ok (b.node, rest)
          else .error
            (.failed "verify: digest does not match the demanded address")
        else .error .notWellFormed
    | .fail reason => fun _ => .error (.failed reason)

/-- What an accepted `load` certifies, unpacked. Two facts, and the
second is the certificate: the verifier consumed EXACTLY ONE head off
the claimed proof word — whose `address` field is left existential,
because the verifier never reads it — and the answer is a codec-image
node whose address is the address demanded. Everything the verifier
knows after accepting is here; in particular it does not know the node
is the honest resident, which is what the next theorem is about. -/
theorem verify_load_accept {a : Addr32} {π rest : Word} {m : Node}
    (h : (verifyHandler H).handle (.load a) π = .ok (m, rest)) :
    (∃ dec : Addr32, π = Binding.mk dec m :: rest)
      ∧ ∃ hm : m.WF, addr H ⟨m, hm⟩ = a := by
  match π with
  | [] => simp [verifyHandler] at h
  | ⟨dec, node⟩ :: tail =>
    by_cases hwf : node.WF
    · by_cases hd : addr H ⟨node, hwf⟩ = a
      · have hval : (verifyHandler H).handle (.load a)
              (Binding.mk dec node :: tail) = .ok (node, tail) := by
          simp [verifyHandler, dif_pos hwf, if_pos hd]
        rw [hval] at h
        have h' := Except.ok.inj h
        have hfst : node = m := congrArg Prod.fst h'
        have hsnd : tail = rest := congrArg Prod.snd h'
        subst hfst
        subst hsnd
        exact ⟨⟨dec, rfl⟩, hwf, hd⟩
      · simp [verifyHandler, dif_pos hwf, if_neg hd] at h
    · simp [verifyHandler, dif_neg hwf] at h

/-- **ADSG Lemma 6, estate form** — the single-operation
ideal-or-collision disjunct, at hash-lattice **Level 0**: no premise on
`H` appears, and the right branch EXHIBITS a collision rather than
excluding one.

If the verifier accepts a `load` against address `a`, answering `m`
from a claimed proof word, and the honest word resides `n` at `a`, then
the verifier consumed exactly one head and continues on `rest` —
stated outside the disjunction, because it holds in BOTH branches
(ADSF's correction: the verifier cannot detect a collision and does not
halt on one) — and either `m` IS the honest resident, or `m` and `n`
are two distinct canonical byte strings that `H` maps to one address:
the witness, named where it lives.

The proof is `addr_eq_or_collision` applied once. That it is only that
is the finding: the verifier's acceptance condition and the honest
word's address-correctness are the SAME equation about `H`, read from
two sides.

What the multi-step lift owes, named here so it is not discovered late:
`hresident` is the ONLY hypothesis this statement cannot see for
itself, and it is not a hash property — it is the prover's own `load`
clause succeeding at the same address. A run in which the verifier
demands an address the honest word does not hold is an address the
PROVER would have refused, so the lift discharges `hresident` from the
prover run's success, never from an assumption about `H`. That is why
this slice stays at Level 0 and why the lift does too. -/
theorem verify_load_or_collision {w π rest : Word} {a : Addr32}
    {m n : Node}
    (hw : HonestWord H w)
    (hresident : Word.find w a = some n)
    (haccept : (verifyHandler H).handle (.load a) π = .ok (m, rest)) :
    (∃ dec : Addr32, π = Binding.mk dec m :: rest)
      ∧ (m = n ∨
          (encodeNode m ≠ encodeNode n ∧
            H (encodeNode m) = H (encodeNode n))) := by
  obtain ⟨hhead, hm, hma⟩ := verify_load_accept H haccept
  obtain ⟨hn, hna⟩ := honestWord_find H hw hresident
  refine ⟨hhead, ?_⟩
  have hdig : addr H (⟨m, hm⟩ : AdmittedNode)
      = addr H (⟨n, hn⟩ : AdmittedNode) := by
    rw [hma, hna]
  rcases addr_eq_or_collision H hdig with heq | ⟨hne, hcol⟩
  · exact Or.inl (congrArg Subtype.val heq)
  · exact Or.inr ⟨hne, hcol⟩

/-! ## The premise is discharged, not assumed -/

/-- The reference semantics maintains honesty: `put` binds a node at
its own address and `load` does not grow the word, so an honest word
stays honest under every accepted operation. `verify_load_or_collision`
therefore rests on a property the estate's own semantics establishes,
never on a claim about the store. -/
theorem referenceHandler_honest (op : CasSig.Op) {w w' : Word}
    {ans : CasSig.Ans op} (hw : HonestWord H w)
    (h : (referenceHandler H).handle op w = .ok (ans, w')) :
    HonestWord H w' := by
  cases op with
  | put n =>
    by_cases hwf : n.WF
    · cases hp : _root_.Cas.put H (Word.toStore w) ⟨n, hwf⟩ with
      | error e => simp [referenceHandler, dif_pos hwf, hp] at h
      | ok o =>
        cases o with
        | fresh a σ' =>
          have hval : (referenceHandler H).handle (.put n) w
              = .ok (a, w ++ [Binding.mk a n]) := by
            simp [referenceHandler, dif_pos hwf, hp]
          rw [hval] at h
          have hsnd : w ++ [Binding.mk a n] = w' :=
            congrArg Prod.snd (Except.ok.inj h)
          subst hsnd
          obtain ⟨_, _, ha, _⟩ := put_fresh_spec hp
          exact honestWord_snoc H hw hwf ha.symm
        | duplicate a =>
          have hval : (referenceHandler H).handle (.put n) w = .ok (a, w) := by
            simp [referenceHandler, dif_pos hwf, hp]
          rw [hval] at h
          have hsnd : w = w' := congrArg Prod.snd (Except.ok.inj h)
          subst hsnd
          exact hw
        | conflict a occ => simp [referenceHandler, dif_pos hwf, hp] at h
    · simp [referenceHandler, dif_neg hwf] at h
  | load a =>
    cases hf : Word.find w a with
    | none => simp [referenceHandler, hf] at h
    | some m =>
      have hval : (referenceHandler H).handle (.load a) w = .ok (m, w) := by
        simp [referenceHandler, hf]
      rw [hval] at h
      have hsnd : w = w' := congrArg Prod.snd (Except.ok.inj h)
      subst hsnd
      exact hw
  | fail reason => simp [referenceHandler] at h

end Authenticated

end Cas.Lang
