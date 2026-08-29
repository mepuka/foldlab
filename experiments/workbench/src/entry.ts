/**
 * The runtime boundary — the one module in this package that starts
 * something. Everything it starts is pure until it gets here.
 *
 * `resources` is where the store seam is bound. Swapping `layerUnwired`
 * for a real implementation is the single edit that connects the
 * workbench to a store; nothing else in `src/` names a transport.
 */
import { Runtime } from "foldkit"

import { Model, init, update, view } from "./main.ts"
import { layerUnwired } from "./store/seam.ts"

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById("root"),
  resources: layerUnwired,
})

Runtime.run(application)
