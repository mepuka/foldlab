---- MODULE Replay_TTrace_1786730217 ----
EXTENDS Sequences, TLCExt, Replay, Toolbox, Naturals, TLC

_expression ==
    LET Replay_TEExpression == INSTANCE Replay_TEExpression
    IN Replay_TEExpression!expression
----

_trace ==
    LET Replay_TETrace == INSTANCE Replay_TETrace
    IN Replay_TETrace!trace
----

_inv ==
    ~(
        TLCGet("level") = Len(_TETrace)
        /\
        reg = (<<[st |-> "absent"], [st |-> "absent"], [st |-> "done", val |-> 0, fence |-> 1]>>)
    )
----

_init ==
    /\ reg = _TETrace[1].reg
----

_next ==
    /\ \E i,j \in DOMAIN _TETrace:
        /\ \/ /\ j = i + 1
              /\ i = TLCGet("level")
        /\ reg  = _TETrace[i].reg
        /\ reg' = _TETrace[j].reg

\* Uncomment the ASSUME below to write the states of the error trace
\* to the given file in Json format. Note that you can pass any tuple
\* to `JsonSerialize`. For example, a sub-sequence of _TETrace.
    \* ASSUME
    \*     LET J == INSTANCE Json
    \*         IN J!JsonSerialize("Replay_TTrace_1786730217.json", _TETrace)

=============================================================================

 Note that you can extract this module `Replay_TEExpression`
  to a dedicated file to reuse `expression` (the module in the 
  dedicated `Replay_TEExpression.tla` file takes precedence 
  over the module `Replay_TEExpression` below).

---- MODULE Replay_TEExpression ----
EXTENDS Sequences, TLCExt, Replay, Toolbox, Naturals, TLC

expression == 
    [
        \* To hide variables of the `Replay` spec from the error trace,
        \* remove the variables below.  The trace will be written in the order
        \* of the fields of this record.
        reg |-> reg
        
        \* Put additional constant-, state-, and action-level expressions here:
        \* ,_stateNumber |-> _TEPosition
        \* ,_regUnchanged |-> reg = reg'
        
        \* Format the `reg` variable as Json value.
        \* ,_regJson |->
        \*     LET J == INSTANCE Json
        \*     IN J!ToJson(reg)
        
        \* Lastly, you may build expressions over arbitrary sets of states by
        \* leveraging the _TETrace operator.  For example, this is how to
        \* count the number of times a spec variable changed up to the current
        \* state in the trace.
        \* ,_regModCount |->
        \*     LET F[s \in DOMAIN _TETrace] ==
        \*         IF s = 1 THEN 0
        \*         ELSE IF _TETrace[s].reg # _TETrace[s-1].reg
        \*             THEN 1 + F[s-1] ELSE F[s-1]
        \*     IN F[_TEPosition - 1]
    ]

=============================================================================



Parsing and semantic processing can take forever if the trace below is long.
 In this case, it is advised to uncomment the module below to deserialize the
 trace from a generated binary file.

\*
\*---- MODULE Replay_TETrace ----
\*EXTENDS IOUtils, Replay, TLC
\*
\*trace == IODeserialize("Replay_TTrace_1786730217.bin", TRUE)
\*
\*=============================================================================
\*

---- MODULE Replay_TETrace ----
EXTENDS Replay, TLC

trace == 
    <<
    ([reg |-> <<[st |-> "absent"], [st |-> "absent"], [st |-> "absent"]>>]),
    ([reg |-> <<[st |-> "absent"], [st |-> "absent"], [st |-> "claim", owner |-> "w1", fence |-> 1]>>]),
    ([reg |-> <<[st |-> "absent"], [st |-> "absent"], [st |-> "done", val |-> 0, fence |-> 1]>>])
    >>
----


=============================================================================

---- CONFIG Replay_TTrace_1786730217 ----
CONSTANTS
    Guard = "faithless"
    MaxFence = 3

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
\* Generated on Fri Aug 14 12:56:58 CDT 2026