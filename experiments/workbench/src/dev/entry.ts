/**
 * DEV-ONLY — the fixture viewer's DOM half. NOT the contracted app,
 * and deliberately NOT foldkit: plain `createElementNS` over the
 * engine's `place()` output, so nothing here can be mistaken for the
 * S3b deliverable (whose view is foldkit vdom under contract law
 * L-V1..L-V5). Breaker-built harness territory; see
 * `src/dev/fixture-view.ts` for the freshness rules.
 *
 * Ambient reads (devicePixelRatio, matchMedia) are ALLOWED here — this
 * is dev tooling outside `src/trunk`, which is where L-P8/L-B11 draw
 * the purity line.
 */
import { devScene, isResidue, tintOf, type DevScene } from "./fixture-view.ts"

const SVG_NS = "http://www.w3.org/2000/svg"

const classOf = (tint: number, residue: boolean): string => {
  if (residue) return tint >= 0 ? "mark owed" : "strip owed"
  return tint >= 0 ? `mark tint-${String(tint)}` : "strip"
}

const bannerOf = (): HTMLElement => {
  const banner = document.createElement("p")
  banner.className = "dev-banner"
  banner.textContent =
    "DEV FIXTURE VIEWER — engine witness over the recorded fixture; not the app, not a store"
  return banner
}

const faceOf = (scene: DevScene): HTMLElement => {
  const face = document.createElement("p")
  face.className = "dev-face"
  face.textContent = scene.face
  const owedSpan = document.createElement("span")
  owedSpan.className = scene.unregisteredCount > 0 ? "owed-count" : ""
  owedSpan.textContent = ` · ${String(scene.unregisteredCount)} unregistered`
  face.append(owedSpan)
  return face
}

const canvasOf = (scene: DevScene): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("width", String(scene.viewport.widthCss))
  svg.setAttribute("height", String(scene.viewport.heightCss))
  const camera = document.createElementNS(SVG_NS, "g")
  camera.setAttribute("transform", `scale(${String(1 / scene.dpr)})`)
  for (const rect of scene.rects) {
    const node = document.createElementNS(SVG_NS, "rect")
    node.setAttribute("x", String(rect.x))
    node.setAttribute("y", String(rect.y))
    node.setAttribute("width", String(rect.w))
    node.setAttribute("height", String(rect.h))
    node.setAttribute("class", classOf(tintOf(rect), isResidue(rect)))
    camera.append(node)
  }
  svg.append(camera)
  return svg
}

const footOf = (scene: DevScene): HTMLElement => {
  const foot = document.createElement("div")
  foot.className = "dev-foot"
  for (const label of scene.labels) {
    const span = document.createElement("span")
    span.className = "dev-label"
    span.style.left = `${String(label.xCss)}px`
    span.textContent = label.name
    foot.append(span)
  }
  return foot
}

const render = (root: HTMLElement): void => {
  const dpr = window.devicePixelRatio
  const scene = devScene(dpr)
  const frame = document.createElement("div")
  frame.className = "dev-frame"
  frame.append(canvasOf(scene), footOf(scene))
  root.replaceChildren(bannerOf(), faceOf(scene), frame)
  // Re-render when the device pixel ratio changes (zoom, display
  // move): the dpr is an epoch terminator; the whole scene recomputes.
  matchMedia(`(resolution: ${String(dpr)}dppx)`).addEventListener(
    "change",
    () => {
      render(root)
    },
    { once: true },
  )
}

const root = document.querySelector<HTMLElement>("#dev-root")
if (root === null) throw new Error("dev/index.html did not provide #dev-root")
render(root)
