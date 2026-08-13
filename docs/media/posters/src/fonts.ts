// Fonts are vendored under public/fonts so a render never depends on the
// network. Loaded once at module scope; the render waits on the handle.
import { continueRender, delayRender, staticFile } from "remotion";

const handle = delayRender("loading vendored fonts");

const display = new FontFace(
  "Space Grotesk",
  `url(${staticFile("fonts/SpaceGrotesk-700-latin.woff2")}) format("woff2")`,
  { weight: "700", style: "normal" },
);

const mono = new FontFace(
  "JetBrains Mono",
  `url(${staticFile("fonts/JetBrainsMono-latin.woff2")}) format("woff2")`,
  { weight: "100 800", style: "normal" },
);

Promise.all([display.load(), mono.load()])
  .then((faces) => {
    for (const face of faces) {
      document.fonts.add(face);
    }
  })
  .catch((err) => {
    // A missing font must not wedge the render; the preview check catches it.
    // eslint-disable-next-line no-console
    console.error("font load failed", err);
  })
  .finally(() => continueRender(handle));

export {};
