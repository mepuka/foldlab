------------------------- MODULE JournalCatalogBroken -------------------------
(***************************************************************************)
(* The faithless refinement: create without the resolve-check.  TLC must   *)
(* refute CatalogRefinement — the bridge into the catalog model has to be  *)
(* able to fail, or the honest bridge's clean closure says nothing.        *)
(***************************************************************************)
EXTENDS JournalCatalog
================================================================================
