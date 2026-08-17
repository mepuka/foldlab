// Exact installed @nats-io/nats-core 3.4.0 parser probe.
//
// Run from any directory:
//
//   node docs/research/reference/dev716-credential-binding/url-auth-probe.mjs
import { parseOptions } from "../../../../packages/plait/node_modules/@nats-io/nats-core/lib/options.js"
import { hostPort } from "../../../../packages/plait/node_modules/@nats-io/nats-core/lib/servers.js"

const server = "nats://application:application@127.0.0.1:4222"
const address = hostPort(server)
const options = parseOptions({ servers: server })
const auth = await options.authenticator()

console.log(JSON.stringify({ server, address, auth: auth ?? null }))
