---- MODULE Pipeline_TTrace_1786725524 ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, Pipeline

_expression ==
    LET Pipeline_TEExpression == INSTANCE Pipeline_TEExpression
    IN Pipeline_TEExpression!expression
----

_trace ==
    LET Pipeline_TETrace == INSTANCE Pipeline_TETrace
    IN Pipeline_TETrace!trace
----

_inv ==
    ~(
        TLCGet("level") = Len(_TETrace)
        /\
        phase = ([o1 |-> "facted", o2 |-> "start"])
        /\
        journal = (<<[op |-> "o1", kind |-> "fact"]>>)
        /\
        lock = ("o1")
        /\
        reply = ([o1 |-> [seq |-> 0, head |-> 0], o2 |-> [seq |-> 0, head |-> 0]])
    )
----

_init ==
    /\ lock = _TETrace[1].lock
    /\ journal = _TETrace[1].journal
    /\ reply = _TETrace[1].reply
    /\ phase = _TETrace[1].phase
----

_next ==
    /\ \E i,j \in DOMAIN _TETrace:
        /\ \/ /\ j = i + 1
              /\ i = TLCGet("level")
        /\ lock  = _TETrace[i].lock
        /\ lock' = _TETrace[j].lock
        /\ journal  = _TETrace[i].journal
        /\ journal' = _TETrace[j].journal
        /\ reply  = _TETrace[i].reply
        /\ reply' = _TETrace[j].reply
        /\ phase  = _TETrace[i].phase
        /\ phase' = _TETrace[j].phase

\* Uncomment the ASSUME below to write the states of the error trace
\* to the given file in Json format. Note that you can pass any tuple
\* to `JsonSerialize`. For example, a sub-sequence of _TETrace.
    \* ASSUME
    \*     LET J == INSTANCE Json
    \*         IN J!JsonSerialize("Pipeline_TTrace_1786725524.json", _TETrace)

=============================================================================

 Note that you can extract this module `Pipeline_TEExpression`
  to a dedicated file to reuse `expression` (the module in the 
  dedicated `Pipeline_TEExpression.tla` file takes precedence 
  over the module `Pipeline_TEExpression` below).

---- MODULE Pipeline_TEExpression ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, Pipeline

expression == 
    [
        \* To hide variables of the `Pipeline` spec from the error trace,
        \* remove the variables below.  The trace will be written in the order
        \* of the fields of this record.
        lock |-> lock
        ,journal |-> journal
        ,reply |-> reply
        ,phase |-> phase
        
        \* Put additional constant-, state-, and action-level expressions here:
        \* ,_stateNumber |-> _TEPosition
        \* ,_lockUnchanged |-> lock = lock'
        
        \* Format the `lock` variable as Json value.
        \* ,_lockJson |->
        \*     LET J == INSTANCE Json
        \*     IN J!ToJson(lock)
        
        \* Lastly, you may build expressions over arbitrary sets of states by
        \* leveraging the _TETrace operator.  For example, this is how to
        \* count the number of times a spec variable changed up to the current
        \* state in the trace.
        \* ,_lockModCount |->
        \*     LET F[s \in DOMAIN _TETrace] ==
        \*         IF s = 1 THEN 0
        \*         ELSE IF _TETrace[s].lock # _TETrace[s-1].lock
        \*             THEN 1 + F[s-1] ELSE F[s-1]
        \*     IN F[_TEPosition - 1]
    ]

=============================================================================



Parsing and semantic processing can take forever if the trace below is long.
 In this case, it is advised to uncomment the module below to deserialize the
 trace from a generated binary file.

\*
\*---- MODULE Pipeline_TETrace ----
\*EXTENDS IOUtils, TLC, Pipeline
\*
\*trace == IODeserialize("Pipeline_TTrace_1786725524.bin", TRUE)
\*
\*=============================================================================
\*

---- MODULE Pipeline_TETrace ----
EXTENDS TLC, Pipeline

trace == 
    <<
    ([phase |-> [o1 |-> "start", o2 |-> "start"],journal |-> <<>>,lock |-> "none",reply |-> [o1 |-> [seq |-> 0, head |-> 0], o2 |-> [seq |-> 0, head |-> 0]]]),
    ([phase |-> [o1 |-> "certified", o2 |-> "start"],journal |-> <<>>,lock |-> "none",reply |-> [o1 |-> [seq |-> 0, head |-> 0], o2 |-> [seq |-> 0, head |-> 0]]]),
    ([phase |-> [o1 |-> "facted", o2 |-> "start"],journal |-> <<[op |-> "o1", kind |-> "fact"]>>,lock |-> "o1",reply |-> [o1 |-> [seq |-> 0, head |-> 0], o2 |-> [seq |-> 0, head |-> 0]]])
    >>
----


=============================================================================

---- CONFIG Pipeline_TTrace_1786725524 ----
CONSTANTS
    Rule = "snapshot"

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
\* Generated on Fri Aug 14 11:38:44 CDT 2026