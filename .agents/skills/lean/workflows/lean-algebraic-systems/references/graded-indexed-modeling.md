# Graded and indexed modeling

Choose indices and grades by the theorem they must support, not by terminology.

## Distinguish the shapes

| Shape                                        | Meaning                                                                 | Core obligations                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Atkey/pre-post indexed computation `M i j α` | computation starts in abstract state `i` and ends in `j`                | indexed identity/bind laws and transition preservation                               |
| Dependent-response free syntax               | an operation's response determines the next index and continuation type | constructor typing, dependent bind, interpreter preservation                         |
| Graded computation `M g α`                   | `g` classifies or summarizes the computation                            | grade unit/composition laws and soundness of each constructor/interpreter            |
| Indexed and graded computation               | protocol phase and effect/resource summary are both relevant            | keep the two carriers and their laws distinct; define any interaction law explicitly |

## Design a grade

Record:

1. carrier and interpretation—exact semantic effect, upper bound, lower bound, or approximation;
2. unit and sequential composition;
3. choice and parallel composition when present; these need not equal sequential composition;
4. preorder and subeffecting/weakening rule when one grade may safely approximate another;
5. grade assigned to every primitive operation;
6. preservation or monotonicity for bind, handlers, interpreters, and optimizations;
7. what the grade deliberately cannot establish about runtime scheduling, external services, or
   measured resources.

Use products or maps of grade algebras when quantities compose differently. Do not force latency,
memory, permissions, probability, and protocol state into one monoid. A grade is not necessarily an
approximation: state explicitly whether it is exact, a bound, or an abstraction.

PolyFun illustrates distinct indexed-monad and dependent-response free-family shapes at a reviewed
revision ([indexed monad](https://github.com/Verified-zkEVM/PolyFun/blob/f60bb39a85e8f3243ee70a3775d124112a599fa1/PolyFun/Control/Monad/Indexed.lean),
[free family](https://github.com/Verified-zkEVM/PolyFun/blob/f60bb39a85e8f3243ee70a3775d124112a599fa1/PolyFun/IPFunctor/Free/Family.lean)).
