# Effect v4 module surface keyword catalog

## Stable

- execution: Effect, Effectable, Exit, Cause, Fiber, Runtime, ManagedRuntime, Scope, Scheduler, ExecutionPlan
- services-wiring: Context, Layer, LayerMap, LayerRef, References
- configuration: Config, ConfigProvider, Redacted, Redactable
- errors-diagnostics: Cause, Exit, Result, PlatformError, ErrorReporter, Formatter, Inspectable
- concurrency: Fiber, FiberSet, FiberMap, FiberHandle, Deferred, Latch, Semaphore, PartitionedSemaphore, Ref, SynchronizedRef
- time-scheduling: Clock, Duration, DateTime, Cron, Schedule, Random
- streams-channels: Stream, Channel, ChannelSchema, Pull, Take, Sink, Combiner, Reducer
- messaging: Queue, PubSub, SubscriptionRef
- caching-batching: Cache, ScopedCache, Request, RequestResolver, Pool, Resource, RcRef, RcMap
- collections: Array, Chunk, Iterable, NonEmptyIterable, Record, Struct, Tuple, HashMap, HashSet, Trie, Graph
- mutable-collections: MutableHashMap, MutableHashSet, MutableList, MutableRef
- transactional-memory: TxRef, TxDeferred, TxQueue, TxPubSub, TxHashMap, TxHashSet, TxSemaphore, TxReentrantLock, TxSubscriptionRef, TxChunk, TxPriorityQueue
- data-algebra: Data, Option, Result, Match, Equal, Equivalence, Hash, Order, Ordering, Differ, Optic
- functions-types: Function, Pipeable, Predicate, Filter, HKT, Types, Unify, Newtype, Brand
- scalar-math: Number, BigInt, BigDecimal, Boolean
- text-binary: String, RegExp, Encoding, Symbol
- platform-io: FileSystem, Path, Stdio, Terminal, Console, Crypto
- identity-sharding: PrimaryKey, HashRing
- json-operations: JsonSchema, JsonPointer, JsonPatch
- observability: Logger, LogLevel, Metric, Tracer
- testing: FastCheck, TestSchema, TestClock, TestConsole

## Unstable

- ai: LanguageModel, EmbeddingModel, Chat, Prompt, Response, Tool, Toolkit, structured-output, tokenizer, telemetry, MCP
- cli: Command, Argument, Flag, Param, Primitive, Prompt, HelpDoc, Completions
- cluster: Entity, Singleton, Sharding, Runner, ClusterCron, MessageStorage, SqlMessageStorage, Kubernetes
- devtools: DevTools, DevToolsClient, DevToolsServer, DevToolsSchema
- encoding-formats: Ini, Toml, Yaml, Msgpack, Ndjson, Sse, SchemaBinary
- event-log: Event, EventGroup, EventJournal, EventLog, replication, encryption, SQL
- http: HttpClient, HttpServer, HttpRouter, HttpMiddleware, request, response, body, headers, cookies, multipart, URL
- http-api: HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiBuilder, HttpApiClient, security, middleware, OpenApi, Swagger
- telemetry-export: Otlp, OtlpTracer, OtlpMetrics, OtlpLogger, PrometheusMetrics
- persistence: Persistence, KeyValueStore, Persistable, PersistedCache, PersistedQueue, Redis, RateLimiter
- process: ChildProcess, ChildProcessSpawner, NodeChildProcessSpawner, BunChildProcessSpawner, DenoChildProcessSpawner
- reactivity: Atom, AtomRef, AtomRegistry, AsyncResult, Hydration, Reactivity
- rpc: Rpc, RpcGroup, RpcClient, RpcServer, RpcMiddleware, RpcSerialization, RpcWorker, RpcTest
- schema-models: Model, VariantSchema
- sockets: Socket, SocketServer, websocket, TCP, Unix
- sql: SqlClient, SqlConnection, SqlSchema, SqlResolver, SqlModel, SqlStream, Statement, Migrator
- workers: Worker, WorkerRunner, WorkerError, Transferable
- workflows: Workflow, WorkflowEngine, Activity, DurableClock, DurableDeferred, DurableQueue, WorkflowProxy

## Schema JSON slice

- Schema: domain-models, codecs, validation, decoding, encoding, derivation
- SchemaAST: runtime-algebra, nodes, inspection, invariants
- SchemaParser: decode, encode, effect, result, option, exit
- SchemaIssue: parse-errors, paths, formatting
- SchemaGetter: one-way-conversion, pure, effectful
- SchemaTransformation: bidirectional-conversion, middleware
- SchemaRepresentation: documents, revivers, persistence, code-generation
- JsonSchema: draft-2020-12, draft-07, definitions, conversion
- StandardSchema: interoperability, validation-interface
- JsonPointer: RFC6901, paths, lookup
- JsonPatch: RFC6902, diff, patch
- Equivalence: schema-derived-equality
- FastCheck: arbitrary, generators, shrinking
- TestSchema: schema-laws, generation, roundtrip
