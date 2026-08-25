/-
The corpus rows, restated as KERNEL-CHECKED THEOREMS (the parameterized-equation ruling,
2026-08-25).

WHAT THIS CHANGES. `Shell/Vectors.lean` computes every column of `vectors/*.vectors` by
calling the proven functions, and `mise run gen` + `git diff --exit-code` (ruling CV-1,
candidate C-2) makes a drift in those columns a failing diff. That is a claim about a
PROCESS: run the emitter, compare the bytes. This module makes the same columns a claim
about a PROOF instead. Each theorem below pins one column of one committed row, and the
literal in it was transcribed from the committed file. The emitted corpus is therefore a
PROJECTION of theorems: if the emitter's row and the theorem's literal ever disagree, the
build fails here — before any file is written, and without anyone running the generator.

The two instruments differ in kind and neither subsumes the other:

  the ratchet   the FILE ON DISK equals what the emitter computes today
  this module   what the emitter computes equals a literal the kernel has checked

A codec change that moved the emitter and the file together passes the ratchet — the exact
self-referential shape that made the differential harness blind (see `Shell/Vectors.lean`'s
header). It cannot pass this module.

WHAT IS PINNED, AND WHAT IS NOT. The theorems are stated about the EMITTER'S OWN ROWS —
`Shell.positiveVectors`, `Shell.rejectionVectors`, `Shell.continuityWitnesses`, resolved
through `Shell.resolveVector` and `Shell.rejectionClause`, the same calls
`renderPositiveFile` and `renderRejectionFile` make. A theorem here therefore constrains
the row the emitter will print, not a carrier that merely resembles it. What is NOT pinned
is the fixture list itself: that the 32 positive carriers name every arm of
`E2/Encode.lean` remains a REVIEWED claim, exactly as `Shell/Vectors.lean` says. Coverage
is audited; the numbers are proved.

WHY `decide +kernel`. `E2.encNat` — the LEB128 length frame every framed payload passes
through — is defined by well-founded recursion, so it carries `irreducible` and the
ELABORATOR refuses to evaluate it; a plain `decide` reports a stuck instance rather than a
verdict. Making it semireducible does unstick the elaborator, but the elaborator then
reduces `WellFounded.fix` through `Acc.rec` in interpreted Lean: measured on the
digest-free rows alone, 200 seconds and 4.4 GB, which the machine killed before the digest
rows were reached. `decide +kernel` asks the KERNEL for the verdict instead. The kernel
never consulted the reducibility attribute in the first place and reduces in C++: the same
rows fall to 2 seconds. This is F-18's lesson in a new dress — the literals resisted, and
the cause was an irreducible definition rather than a wrong number.

It is not a soundness relaxation. `decide +kernel` moves work from the elaborator to the
kernel; the kernel is what has to be convinced either way, and `#print axioms` below
reports what the resulting proofs rest on.

COST, AND WHAT WAS THEREFORE LEFT OUT. One kernel evaluation of `Sha3.Impl.sha3_512` costs
about 8.7 seconds and peaks near 3.9 GB on this leg — the same order as `Sha3/Kats.lean`
itself, which the estate already pays (41 s, 6.0 GB, measured alongside). Schema pre-image
and clause columns need no digest at all. An ENTITY pre-image does: it embeds the cited
schema's address, so it costs one. An entity ADDRESS costs two.

MEASURED, clean rebuild of this package, this module in and out:

  without this module   14.2 s wall, 118 jobs
  with it              172.7 s wall, 120 jobs
  delta                +158.5 s  (18 digest evaluations, 7.1 GB peak)

The full address column would be 46 digest evaluations, roughly 6.5 minutes on top of the
pre-image work — past the budget this seat was given. So the address column is stated for
a REPRESENTATIVE SUBSET and the rest is left to the emitter and the CV-1 ratchet. The
excluded rows are named here; nothing is dropped silently.

  ADDRESS COLUMN PROVED HERE   S-01, S-03, E-01, C-01
  ADDRESS COLUMN NOT PROVED    S-02, S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-11,
                               S-12, S-13, S-14, S-15, S-16, S-17, S-18, S-19, S-20,
                               S-21, E-02, E-03, E-04, E-05, E-06, E-07, E-08, E-09,
                               E-10, E-11  (emitter + CV-1 ratchet only)

The subset is not arbitrary, and the column it samples is the one that repeats itself. An
address is `H` applied to a pre-image this module already proves, and `H` is the estate's
kernel-KAT'd `Sha3.Impl.sha3_512` (`Sha3.Kats`, CAVP). Every address theorem therefore
states the same composition over different bytes; four instances demonstrate it and
twenty-nine more restate it. The four chosen are the ones that also say something else:

  C-01  the continuity witness — the one address committed elsewhere in the estate, so it
        is the row that ties this corpus to the older byte string
  S-03  the anchor whose digest the `S-15` and `E-10` fixtures splice in, so every
        cross-reference inside the corpus descends from it
  S-01  and E-01 interlock: S-01's address literal appears verbatim inside E-01's
        pre-image literal, so the pair pins the `schema` cite column too

That last point generalizes and is worth stating plainly: the `schema` cite column of ALL
ELEVEN entity rows is kernel-checked as BYTES, because the cited address sits inside that
row's proved pre-image literal. What the absent S-row address theorems would add is the
name of the row those bytes came from, not the bytes.
-/
import Shell.Vectors

namespace Shell

open E2

set_option maxRecDepth 8000000
set_option maxHeartbeats 8000000

/-! Elaborate one theorem at a time. Each `decide +kernel` hands the kernel a large ground
term, and a digest evaluation alone peaks near 3.9 GB; holding several at once on a 16 GB
machine is how the first drafts of this module got killed. Measured honestly, serializing
did NOT lower this module's own peak (7.1 GB either way — the digests dominate and they run
one after another regardless). It is kept because it makes the peak PREDICTABLE rather
than a function of how many cores `lake` happened to give this file, and `lake` still
parallelizes across modules. -/

set_option Elab.async false

/-! ## Projections of the emitter's rows

Every theorem below is stated through one of these, so a theorem's subject is the row
`Shell/Vectors.lean` will print — not a restatement of it. `none` when no row carries that
id, which no theorem below could then prove. -/

/-- Resolve the row with this id out of a table of golden vectors. -/
def resultOfRow (vs : List GoldenVector) (id : String) : Option VecResult :=
  (vs.find? (fun v => v.vecId == id)).bind (fun v => (resolveVector v).toOption)

/-- The `preimage` column of positive row `id`. -/
def rowPreimage (id : String) : Option String :=
  (resultOfRow positiveVectors id).map VecResult.resPreimage

/-- The `address` column of positive row `id`. -/
def rowAddress (id : String) : Option String :=
  (resultOfRow positiveVectors id).map VecResult.resAddress

/-- The `admission` column of positive row `id`. -/
def rowAdmission (id : String) : Option String :=
  (resultOfRow positiveVectors id).map VecResult.resAdmission

/-- The continuity witnesses' carriers, as a table of golden vectors. -/
def witnessVectors : List GoldenVector :=
  continuityWitnesses.map ContinuityWitness.cwVector

def witnessPreimage (id : String) : Option String :=
  (resultOfRow witnessVectors id).map VecResult.resPreimage

def witnessAddress (id : String) : Option String :=
  (resultOfRow witnessVectors id).map VecResult.resAddress

def witnessAdmission (id : String) : Option String :=
  (resultOfRow witnessVectors id).map VecResult.resAdmission

/-- The `clause` column of rejection row `id`, through the emitter's own
    `Shell.rejectionClause`. -/
def rejectionClauseOf (id : String) : Option String :=
  (rejectionVectors.find? (fun r => r.rejId == id)).bind
    (fun r => (rejectionClause r).toOption)

/-- The byte string a continuity witness must reproduce, as the emitter holds it: the
    address standing committed at `ContinuityWitness.cwSite`. -/
def witnessCommitted (id : String) : Option String :=
  (continuityWitnesses.find? (fun w => w.cwVector.vecId == id)).map
    ContinuityWitness.cwCommitted

/-! ## The rows

One theorem per column per row. The literals are the committed files' own text —
`vectors/positive.vectors` and `vectors/rejection.vectors` — transcribed once. -/

/-! ### `preimage` column, positive table (all 32 rows) -/

theorem v_S01_preimage : rowPreimage "S-01" =
    some "01003000" := by decide +kernel

theorem v_S02_preimage : rowPreimage "S-02" =
    some "01003001" := by decide +kernel

theorem v_S03_preimage : rowPreimage "S-03" =
    some "01003002" := by decide +kernel

theorem v_S04_preimage : rowPreimage "S-04" =
    some "01003003" := by decide +kernel

theorem v_S05_preimage : rowPreimage "S-05" =
    some "0100311304676f6c64" := by decide +kernel

theorem v_S06_preimage : rowPreimage "S-06" =
    some "0100311101" := by decide +kernel

theorem v_S07_preimage : rowPreimage "S-07" =
    some "010031120106" := by decide +kernel

theorem v_S08_preimage : rowPreimage "S-08" =
    some "0100320201610030020162013003" := by decide +kernel

theorem v_S09_preimage : rowPreimage "S-09" =
    some "0100330230023003" := by decide +kernel

theorem v_S10_preimage : rowPreimage "S-10" =
    some "0100343001" := by decide +kernel

theorem v_S11_preimage : rowPreimage "S-11" =
    some "010035000230023003" := by decide +kernel

theorem v_S12_preimage : rowPreimage "S-12" =
    some "010035010230013a" := by decide +kernel

theorem v_S13_preimage : rowPreimage "S-13" =
    some "010036300320096d696e4c656e67746812000301" := by decide +kernel

theorem v_S14_preimage : rowPreimage "S-14" =
    some "01003630022102200267741200000020026c7412000a01" := by decide +kernel

theorem v_S15_preimage : rowPreimage "S-15" =
    some "0100374027d77d3bdd54ae5f783a56e0662b83837600334a65e75d427153ac3488fe16a469cc79259b4ed55ede9eb73d86ed5664230feeac3d922e5d1a05c45ff6338a38" := by decide +kernel

theorem v_S16_preimage : rowPreimage "S-16" =
    some "01003901643201046e657874013800" := by decide +kernel

theorem v_S17_preimage : rowPreimage "S-17" =
    some "010039046c6973743501023113036e696c32020468656164003002047461696c003800" := by decide +kernel

theorem v_S18_preimage : rowPreimage "S-18" =
    some "01003a" := by decide +kernel

theorem v_S19_preimage : rowPreimage "S-19" =
    some "01003b02300330023001" := by decide +kernel

theorem v_S20_preimage : rowPreimage "S-20" =
    some "01003c3003" := by decide +kernel

theorem v_S21_preimage : rowPreimage "S-21" =
    some "0100311380017878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878" := by decide +kernel

theorem v_E01_preimage : rowPreimage "E-01" =
    some "0101408056929b3e00ca275a7680c72ca1b9b91dd004f193454d4a697cc42b92eff7c4de90aa200289a1b4cd8161847568bac7f1cb3f49bc3758746fd182380476e82610" := by decide +kernel

theorem v_E02_preimage : rowPreimage "E-02" =
    some "0101405c0db4e754259b64dad70674a3031af2a22686459c32abdec57cea327f2d069e5926ce98ada04a7215c610a7589939629a361a5f898ac3d6e994139acdaf9adf1101" := by decide +kernel

theorem v_E03_preimage : rowPreimage "E-03" =
    some "0101405c0db4e754259b64dad70674a3031af2a22686459c32abdec57cea327f2d069e5926ce98ada04a7215c610a7589939629a361a5f898ac3d6e994139acdaf9adf1100" := by decide +kernel

theorem v_E04_preimage : rowPreimage "E-04" =
    some "01014027d77d3bdd54ae5f783a56e0662b83837600334a65e75d427153ac3488fe16a469cc79259b4ed55ede9eb73d86ed5664230feeac3d922e5d1a05c45ff6338a38120007" := by decide +kernel

theorem v_E05_preimage : rowPreimage "E-05" =
    some "01014027d77d3bdd54ae5f783a56e0662b83837600334a65e75d427153ac3488fe16a469cc79259b4ed55ede9eb73d86ed5664230feeac3d922e5d1a05c45ff6338a38120000" := by decide +kernel

theorem v_E06_preimage : rowPreimage "E-06" =
    some "01014027d77d3bdd54ae5f783a56e0662b83837600334a65e75d427153ac3488fe16a469cc79259b4ed55ede9eb73d86ed5664230feeac3d922e5d1a05c45ff6338a38120106" := by decide +kernel

theorem v_E07_preimage : rowPreimage "E-07" =
    some "010140bf279c82644b7403aaa5f6f325c6ed3197266b5715285639152c717b16ef3d320db553733deb08a6ed2c9370572b0acd73ac5468886f9dccc3d65c9098ca572e1304676f6c64" := by decide +kernel

theorem v_E08_preimage : rowPreimage "E-08" =
    some "0101402ec09c13373a901b5271ed74642293a9f4ff679c7ad4cbc5fb29b8cdd8bed3d1fddb582d41de06030d213002f89892414ca17bf554d54d9040cac8b4d1c5eacd140211011100" := by decide +kernel

theorem v_E09_preimage : rowPreimage "E-09" =
    some "01014000672751ca11709fbe8b7008ba326353ac5254a7e7911a5eb57f0bc8ab42261721a5b0566f8361fd51bb6532e8cb318623ff15618e0787289a33043765a97cd1150201611200010162130374776f" := by decide +kernel

theorem v_E10_preimage : rowPreimage "E-10" =
    some "010140618313386b5802bce0d1f8ae960a1b0f33d8f20bc73ef0dc31888bfd4e30362710cbcc2104ce305344c5a2f9e081b29731c09635d113b7098de672716fcc7486164027d77d3bdd54ae5f783a56e0662b83837600334a65e75d427153ac3488fe16a469cc79259b4ed55ede9eb73d86ed5664230feeac3d922e5d1a05c45ff6338a38" := by decide +kernel

theorem v_E11_preimage : rowPreimage "E-11" =
    some "010140bf279c82644b7403aaa5f6f325c6ed3197266b5715285639152c717b16ef3d320db553733deb08a6ed2c9370572b0acd73ac5468886f9dccc3d65c9098ca572e1380017878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878787878" := by decide +kernel

/-! ### `admission` column

Every positive row reads `ok`, and that much the emitter already enforces at emit time:
`renderPositiveFile` refuses to write the file if any fixture is inadmissible. What it does
NOT do is enforce it at build time, so one row states the shape here — the digest-free one,
since resolving the whole column would cost the thirteen digests the pre-image theorems
already pay for. The interesting `admission` value in the corpus is the continuity
witness's, and that one is proved outright below. -/

theorem v_S01_admission : rowAdmission "S-01" = some "ok" := by decide +kernel

/-! ### `preimage` and `admission` columns, continuity witnesses

`C-01` is inadmissible by design — it IS rejection vector `R-01`'s `closed` carrier — so
its `admission` column is a verdict, not an `ok`, and the theorem states the verdict. -/

theorem c_C01_preimage : witnessPreimage "C-01" =
    some "01003800" := by decide +kernel

theorem c_C01_admission : witnessAdmission "C-01" =
    some "REJECTED:closed" := by decide +kernel

/-! ### `clause` column, rejection table (all 6 rows) -/

theorem r_R01_clause : rejectionClauseOf "R-01" =
    some "closed" := by decide +kernel

theorem r_R02_clause : rejectionClauseOf "R-02" =
    some "guarded" := by decide +kernel

theorem r_R03_clause : rejectionClauseOf "R-03" =
    some "dup-key" := by decide +kernel

theorem r_R04_clause : rejectionClauseOf "R-04" =
    some "spelling" := by decide +kernel

theorem r_R05_clause : rejectionClauseOf "R-05" =
    some "lit-narrow" := by decide +kernel

theorem r_R06_clause : rejectionClauseOf "R-06" =
    some "dup-key-value" := by decide +kernel

/-! ### `address` column — the representative subset

Four rows, chosen for the reasons the header gives. Every other row's address column is
covered by the emitter and the CV-1 ratchet only; the header names them all. -/

theorem v_S01_address : rowAddress "S-01" =
    some "8056929b3e00ca275a7680c72ca1b9b91dd004f193454d4a697cc42b92eff7c4de90aa200289a1b4cd8161847568bac7f1cb3f49bc3758746fd182380476e826" := by decide +kernel

theorem v_S03_address : rowAddress "S-03" =
    some "27d77d3bdd54ae5f783a56e0662b83837600334a65e75d427153ac3488fe16a469cc79259b4ed55ede9eb73d86ed5664230feeac3d922e5d1a05c45ff6338a38" := by decide +kernel

theorem v_E01_address : rowAddress "E-01" =
    some "3017de0a6a7bd17ab5316ec2cd020baf706402e6547cbee6d3dd89f19f62ab0e124990da4c90166639d23297f0358ed97ef521a5c100d547ed62537f180e1792" := by decide +kernel

theorem c_C01_address : witnessAddress "C-01" =
    some "6669f686ad57eac1e08dcf6d5c8d9e4022247adea8b0e784c8f5f9654db0f4ca08c87cb55b3db4c88bc9eb61874ede6f0ef2c128d09bdb687a1b229a7e56afcd" := by decide +kernel

/-! ### The continuity witness's cross-estate pin

`C-01`'s address is not merely computed here: it is the byte string standing committed at
`harness/12-wfs-closed.script:39`. The emitter fails unless its own computation agrees.
This states the other half — that the transcription the emitter compares against is the
one `c_C01_address` proves — so the corpus, the old committed filename, and the kernel are
one claim rather than three. -/

theorem c_C01_committed : witnessCommitted "C-01" = witnessAddress "C-01" := by
  rw [c_C01_address]; decide +kernel

/-! ## Axiom reports (the house pattern)

One per theorem shape: a digest-free schema pre-image, one that needs the LEB128 frame, a
multi-block payload, an entity pre-image (one digest), a schema and an entity address, the
continuity witness's address and verdict, a rejection clause, and the cross-estate pin.

MEASURED PROFILE, uniform across all eleven: `[propext, Classical.choice, Quot.sound]` —
the estate's ordinary ceiling, the same three `Sha3.Bridge` reports.

The three are NOT the tactic's doing, which is worth pinning down because the tactic is
the new thing here. `decide +kernel` discharges through `of_decide_eq_true`, a theorem
rather than an axiom, and on a goal whose carriers are axiom-free it leaves no trace:
`(1 : Nat) + 1 = 2` by `decide +kernel` depends on no axioms at all. The three arrive from
the `DecidableEq` instances of the carriers these statements are written in — `String` on
every row, `E2.SchemaCore` and `E2.Value` underneath — and they are already present in any
`decide` over those types. `Sha3.Kats` reports the narrower `[propext, Quot.sound]` for
the same digest because it states its known answers over `List UInt8` and closes them with
`rfl`, touching no `Decidable` instance.

What matters is what is ABSENT: no `ofReduceBool`, no `ofReduceNat`. No step of any proof
below was delegated to compiled code — the kernel reduced every byte itself. Anything
outside those three would be a finding, not a nuisance. -/

#print axioms v_S01_preimage
#print axioms v_S05_preimage
#print axioms v_S21_preimage
#print axioms v_E01_preimage
#print axioms v_E10_preimage
#print axioms v_S03_address
#print axioms v_E01_address
#print axioms c_C01_address
#print axioms c_C01_admission
#print axioms r_R01_clause
#print axioms c_C01_committed

end Shell
