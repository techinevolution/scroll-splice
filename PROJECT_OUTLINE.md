# ScrollSplice Project Outline

## Goal

Build a visual editor specifically for creating long, vertically scrolling comic episodes. ScrollSplice should make arranging a Webtoon-style episode feel direct and understandable: creators work on a large canvas, see the whole episode in a minimap, manage overlapping elements through layers, and drag reusable images into place.

## Intended End State

ScrollSplice becomes a focused comic-production workspace rather than a general image editor. A creator can assemble an episode from panels, characters, backgrounds, effects, and text; control pacing through spacing and scale; navigate the full strip without losing context; and export a publishable vertical result.

After that complete human workflow is dependable, an optional OpenAI-powered creation mode can take a story brief, inspect the project and current episode geometry through explicit tools, generate or edit the needed images, and compose a complete scroll using the same asset and document-command system as the manual editor. The human workflow remains first-class and does not require model access.

The editor should feel tactile. Most common actions happen directly on the canvas or through drag and drop, while the layers and asset panels provide precise organization when the canvas becomes complex.

Root & Table is the first real story used to test whether the tool supports an expressive episode from beginning to end.

## Audience

- Primary: Katherine, creating and refining Root & Table episodes.
- Later: visual storytellers who want a simpler, scroll-native alternative to adapting general design software.

## Milestones

### Build Week MVP

The July 21 submission is a small but complete working editor experience, not the full product. It uses a fixed-width original sample episode rendered from code-defined shapes and text to deliver:

- a viewport-sized vertical editing canvas
- a lightweight full-episode minimap with synchronized navigation
- a layers list synchronized with canvas selection
- one meaningful document edit: moving the selected element
- a reset action that restores the known demonstration state
- reliable public judge access and a clear demonstration

Import, save/reopen, undo, resize, layer or panel reordering, production export, OpenAI model access, autonomous generation, OAuth, and cloud services are outside the required milestone. A narrow autonomous-generation proof is stretch work only after the complete human-operated judge experience and submission path are stable.

### Creator-ready MVP

The creator-ready MVP completes the workflow described below: import original assets, arrange and refine an episode, save safely, undo meaningful changes, preview the reader experience, and export files validated against a selected platform profile.

### Autonomous creation milestone

After the creator-ready human workflow, ScrollSplice can add an autonomous creation mode that:

- accepts a story brief, visual direction, approved references, and episode constraints
- reads a safe normalized project summary, episode document, canvas region, selection, and asset catalog through explicit tools
- generates and edits images through an OpenAI image-generation boundary
- imports generated results as ordinary assets with provenance metadata
- places and revises elements through the same tested document commands used by direct manipulation
- checks the whole scroll for pacing, gaps, overlaps, continuity, and export readiness
- leaves the creator able to stop, review, replace, move, or remove any generated result

The full autonomous mode is not required for Build Week. A single synthetic generate-and-place proof may be attempted only as gated stretch work.

## Core Workflows

### Assemble an episode

1. Open an episode.
2. Give the episode an editable name and choose its base background treatment.
3. Import images into the asset library.
4. Drag an asset onto the canvas to create an element.
5. Position and resize it within the vertical composition.
6. Add more panels or elements as the episode grows downward.

### Navigate a long scroll

1. The minimap shows the full episode in the upper-right panel.
2. A viewport box shows which part is visible in the main canvas.
3. Dragging the viewport box pans the main canvas.
4. Scrolling or panning the main canvas updates the viewport box.

### Organize the composition

1. Select an element on the canvas or in the layers panel.
2. The same element becomes selected in both places.
3. Drag layers to change their stacking order.
4. Drag panel groups to change their vertical episode order.

### Refine and export

1. Preview the episode as a reader would scroll it.
2. Correct spacing, ordering, crops, and overlaps.
3. Export a tall master and an ordered set of platform-sized slices after validating the selected export profile.

### Create an episode with the future autonomous mode

1. Choose a project and provide a story brief, visual direction, and only the references approved for model use.
2. Let the creation agent inspect normalized episode geometry and asset metadata rather than UI framework internals.
3. Generate or edit the required images and add each result to the asset library with provenance.
4. Place and revise those assets through normal editor commands while evaluating the complete scroll.
5. Review the result in the same canvas, layers, minimap, and reader preview used for manual work.
6. Continue manually, ask for another autonomous pass, or export through the normal validated pipeline.

## Creator-ready MVP Components

### 1. App workspace

- Large main editing canvas on the left.
- Right sidebar with minimap above the layers panel.
- Collapsible asset panel, initially placed along the bottom or left edge based on the most usable MVP layout.
- Clear controls for project, episode, import, preview, save, and export.
- Editable episode names and a **File > New Episode** command.
- A familiar File, Edit, View, Window, and Help command structure. A browser build may present these as an in-app menu bar; native macOS and Windows menu integration belongs with later desktop packaging.

### 2. Vertical editing canvas

- A tall episode surface inside a pannable and zoomable workspace.
- Selection, move, resize, and delete for placed elements.
- Visible selection outline with corner handles for direct resizing.
- Optional snapping and alignment guides, controlled by a clearly visible magnet toggle.
- A composable background stack that can use a solid RGB color, an uploaded background image, and an optional decorative edge treatment together.
- Preserve alpha transparency in imported and placed images rather than flattening them onto white.
- Let the creator extend the episode and its background downward as the story grows, without imposing an arbitrary fixed-height project limit. The exact add-space control remains an interaction-design choice.
- Panel groups that can be reordered vertically by dragging.
- Drop targets and insertion feedback while dragging.
- Canvas scrolling that remains synchronized with the minimap.

### 3. Minimap preview

- Scaled view of the complete episode.
- Viewport box representing the visible main-canvas region.
- Drag the viewport box to pan the main canvas.
- Click a minimap location to jump there.
- Update after element movement, panel reorder, episode resize, zoom, or viewport change.

### 4. Layers panel

- List every placed element in visual stacking order.
- Select a layer to select its canvas element, and vice versa.
- Drag layers to reorder stacking.
- Basic names and type icons so similar elements can be distinguished.
- Show/hide and lock controls are desirable but may follow after selection and ordering work.

### 5. Asset panel

- Import local images into the current project.
- Show image thumbnails and names.
- Collapse the panel to preserve canvas space.
- Drag an asset onto the canvas to create an independently editable instance.
- Reusing an asset must not duplicate the original source file unnecessarily.
- Include a free starter set of resizable comic speech balloons and let creators add their own reusable balloon or decorative assets.
- Research common speech-balloon forms and their storytelling conventions before choosing the starter set; do not present stylistic conventions as universal rules.
- Test whether **Assets**, **Uploads**, or a split library/upload label is clearest once both built-in and creator-provided items exist.

### 6. Drag-and-drop interaction system

- One consistent interaction language across the app.
- Drag assets onto the canvas.
- Drag canvas elements to reposition them.
- Drag layer rows to change stacking.
- Drag panel groups to change episode order.
- Provide clear previews, valid drop zones, and cancellation behavior.
- Keep different drag types distinct so one action cannot accidentally trigger another.

### 7. Local project state

- One local project containing assets and one or more episode documents.
- Episode data records canvas dimensions, panels, elements, transforms, and ordering.
- Episode names are editable and remain associated with the correct saved document.
- Save and reopen without losing layout.
- Keep imported source assets separate from placed element instances.

### 8. Preview and export

- Reader preview without editor chrome.
- Export a tall PNG or JPG master and zero-padded ordered platform slices.
- Validate dimensions, file size, image count, format, and other profile limits before writing the final package.
- Report export failures clearly and do not overwrite source assets.

## Future Autonomous Creation Components

These components follow the creator-ready human workflow and are not Build Week must-haves:

### 1. Project context tools

- Read the current project summary, episode document, viewport, selection, and asset metadata.
- Inspect a requested canvas region through logical coordinates and an intentionally prepared preview.
- Never expose mutable React, Konva, Zustand, filesystem, or credential objects to the model.

### 2. Image generation and editing

- Generate new comic images from approved briefs and references.
- Edit or iterate on generated and creator-approved images.
- Return ordinary asset candidates with prompt, provider/model, timestamp, and source-reference provenance.

### 3. Editor action tools

- Add a generated asset authorized by the current run's tool policy to the project.
- Place, move, resize, order, or remove elements through the same command layer used by humans.
- Validate geometry and export readiness without bypassing the episode model.

### 4. Skills and optional external connectors

- Versioned instruction packs can guide episode planning, visual continuity, panel composition, scroll pacing, and export preflight.
- External connectors may later bring in creator-approved material from supported services, but they are not needed to inspect ScrollSplice itself.
- No connector may imply direct WEBTOON publishing, and each connection requires separate authorization and privacy review.

## UX Expectations

- The canvas remains the visual center of gravity.
- Minimap navigation should feel immediate, with no confusing jump between the viewport box and main canvas.
- Selection must stay synchronized across canvas and layers.
- Dragging must always show what will happen before the user drops.
- The asset panel should be available without permanently shrinking the working area.
- Empty states should teach the first action: import an image or create a panel.
- Background color, background imagery, and optional decoration should remain independently editable while composing into one continuous reader view.
- Transparent areas should preview accurately against the current background treatment.
- Snapping must be optional, easy to toggle, and clear about which center, edge, or nearby element is being matched.
- Long episodes must remain usable; off-screen content should not make basic editing sluggish.
- The manual editor must remain complete and understandable when OpenAI features are disconnected or unavailable.
- Autonomous work must show progress, allow cancellation, make generated assets distinguishable, and preserve a clear path back to manual editing.

## Examples of Success

- A creator imports six images, drags them into a vertical episode, reorders two panels, adjusts their spacing, and exports the strip without reading instructions.
- A creator combines a chosen background color with a transparent uploaded background and optional edge decoration, then extends the episode as new story beats are added.
- A creator adds a starter speech balloon, resizes it with corner handles, and replaces or supplements the starter library with a personal reusable balloon asset.
- Dragging the minimap viewport moves the main canvas to the matching portion of the episode.
- Selecting an image on the canvas highlights its layer; moving that layer changes the visible stacking immediately.
- Closing and reopening the project restores the same asset list and episode layout.
- In the later autonomous mode, a creator supplies a short episode brief and approved references; ScrollSplice generates the needed assets, arranges a coherent first-pass scroll, and leaves every result editable in the ordinary canvas and layers.

## Non-Goals for the Build Week MVP

- A full Photoshop replacement.
- Built-in painting, advanced photo manipulation, or complex vector drawing.
- Requiring AI image generation or an embedded creative agent for the human-operated submission.
- Real-time collaboration or cloud accounts.
- Mobile editing.
- Multi-user permissions, publishing, or direct WEBTOON upload.
- Advanced text balloons, effects, animation, or version history.

## Non-Negotiable Boundaries

- Work locally by default; do not upload comic assets to external services without explicit approval.
- Before an OpenAI generation run, make it clear which brief, images, and project context will leave the local app; do not send private creative material without explicit approval.
- Imported source files must never be destructively edited.
- Root & Table art and personal creative material must not be committed to the repository without explicit approval; use synthetic fixtures in tests.
- The minimap, main canvas, and layers panel must share one authoritative episode state rather than drifting into separate representations.
- Drag-and-drop behavior must be reversible through undo before the creator-ready MVP is considered production-safe, though undo may follow the Build Week MVP.
- Platform constraints belong in versioned, data-driven export profiles rather than scattered constants in the editor core.
- WEBTOON publishing remains a manual website workflow. Do not automate login, upload, or publishing unless an official supported integration is discovered and Katherine explicitly approves it.
- Human and autonomous edits must share the same authoritative document, coordinate system, asset records, and command layer; the model must not manipulate React, Konva, or Zustand state directly.
