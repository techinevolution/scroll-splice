# ScrollSplice Project Outline

## Goal

Build a visual editor specifically for creating long, vertically scrolling comic episodes. ScrollSplice should make arranging a Webtoon-style episode feel direct and understandable: creators work on a large canvas, see the whole episode in a minimap, manage overlapping elements through layers, and drag reusable images into place.

## Intended End State

ScrollSplice becomes a focused comic-production workspace rather than a general image editor. A creator can assemble an episode from panels, characters, backgrounds, effects, and text; control pacing through spacing and scale; navigate the full strip without losing context; and export a publishable vertical result.

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

Import, save/reopen, undo, resize, layer or panel reordering, production export, OAuth, and cloud services are outside this milestone.

### Creator-ready MVP

The creator-ready MVP completes the workflow described below: import original assets, arrange and refine an episode, save safely, undo meaningful changes, preview the reader experience, and export files validated against a selected platform profile.

## Core Workflows

### Assemble an episode

1. Open an episode.
2. Import images into the asset library.
3. Drag an asset onto the canvas to create an element.
4. Position and resize it within the vertical composition.
5. Add more panels or elements as the episode grows downward.

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

## Creator-ready MVP Components

### 1. App workspace

- Large main editing canvas on the left.
- Right sidebar with minimap above the layers panel.
- Collapsible asset panel, initially placed along the bottom or left edge based on the most usable MVP layout.
- Clear controls for project, episode, import, preview, save, and export.

### 2. Vertical editing canvas

- A tall episode surface inside a pannable and zoomable workspace.
- Selection, move, resize, and delete for placed elements.
- Visible selection outline and handles.
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
- Save and reopen without losing layout.
- Keep imported source assets separate from placed element instances.

### 8. Preview and export

- Reader preview without editor chrome.
- Export a tall PNG or JPG master and zero-padded ordered platform slices.
- Validate dimensions, file size, image count, format, and other profile limits before writing the final package.
- Report export failures clearly and do not overwrite source assets.

## UX Expectations

- The canvas remains the visual center of gravity.
- Minimap navigation should feel immediate, with no confusing jump between the viewport box and main canvas.
- Selection must stay synchronized across canvas and layers.
- Dragging must always show what will happen before the user drops.
- The asset panel should be available without permanently shrinking the working area.
- Empty states should teach the first action: import an image or create a panel.
- Long episodes must remain usable; off-screen content should not make basic editing sluggish.

## Examples of Success

- A creator imports six images, drags them into a vertical episode, reorders two panels, adjusts their spacing, and exports the strip without reading instructions.
- Dragging the minimap viewport moves the main canvas to the matching portion of the episode.
- Selecting an image on the canvas highlights its layer; moving that layer changes the visible stacking immediately.
- Closing and reopening the project restores the same asset list and episode layout.

## Non-Goals for the MVP

- A full Photoshop replacement.
- Built-in painting, advanced photo manipulation, or complex vector drawing.
- AI image generation or an embedded creative agent.
- Real-time collaboration or cloud accounts.
- Mobile editing.
- Multi-user permissions, publishing, or direct WEBTOON upload.
- Advanced text balloons, effects, animation, or version history.

## Non-Negotiable Boundaries

- Work locally by default; do not upload comic assets to external services without explicit approval.
- Imported source files must never be destructively edited.
- Root & Table art and personal creative material must not be committed to the repository without explicit approval; use synthetic fixtures in tests.
- The minimap, main canvas, and layers panel must share one authoritative episode state rather than drifting into separate representations.
- Drag-and-drop behavior must be reversible through undo before the creator-ready MVP is considered production-safe, though undo may follow the Build Week MVP.
- Platform constraints belong in versioned, data-driven export profiles rather than scattered constants in the editor core.
- WEBTOON publishing remains a manual website workflow. Do not automate login, upload, or publishing unless an official supported integration is discovered and Katherine explicitly approves it.
