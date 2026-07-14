# ScrollSplice Project Outline

## Goal

Build a visual editor specifically for creating long, vertically scrolling comic episodes. ScrollSplice should make arranging a Webtoon-style episode feel direct and understandable: creators work on a large canvas, see the whole episode in a minimap, manage overlapping elements through layers, and drag reusable images into place.

## Intended End State

ScrollSplice becomes a focused comic-production workspace rather than a general image editor. A creator can assemble an episode from panels, characters, backgrounds, effects, and text; control pacing through spacing and scale; navigate the full strip without losing context; and export a publishable vertical result.

After that complete human workflow is dependable, an optional OpenAI-powered creation mode can take a story brief, inspect the project and current episode geometry through explicit tools, generate or edit the needed images, and compose a complete scroll using the same asset and document-command system as the manual editor. The human workflow remains first-class and does not require model access.

The editor should feel tactile. Most common actions happen directly on the canvas or through drag and drop, while the Layers panel and Asset Library provide precise organization when the canvas becomes complex.

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
2. Give the episode an editable name and choose the full-scroll base color stored in Background plane 1.
3. Import images into the Asset Library.
4. Choose a composition group and numbered layer plane, then drag an asset onto the canvas to create an element there.
5. Position and resize it within the vertical composition.
6. Add more panels, effects, color regions, or elements as the episode grows downward.

### Navigate a long scroll

1. The minimap shows the full episode in the upper-right panel.
2. A viewport box shows which part is visible in the main canvas.
3. Dragging the viewport box pans the main canvas.
4. Scrolling or panning the main canvas updates the viewport box.

### Organize the composition

1. Select an element on the canvas or in the layers panel.
2. The same element becomes selected in both places, and its composition group and numbered layer plane become active.
3. Use the fixed **Background**, **Content**, and **Foreground** controls above the story canvas to choose the full-scroll group shown in the right panel.
4. Use the numbered tab strip under the Layers heading to choose one layer plane within that group; each plane may hold any creator-chosen mix of elements.
5. Toggle a whole composition group, one numbered plane, or one element without disturbing the other visibility settings.
6. Drag ordinary numbered tabs to reorder their planes within the active group. Background plane 1 remains pinned at the bottom because it is the episode-wide base color.

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
- Full-height right sidebar reaching the top of the window, with the minimap above the layers panel.
- Narrow left **Add** rail that opens an **Asset Library** drawer without permanently taking space from the story canvas.
- Library category buttons for **Uploads**, **Speech Balloons**, **Decorations**, and **Shapes & Frames**; add **AI Generated** only when that future mode actually exists.
- Fixed **Background**, **Content**, and **Foreground** composition-group controls centered above the story canvas without persistent instruction copy competing for that bar.
- Episode title and reset/project controls aligned over the canvas rather than consuming the top of the right inspector.
- Clear controls for project, episode, import, preview, save, and export.
- Editable episode names and a **File > New Episode** command.
- A familiar File, Edit, View, Window, and Help command structure. A browser build may present these as an in-app menu bar; native macOS and Windows menu integration belongs with later desktop packaging.

### 2. Vertical editing canvas

- A tall episode surface inside a pannable and zoomable workspace.
- Selection, move, resize, and delete for placed elements.
- Visible selection outline with corner handles for direct resizing.
- Optional proximity snapping and alignment guides, controlled by a clearly visible magnet toggle. Snapping suggests centers, edges, and guides without forcing an element into a box, resizing it, or preventing intentional asymmetry.
- A pinned first Background plane that supplies the editable full-scroll base RGB color instead of relying on a hardcoded white canvas. Selecting it exposes a compact **Base color** swatch and native color picker in the inspector; hiding it reveals an editor-only transparency checkerboard rather than changing episode data.
- Ordinary Background planes that can hold movable and resizable full-width color regions, gradients, photos, textures, splatters, or edge decoration. Adding a color region asks where on the scroll it should begin and defaults sensibly to the current viewport.
- Quick panel/frame creation with rectangular and angled or polygonal masks so an image can be repositioned inside an irregular panel without destructive cropping.
- Allow intentional bleed and panel-breakout effects beyond an irregular frame or episode edge while clipping only at the final output boundary.
- Preserve alpha transparency in imported and placed images rather than flattening them onto white.
- Give every selected element an independent opacity value from 0–100%, editable through a contextual bottom control with a precise percentage input.
- Let the creator extend the episode and its background downward as the story grows, without imposing an arbitrary fixed-height project limit. The exact add-space control remains an interaction-design choice.
- Later story-section or panel-sequence reordering for moving whole beats vertically without confusing those sections with the three composition groups.
- Drop targets and insertion feedback while dragging.
- Canvas scrolling that remains synchronized with the minimap.

### 3. Minimap preview

- Scaled view of the complete episode.
- Viewport box representing the visible main-canvas region.
- Drag the viewport box to pan the main canvas.
- Click a minimap location to jump there.
- Update after element movement, panel reorder, episode resize, zoom, or viewport change.

### 4. Layers panel

- Organize the episode into exactly three fixed full-scroll composition groups: **Background**, **Content**, and **Foreground**.
- Let each group contain an open-ended sequence of numbered layer planes. These are creative surfaces, not predefined roles or story sections; only Background plane 1 is special and pinned as the full-scroll base color.
- Render Background planes below Content and Foreground planes above Content. Within a group, plane 1 is lowest and each increasing number renders above the lower planes; element order resolves overlaps inside one plane.
- Show the active group's compact numbered tab strip directly below the Layers heading. Tabs may also have optional names such as “Base,” “Fade,” or “Film,” but ScrollSplice must not force those meanings.
- Let creators drag ordinary tabs by a dedicated handle to reorder planes. Provide a non-drag Move Left/Right alternative, a clear drop marker, and no accidental cross-group movement.
- Keep an overflowing tab strip on one line with small left and right navigation arrows; activating a tab scrolls it into view. These arrows navigate overflow rather than reorder planes.
- Show only the active plane's elements below the tabs, ordered from the top of the scroll downward; use local stacking as a tie-breaker for overlapping elements.
- Select an element row even when its eye or parent plane is hidden. Hidden elements do not render or capture canvas clicks, but Layers selection remains available so the creator can inspect or reveal them.
- Give each group, numbered plane, and element its own eye state. Hiding a parent preserves every child setting.
- Later let creators move an element to another plane from its row's context menu and an equivalent visible keyboard-accessible action; right-click is a shortcut, not the only route.
- Basic names and type icons so similar elements can be distinguished.
- Keep the list independently scrollable. On narrow displays, allow the right inspector to collapse or open as an overlay rather than squeezing the story canvas past usability.
- Lock controls may follow after selection, grouping, and visibility are dependable.

### 5. Add rail and Asset Library

- Keep the collapsed left rail visible as a compact set of category buttons and open the selected category in the Asset Library drawer.
- Use **Uploads** for creator-imported files; use separate categories for built-in speech balloons, decorations, and shapes or frames.
- Show asset thumbnails and names inside the selected category.
- Collapse the drawer to preserve canvas space, and prefer overlay behavior when display width is constrained.
- Drag an asset onto the canvas to create an independently editable element in the active numbered plane.
- Allow a later precise drop onto the Layers panel to choose the group, plane, or stacking destination directly.
- Reusing an asset must not duplicate the original source file unnecessarily.
- Include a free starter set of resizable comic speech balloons and let creators add their own reusable balloon or decorative assets.
- Research common speech-balloon forms and their storytelling conventions before choosing the starter set; do not present stylistic conventions as universal rules.

### 6. Drag-and-drop interaction system

- One consistent interaction language across the app.
- Drag assets from the Asset Library onto the canvas, where they become elements in the active numbered plane.
- Allow a precise Layers-panel drop later without making it the only way to add an asset.
- Drag canvas elements to reposition them.
- Drag numbered plane tabs to change broad stacking within their composition group and use explicit element-order controls for local overlaps.
- Provide clear previews, valid drop zones, and cancellation behavior.
- Keep different drag types distinct so one action cannot accidentally trigger another.

### 7. Local project state

- One local project containing assets and one or more episode documents.
- Episode data records canvas dimensions, ordered layer planes, element membership, transforms, visibility, opacity, and ordering.
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
- Selection must stay synchronized across canvas, composition group, numbered plane, and element list, including Layers-panel selection of hidden elements.
- Dragging must always show what will happen before the user drops.
- The Add rail should remain easy to reach, while its Asset Library drawer must not permanently shrink the working area.
- The composition-group selector must stay centered above the story canvas at supported desktop sizes; the full-height right inspector and its element list scroll independently and can collapse into an overlay on narrower displays.
- Group selection filters organization only. Visibility changes happen through explicit eye controls, not merely by switching groups.
- Numbered planes are unrestricted creative surfaces. Examples and optional names may guide creators, but ScrollSplice must not force panels, characters, effects, or decorations into particular numbered tabs.
- Keyboard shortcuts may supplement group and layer visibility, but every action must remain available through visible controls.
- Empty states should teach the first action: import an image or create a panel.
- The pinned base color, movable color regions, fades, background imagery, and optional decoration should remain independently editable while composing into one continuous reader view.
- Transparent areas should preview accurately against the current background treatment.
- Element opacity must be adjustable independently of source-image alpha and displayed as a precise percentage for the selected element.
- Snapping must be optional, easy to toggle or temporarily bypass, and clear about which center, edge, guide, or nearby element is being matched.
- Long episodes must remain usable; off-screen content should not make basic editing sluggish.
- The manual editor must remain complete and understandable when OpenAI features are disconnected or unavailable.
- Autonomous work must show progress, allow cancellation, make generated assets distinguishable, and preserve a clear path back to manual editing.

## Examples of Success

- A creator imports six images, drags them into a vertical episode, reorders two panels, adjusts their spacing, and exports the strip without reading instructions.
- A creator chooses a numbered **Content** plane, opens **Uploads** from the Add rail, and drags an image onto the canvas; the new element appears in that plane's list.
- A creator switches to Background plane 2, adds a long purple color region beginning at the current viewport, adjusts its start and end, and places a separate transparent fade above it.
- A creator makes an angled panel mask, repositions a photo inside it, and lets a character or sound effect break beyond the frame without snapping forcing it back inside.
- On a smaller monitor, the creator can scroll or collapse the right inspector without losing the composition-group controls or access to the Asset Library.
- A creator combines a chosen background color with a transparent uploaded background and optional edge decoration, then extends the episode as new story beats are added.
- A creator adds a starter speech balloon, resizes it with corner handles, and replaces or supplements the starter library with a personal reusable balloon asset.
- Dragging the minimap viewport moves the main canvas to the matching portion of the episode.
- Selecting an image on the canvas highlights its element row; reordering that element within its plane changes the visible stacking immediately.
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
- Third-party comic screenshots used to explain panels, transitions, or effects remain uncommitted design references, not project fixtures or submission assets.
- The minimap, main canvas, and layers panel must share one authoritative episode state rather than drifting into separate representations.
- Drag-and-drop behavior must be reversible through undo before the creator-ready MVP is considered production-safe, though undo may follow the Build Week MVP.
- Platform constraints belong in versioned, data-driven export profiles rather than scattered constants in the editor core.
- WEBTOON publishing remains a manual website workflow. Do not automate login, upload, or publishing unless an official supported integration is discovered and Katherine explicitly approves it.
- Human and autonomous edits must share the same authoritative document, coordinate system, asset records, and command layer; the model must not manipulate React, Konva, or Zustand state directly.
