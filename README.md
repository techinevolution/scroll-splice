# ScrollForge

ScrollForge is a desktop-oriented vertical comic builder. It combines a large editing canvas, a full-episode minimap, Photoshop-style layers, a collapsible asset library, and direct drag-and-drop editing so creators can assemble and refine scroll-native comic episodes visually.

Root & Table is the first story project and proving ground for the editor.

## Status

Build Week planning is approved and the stack is locked; no application code exists yet. The July 21 target is a clear local editor prototype demonstrating the canvas, synchronized minimap, layers, shared episode model, and selection with Root & Table as the proof episode.

## Quick Start

The approved stack is React 19, strict TypeScript, Vite 8, React-Konva/Konva, Zustand, and plain CSS on Node.js 22 with pnpm 10.

The command contracts below will become runnable after the approved July 13 scaffold is implemented:

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test:e2e
```

These commands are not yet verified because documentation approval does not authorize application scaffolding.

## Main Workflows

- Create or open a local comic project and episode.
- Drag images from the asset library onto the vertical canvas.
- Select, move, resize, and reorder elements and panels.
- Navigate a long episode through a synchronized minimap.
- Select and reorder elements through the layers panel.
- Preview and export a finished vertical comic strip.

## Project Docs

- [Project Outline](PROJECT_OUTLINE.md)
- [Plan](PLAN.md)
- [Architecture](ARCHITECTURE.md)
- [Agent Guide](AGENTS.md)
- [Decisions](DECISIONS.md)
- [TODO](TODO.md)
