# Domain contract

Before Lean declarations, answer:

- What are the public objects and observations?
- Which distinctions are semantic, representational, or irrelevant up to an equivalence?
- Which operations are total, partial, nondeterministic, concurrent, or external?
- What must be executable, serialized, generated, or monitored?
- Which facts are local invariants, global trace properties, resource bounds, or assumptions?
- What positive witness should exist? What invalid example must fail? What overclaim should fail?
- What implementation or real-world behavior must eventually be related to the model?

Record a vocabulary table, examples, assumptions, and observables. A theorem type is ready to
freeze only when a reviewer can explain what would falsify its intended meaning.

Project-scale LLM formalization systems likewise separate declaration planning from proof filling;
AutoformBot uses one-statement tasks in a dependency DAG with compile/review gates
([pipeline](https://github.com/facebookresearch/autoform-bot/blob/da4fb7c5395aa2875d7f710369c194c3b38ec905/docs/pipeline/bot.md)).
