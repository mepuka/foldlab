import { foldkit } from "@foldkit/vite-plugin"
import { defineConfig } from "vite"

/**
 * The dev/build host. `@foldkit/vite-plugin` is what makes a hot update
 * preserve the Model instead of restarting the loop, which is the whole
 * reason to run a bundler in front of a foldkit app at all.
 *
 * No proxy is configured. The workbench talks to nothing over the network
 * yet; when Lane C settles the transport, its dev proxy (or its absence)
 * is declared here.
 */
export default defineConfig({
  plugins: [foldkit()],
})
