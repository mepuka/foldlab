/** Native Effect Graph representation of the ratified Merkle tree shape. */
import { Data, Effect, Graph, Option, Result } from "effect"
import type { Bytes } from "./merkleChunk.ts"
import type { HP, Pre } from "./merkleTree.ts"

export type Node<A = never> = Data.TaggedEnum<{
  Leaf: { readonly index: number; readonly bytes: Bytes }
  Parent: {}
  Commitment: { readonly value: A }
}>

interface NodeDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: Node<this["A"]>
}

export const Node = Data.taggedEnum<NodeDefinition>()

export type Branch = Data.TaggedEnum<{
  Left: {}
  Right: {}
}>

export const Branch = Data.taggedEnum<Branch>()

export interface Tree<A = never> {
  readonly graph: Graph.DirectedGraph<Node<A>, Branch>
  readonly root: Graph.NodeIndex
}

export interface Opening<A> {
  readonly index: number
  readonly count: number
  readonly leaf: Bytes
  readonly siblings: ReadonlyArray<A>
  readonly root: A
}

export type StreamItem<A> =
  | { readonly _tag: "ParentNode"; readonly left: A; readonly right: A }
  | { readonly _tag: "ChunkNode"; readonly bytes: Bytes }
  | { readonly _tag: "SkipNode" }

export interface Range {
  readonly lo: number
  readonly hi: number
}

export interface GenerateStreamInput<A> {
  readonly P: HP<A>
  readonly range: Range
  readonly base: number
  readonly chunks: ReadonlyArray<Bytes>
}

export class MerkleGraphError extends Data.TaggedError("MerkleGraphError")<{
  readonly node: Graph.NodeIndex
  readonly reason: string
}> {}

interface BuildTreeInput {
  readonly base: number
  readonly offset: number
  readonly count: number
  readonly chunks: ReadonlyArray<Bytes>
}

const buildTree = ({
  base,
  offset,
  count,
  chunks,
}: BuildTreeInput) => <A>(
  graph: Graph.MutableDirectedGraph<Node<A>, Branch>,
): Graph.NodeIndex => {
  if (count === 1) {
    return Graph.addNode(graph, Node.Leaf({
      index: base,
      bytes: chunks.length === 0 ? [] : chunks[offset]!.slice(),
    }))
  }

  const split = pow2Below(count)
  const parent = Graph.addNode(graph, Node.Parent())
  const left = buildTree({ base, offset, count: split, chunks })(graph)
  const right = buildTree({
    base: base + split,
    offset: offset + split,
    count: count - split,
    chunks,
  })(graph)
  Graph.addEdge(graph, parent, left, Branch.Left())
  Graph.addEdge(graph, parent, right, Branch.Right())
  return parent
}

/** Largest power of two strictly below n, returning one below two. */
export const pow2Below = (n: number): number =>
  n <= 2 ? 1 : 2 * pow2Below(Math.floor((n + 1) / 2))

/** Construct the unique ratified tree shape for an ordered chunk sequence. */
export const fromChunks = (
  base: number,
  chunks: ReadonlyArray<Bytes>,
): Tree<never> => {
  const mutable = Graph.beginMutation(Graph.directed<Node<never>, Branch>())
  const root = buildTree({
    base,
    offset: 0,
    count: Math.max(1, chunks.length),
    chunks,
  })(mutable)
  return { graph: Graph.endMutation(mutable), root }
}

const malformed = (node: Graph.NodeIndex, reason: string): Result.Result<never, MerkleGraphError> =>
  Result.fail(new MerkleGraphError({ node, reason }))

type EvaluationStep<A> =
  | {
    readonly _tag: "Leaf"
    readonly node: Graph.NodeIndex
    readonly index: number
    readonly bytes: Bytes
  }
  | {
    readonly _tag: "Parent"
    readonly node: Graph.NodeIndex
    readonly left: Graph.NodeIndex
    readonly right: Graph.NodeIndex
  }
  | {
    readonly _tag: "Commitment"
    readonly node: Graph.NodeIndex
    readonly value: A
  }

const evaluationPlan = <A>(
  tree: Tree<A>,
): Result.Result<ReadonlyArray<EvaluationStep<A>>, MerkleGraphError> => {
  if (!Graph.hasNode(tree.graph, tree.root)) return malformed(tree.root, "root node is missing")
  if (!Graph.isAcyclic(tree.graph)) return malformed(tree.root, "tree must be acyclic")
  const reachable = new Set(Graph.indices(Graph.dfs(tree.graph, { start: [tree.root] })))
  for (const index of Graph.indices(Graph.nodes(tree.graph))) {
    if (!reachable.has(index)) {
      return malformed(index, "tree must not contain unreachable nodes")
    }
    if (index !== tree.root && Graph.incomingEdges(tree.graph, index).length !== 1) {
      return malformed(index, "non-root tree nodes must have exactly one parent")
    }
  }

  const order: Array<EvaluationStep<A>> = []
  const planned = new Set<Graph.NodeIndex>()
  for (const [index, node] of Graph.dfsPostOrder(tree.graph, { start: [tree.root] })) {
    if (node._tag === "Leaf") {
      if (Graph.outgoingEdges(tree.graph, index).length > 0) {
        return malformed(index, "leaf must not have children")
      }
      order.push({ _tag: "Leaf", node: index, index: node.index, bytes: node.bytes })
      planned.add(index)
      continue
    }
    if (node._tag === "Commitment") {
      if (Graph.outgoingEdges(tree.graph, index).length > 0) {
        return malformed(index, "commitment must not have children")
      }
      order.push({ _tag: "Commitment", node: index, value: node.value })
      planned.add(index)
      continue
    }

    const outgoing = Graph.outgoingEdges(tree.graph, index)
    if (outgoing.length !== 2) return malformed(index, "parent must have exactly two children")

    let left: Graph.NodeIndex | undefined
    let right: Graph.NodeIndex | undefined
    for (const edgeIndex of outgoing) {
      const edge = Graph.getEdge(tree.graph, edgeIndex)
      if (Option.isNone(edge)) return malformed(index, "parent edge is missing")
      if (edge.value.data._tag === "Left") left = edge.value.target
      if (edge.value.data._tag === "Right") right = edge.value.target
    }
    if (left === undefined || right === undefined || left === right) {
      return malformed(index, "parent must have one distinct left and right child")
    }
    if (!planned.has(left) || !planned.has(right)) {
      return malformed(index, "child value was not evaluated before its parent")
    }
    order.push({ _tag: "Parent", node: index, left, right })
    planned.add(index)
  }

  return planned.has(tree.root)
    ? Result.succeed(order)
    : malformed(tree.root, "root was not evaluated")
}

const evaluateSteps = <A>(
  steps: ReadonlyArray<EvaluationStep<A>>,
  P: HP<A>,
  values: Map<Graph.NodeIndex, A>,
): Result.Result<Map<Graph.NodeIndex, A>, MerkleGraphError> => {
  for (const step of steps) {
    if (values.has(step.node)) continue
    if (step._tag === "Leaf") {
      values.set(step.node, P.H({ _tag: "Leaf", index: step.index, bytes: step.bytes }))
      continue
    }
    if (step._tag === "Commitment") {
      values.set(step.node, step.value)
      continue
    }
    if (!values.has(step.left) || !values.has(step.right)) {
      return malformed(step.node, "child value was not evaluated before its parent")
    }
    values.set(step.node, P.H({
      _tag: "Parent",
      left: values.get(step.left)!,
      right: values.get(step.right)!,
    }))
  }
  return Result.succeed(values)
}

/** Evaluate a tree children-first. Graph indexes are lookup keys, never hash input. */
export const evaluate = <A>(
  tree: Tree<NoInfer<A>>,
  P: HP<A>,
): Result.Result<A, MerkleGraphError> => {
  const plan = evaluationPlan(tree)
  if (Result.isFailure(plan)) return Result.fail(plan.failure)
  const values = new Map<Graph.NodeIndex, A>()
  const evaluated = evaluateSteps(plan.success, P, values)
  if (Result.isFailure(evaluated)) return Result.fail(evaluated.failure)

  return values.has(tree.root)
    ? Result.succeed(values.get(tree.root)!)
    : malformed(tree.root, "root was not evaluated")
}

/** Evaluate with an effectful digest while retaining typed topology failures. */
export const evaluateEffect = <A, E, R>(
  tree: Tree<NoInfer<A>>,
  H: (preimage: Pre<A>) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E | MerkleGraphError, R> => Effect.gen(function* () {
  const plan = evaluationPlan(tree)
  if (Result.isFailure(plan)) return yield* plan.failure

  const values = new Map<Graph.NodeIndex, A>()
  for (const step of plan.success) {
    if (step._tag === "Leaf") {
      values.set(step.node, yield* H({
        _tag: "Leaf",
        index: step.index,
        bytes: step.bytes,
      }))
      continue
    }
    if (step._tag === "Commitment") {
      values.set(step.node, step.value)
      continue
    }
    if (!values.has(step.left) || !values.has(step.right)) {
      return yield* new MerkleGraphError({
        node: step.node,
        reason: "child value was not evaluated before its parent",
      })
    }
    values.set(step.node, yield* H({
      _tag: "Parent",
      left: values.get(step.left)!,
      right: values.get(step.right)!,
    }))
  }

  if (!values.has(tree.root)) {
    return yield* new MerkleGraphError({
      node: tree.root,
      reason: "root was not evaluated",
    })
  }
  return values.get(tree.root)!
})

const childrenOf = (
  tree: Tree<unknown>,
  node: Graph.NodeIndex,
): Result.Result<readonly [Graph.NodeIndex, Graph.NodeIndex], MerkleGraphError> => {
  const outgoing = Graph.outgoingEdges(tree.graph, node)
  if (outgoing.length !== 2) return malformed(node, "parent must have exactly two children")
  let left: Graph.NodeIndex | undefined
  let right: Graph.NodeIndex | undefined
  for (const edgeIndex of outgoing) {
    const edge = Graph.getEdge(tree.graph, edgeIndex)
    if (Option.isNone(edge)) return malformed(node, "parent edge is missing")
    if (edge.value.data._tag === "Left") left = edge.value.target
    if (edge.value.data._tag === "Right") right = edge.value.target
  }
  return left === undefined || right === undefined || left === right
    ? malformed(node, "parent must have one distinct left and right child")
    : Result.succeed([left, right])
}

const containsLeaf = (
  tree: Tree<unknown>,
  root: Graph.NodeIndex,
  index: number,
): boolean => {
  for (const node of Graph.values(Graph.dfs(tree.graph, { start: [root] }))) {
    if (node._tag === "Leaf" && node.index === index) return true
  }
  return false
}

interface EvaluateSubtreeInput<A> {
  readonly tree: Tree<A>
  readonly root: Graph.NodeIndex
  readonly P: HP<A>
  readonly values?: Map<Graph.NodeIndex, A>
}

const evaluateSubtree = <A>({
  tree,
  root,
  P,
  values = new Map<Graph.NodeIndex, A>(),
}: EvaluateSubtreeInput<A>): Result.Result<A, MerkleGraphError> => {
  const subtree = {
    graph: Graph.inducedSubgraph(
      tree.graph,
      Graph.indices(Graph.dfs(tree.graph, { start: [root] })),
    ),
    root,
  }
  const plan = evaluationPlan(subtree)
  if (Result.isFailure(plan)) return Result.fail(plan.failure)
  const evaluated = evaluateSteps(plan.success, P, values)
  if (Result.isFailure(evaluated)) return Result.fail(evaluated.failure)
  return values.has(root)
    ? Result.succeed(values.get(root)!)
    : malformed(root, "root was not evaluated")
}

/** Return the committed leaf and root-side-first sibling path for one index. */
export const opening = <A>(
  tree: Tree<NoInfer<A>>,
  P: HP<A>,
  index: number,
): Result.Result<Opening<A>, MerkleGraphError> => {
  const plan = evaluationPlan(tree)
  if (Result.isFailure(plan)) return Result.fail(plan.failure)
  const values = new Map<Graph.NodeIndex, A>()
  const evaluated = evaluateSteps(plan.success, P, values)
  if (Result.isFailure(evaluated)) return Result.fail(evaluated.failure)
  if (!values.has(tree.root)) return malformed(tree.root, "root was not evaluated")
  const evaluatedRoot = values.get(tree.root)!

  let count = 0
  for (const node of Graph.values(Graph.dfs(tree.graph, { start: [tree.root] }))) {
    if (node._tag === "Leaf") count += 1
  }

  const siblings: Array<A> = []
  let current = tree.root
  while (true) {
    const currentNode = Graph.getNode(tree.graph, current)
    if (Option.isNone(currentNode)) return malformed(current, "opening node is missing")
    if (currentNode.value._tag === "Leaf") {
      return currentNode.value.index === index
        ? Result.succeed({
          index,
          count,
          leaf: currentNode.value.bytes.slice(),
          siblings,
          root: evaluatedRoot,
        })
        : malformed(current, `tree contains no leaf at index ${index}`)
    }

    const children = childrenOf(tree, current)
    if (Result.isFailure(children)) return Result.fail(children.failure)
    const [left, right] = children.success
    const inLeft = containsLeaf(tree, left, index)
    const inRight = containsLeaf(tree, right, index)
    if (inLeft === inRight) {
      return malformed(current, inLeft
        ? `leaf index ${index} occurs in both branches`
        : `tree contains no leaf at index ${index}`)
    }
    const siblingRoot = inLeft ? right : left
    const sibling = evaluateSubtree({ tree, root: siblingRoot, P, values })
    if (Result.isFailure(sibling)) return Result.fail(sibling.failure)
    siblings.push(sibling.success)
    current = inLeft ? left : right
  }
}

/** Generate the canonical pre-order range stream from native graph topology. */
export const generateStream = <A>({
  P,
  range,
  base,
  chunks,
}: GenerateStreamInput<A>): Result.Result<ReadonlyArray<StreamItem<A>>, MerkleGraphError> => {
  const tree = fromChunks(base, chunks)
  const frames: Array<{
    readonly root: Graph.NodeIndex
    readonly base: number
    readonly count: number
  }> = [{ root: tree.root, base, count: chunks.length }]
  const items: Array<StreamItem<A>> = []
  const values = new Map<Graph.NodeIndex, A>()

  while (frames.length > 0) {
    const frame = frames.pop()!
    if (frame.base + frame.count <= range.lo || range.hi <= frame.base) {
      items.push({ _tag: "SkipNode" })
      continue
    }

    const node = Graph.getNode(tree.graph, frame.root)
    if (Option.isNone(node)) return malformed(frame.root, "stream node is missing")
    if (node.value._tag === "Leaf") {
      items.push({ _tag: "ChunkNode", bytes: node.value.bytes.slice() })
      continue
    }
    if (node.value._tag === "Commitment") {
      return malformed(frame.root, "stream tree must not contain commitments")
    }

    const children = childrenOf(tree, frame.root)
    if (Result.isFailure(children)) return Result.fail(children.failure)
    const [left, right] = children.success
    const leftValue = evaluateSubtree({ tree, root: left, P, values })
    if (Result.isFailure(leftValue)) return Result.fail(leftValue.failure)
    const rightValue = evaluateSubtree({ tree, root: right, P, values })
    if (Result.isFailure(rightValue)) return Result.fail(rightValue.failure)
    items.push({ _tag: "ParentNode", left: leftValue.success, right: rightValue.success })

    const split = pow2Below(frame.count)
    frames.push(
      { root: right, base: frame.base + split, count: frame.count - split },
      { root: left, base: frame.base, count: split },
    )
  }

  return Result.succeed(items)
}

interface InclusionBuild {
  readonly root: Graph.NodeIndex
  readonly nextSibling: number
}

export interface RebuildInclusionInput<A> {
  readonly P: HP<A>
  readonly base: number
  readonly index: number
  readonly count: number
  readonly bytes: Bytes
  readonly siblings: ReadonlyArray<A>
}

interface BuildInclusionInput<A> {
  readonly base: number
  readonly index: number
  readonly count: number
  readonly bytes: Bytes
  readonly siblings: ReadonlyArray<A>
  readonly siblingIndex: number
}

const buildInclusion = <A>({
  base,
  index,
  count,
  bytes,
  siblings,
  siblingIndex,
}: BuildInclusionInput<A>) => (
  graph: Graph.MutableDirectedGraph<Node<A>, Branch>,
): Option.Option<InclusionBuild> => {
  if (siblingIndex === siblings.length) {
    return count <= 1
      ? Option.some({
        root: Graph.addNode(graph, Node.Leaf({ index: base, bytes: bytes.slice() })),
        nextSibling: siblingIndex,
      })
      : Option.none()
  }
  if (count <= 1) return Option.none()

  const split = pow2Below(count)
  const target = index < split
    ? buildInclusion({
      base,
      index,
      count: split,
      bytes,
      siblings,
      siblingIndex: siblingIndex + 1,
    })(graph)
    : buildInclusion({
      base: base + split,
      index: index - split,
      count: count - split,
      bytes,
      siblings,
      siblingIndex: siblingIndex + 1,
    })(graph)
  if (Option.isNone(target)) return Option.none()

  const sibling = Graph.addNode(graph, Node.Commitment({ value: siblings[siblingIndex]! }))
  const parent = Graph.addNode(graph, Node.Parent())
  if (index < split) {
    Graph.addEdge(graph, parent, target.value.root, Branch.Left())
    Graph.addEdge(graph, parent, sibling, Branch.Right())
  } else {
    Graph.addEdge(graph, parent, sibling, Branch.Left())
    Graph.addEdge(graph, parent, target.value.root, Branch.Right())
  }
  return Option.some({ root: parent, nextSibling: target.value.nextSibling })
}

/** Rebuild an opening through an explicit graph of leaves, parents, and commitments. */
export const rebuildInclusion = <A>({
  P,
  base,
  index,
  count,
  bytes,
  siblings,
}: RebuildInclusionInput<A>): Option.Option<A> => {
  const mutable = Graph.beginMutation(Graph.directed<Node<A>, Branch>())
  const built = buildInclusion({
    base,
    index,
    count,
    bytes,
    siblings,
    siblingIndex: 0,
  })(mutable)
  if (Option.isNone(built) || built.value.nextSibling !== siblings.length) return Option.none()
  const evaluated = evaluate({
    graph: Graph.endMutation(mutable),
    root: built.value.root,
  }, P)
  return Result.isSuccess(evaluated) ? Option.some(evaluated.success) : Option.none()
}

interface ConsistencyBuild {
  readonly oldRoot: Graph.NodeIndex
  readonly newRoot: Graph.NodeIndex
  readonly nextProof: number
}

interface AddParentInput {
  readonly left: Graph.NodeIndex
  readonly right: Graph.NodeIndex
}

const addParent = ({ left, right }: AddParentInput) => <A>(
  graph: Graph.MutableDirectedGraph<Node<A>, Branch>,
): Graph.NodeIndex => {
  const parent = Graph.addNode(graph, Node.Parent())
  Graph.addEdge(graph, parent, left, Branch.Left())
  Graph.addEdge(graph, parent, right, Branch.Right())
  return parent
}

export interface RebuildConsistencyInput<A> {
  readonly P: HP<A>
  readonly oldAnchor: A
  readonly oldSize: number
  readonly newSize: number
  readonly anchored: boolean
  readonly proof: ReadonlyArray<A>
}

interface BuildConsistencyInput<A> {
  readonly oldAnchor: A
  readonly oldSize: number
  readonly newSize: number
  readonly anchored: boolean
  readonly proof: ReadonlyArray<A>
  readonly proofIndex: number
}

const buildConsistency = <A>({
  oldAnchor,
  oldSize,
  newSize,
  anchored,
  proof,
  proofIndex,
}: BuildConsistencyInput<A>) => (
  graph: Graph.MutableDirectedGraph<Node<A>, Branch>,
): Option.Option<ConsistencyBuild> => {
  if (newSize <= oldSize) {
    if (anchored && proofIndex === proof.length) {
      const root = Graph.addNode(graph, Node.Commitment({ value: oldAnchor }))
      return Option.some({ oldRoot: root, newRoot: root, nextProof: proofIndex })
    }
    if (!anchored && proof.length - proofIndex === 1) {
      const root = Graph.addNode(graph, Node.Commitment({ value: proof[proofIndex]! }))
      return Option.some({ oldRoot: root, newRoot: root, nextProof: proofIndex + 1 })
    }
    return Option.none()
  }
  if (newSize <= 1 || proofIndex >= proof.length) return Option.none()

  const commitment = Graph.addNode(graph, Node.Commitment({ value: proof[proofIndex]! }))
  const split = pow2Below(newSize)
  if (oldSize <= split) {
    const rebuilt = buildConsistency({
      oldAnchor,
      oldSize,
      newSize: split,
      anchored,
      proof,
      proofIndex: proofIndex + 1,
    })(graph)
    return Option.map(rebuilt, (roots) => ({
      oldRoot: roots.oldRoot,
      newRoot: addParent({ left: roots.newRoot, right: commitment })(graph),
      nextProof: roots.nextProof,
    }))
  }

  const rebuilt = buildConsistency({
    oldAnchor,
    oldSize: oldSize - split,
    newSize: newSize - split,
    anchored: false,
    proof,
    proofIndex: proofIndex + 1,
  })(graph)
  return Option.map(rebuilt, (roots) => ({
    oldRoot: addParent({ left: commitment, right: roots.oldRoot })(graph),
    newRoot: addParent({ left: commitment, right: roots.newRoot })(graph),
    nextProof: roots.nextProof,
  }))
}

/** Rebuild old and new consistency roots as two views over one proof graph. */
export const rebuildConsistency = <A>({
  P,
  oldAnchor,
  oldSize,
  newSize,
  anchored,
  proof,
}: RebuildConsistencyInput<A>): Option.Option<readonly [oldRoot: A, newRoot: A]> => {
  const mutable = Graph.beginMutation(Graph.directed<Node<A>, Branch>())
  const built = buildConsistency({
    oldAnchor,
    oldSize,
    newSize,
    anchored,
    proof,
    proofIndex: 0,
  })(mutable)
  if (Option.isNone(built) || built.value.nextProof !== proof.length) return Option.none()
  const graph = Graph.endMutation(mutable)
  const tree = { graph, root: built.value.newRoot }
  const evaluateRoot = (root: Graph.NodeIndex) => evaluateSubtree({ tree, root, P })
  const oldRoot = evaluateRoot(built.value.oldRoot)
  if (Result.isFailure(oldRoot)) return Option.none()
  const newRoot = evaluateRoot(built.value.newRoot)
  if (Result.isFailure(newRoot)) return Option.none()
  const pair: readonly [oldRoot: A, newRoot: A] = [oldRoot.success, newRoot.success]
  return Option.some(pair)
}
