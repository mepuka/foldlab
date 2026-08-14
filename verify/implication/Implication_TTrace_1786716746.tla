---- MODULE Implication_TTrace_1786716746 ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, Implication

_expression ==
    LET Implication_TEExpression == INSTANCE Implication_TEExpression
    IN Implication_TEExpression!expression
----

_trace ==
    LET Implication_TETrace == INSTANCE Implication_TETrace
    IN Implication_TETrace!trace
----

_inv ==
    ~(
        TLCGet("level") = Len(_TETrace)
        /\
        phase = ("decided")
        /\
        sub = (<<0, 1, 0>>)
        /\
        refusal = ([path |-> 2, got |-> 0])
    )
----

_init ==
    /\ sub = _TETrace[1].sub
    /\ phase = _TETrace[1].phase
    /\ refusal = _TETrace[1].refusal
----

_next ==
    /\ \E i,j \in DOMAIN _TETrace:
        /\ \/ /\ j = i + 1
              /\ i = TLCGet("level")
        /\ sub  = _TETrace[i].sub
        /\ sub' = _TETrace[j].sub
        /\ phase  = _TETrace[i].phase
        /\ phase' = _TETrace[j].phase
        /\ refusal  = _TETrace[i].refusal
        /\ refusal' = _TETrace[j].refusal

\* Uncomment the ASSUME below to write the states of the error trace
\* to the given file in Json format. Note that you can pass any tuple
\* to `JsonSerialize`. For example, a sub-sequence of _TETrace.
    \* ASSUME
    \*     LET J == INSTANCE Json
    \*         IN J!JsonSerialize("Implication_TTrace_1786716746.json", _TETrace)

=============================================================================

 Note that you can extract this module `Implication_TEExpression`
  to a dedicated file to reuse `expression` (the module in the 
  dedicated `Implication_TEExpression.tla` file takes precedence 
  over the module `Implication_TEExpression` below).

---- MODULE Implication_TEExpression ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, Implication

expression == 
    [
        \* To hide variables of the `Implication` spec from the error trace,
        \* remove the variables below.  The trace will be written in the order
        \* of the fields of this record.
        sub |-> sub
        ,phase |-> phase
        ,refusal |-> refusal
        
        \* Put additional constant-, state-, and action-level expressions here:
        \* ,_stateNumber |-> _TEPosition
        \* ,_subUnchanged |-> sub = sub'
        
        \* Format the `sub` variable as Json value.
        \* ,_subJson |->
        \*     LET J == INSTANCE Json
        \*     IN J!ToJson(sub)
        
        \* Lastly, you may build expressions over arbitrary sets of states by
        \* leveraging the _TETrace operator.  For example, this is how to
        \* count the number of times a spec variable changed up to the current
        \* state in the trace.
        \* ,_subModCount |->
        \*     LET F[s \in DOMAIN _TETrace] ==
        \*         IF s = 1 THEN 0
        \*         ELSE IF _TETrace[s].sub # _TETrace[s-1].sub
        \*             THEN 1 + F[s-1] ELSE F[s-1]
        \*     IN F[_TEPosition - 1]
    ]

=============================================================================



Parsing and semantic processing can take forever if the trace below is long.
 In this case, it is advised to uncomment the module below to deserialize the
 trace from a generated binary file.

\*
\*---- MODULE Implication_TETrace ----
\*EXTENDS IOUtils, TLC, Implication
\*
\*trace == IODeserialize("Implication_TTrace_1786716746.bin", TRUE)
\*
\*=============================================================================
\*

---- MODULE Implication_TETrace ----
EXTENDS TLC, Implication

trace == 
    <<
    ([phase |-> "submitted",sub |-> <<0, 1, 0>>,refusal |-> [path |-> 0, got |-> 0]]),
    ([phase |-> "decided",sub |-> <<0, 1, 0>>,refusal |-> [path |-> 2, got |-> 0]])
    >>
----


=============================================================================

---- CONFIG Implication_TTrace_1786716746 ----
CONSTANTS
    MaxLen = 4
    Rule = "sorted"

INVARIANT
    _inv

CHECK_DEADLOCK
    \* CHECK_DEADLOCK off because of PROPERTY or INVARIANT above.
    FALSE

INIT
    _init

NEXT
    _next

CONSTANT
    _TETrace <- _trace

ALIAS
    _expression
=============================================================================
\* Generated on Fri Aug 14 09:12:27 CDT 2026