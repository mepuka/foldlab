-- HAND-WRITTEN: expectations transcribed from inventory.json; src/generate.ts must leave this file unchanged.
import EntityStoreGenerate.Inventory

namespace EntityStoreGenerate

example : tagOf .tag_Any = "Any" := rfl
example : tagOf .tag_Null = "Null" := rfl
example : tagOf .tag_Union = "Union" := rfl

end EntityStoreGenerate
