# ScrollSplice Feature Test Sheet

Use this sheet for Katherine's hands-on review of the completed **deployed human editor**. The walkthrough follows one synthetic creator story so each test builds on the last instead of feeling like a disconnected checklist. Test one row at a time; record the result before moving on.

Use the public editor at <https://techinevolution.github.io/scroll-splice/>. Its GitHub Pages access and clean-profile launch have already passed automated verification; this sheet records Katherine's product review. It does **not** test OpenAI generation, OAuth, cloud sync, automated WEBTOON login/upload/publishing, native desktop packaging, or the final Devpost video/submission. Those capabilities remain separately gated. Episode-image export uses the limits observed on WEBTOON's July 13 form and must remain labeled **provisional, not upload-verified, and for manual upload only**.

## Review record

- Date started: July 19, 2026
- Browser and version:
- Window size or display resolution:
- Public URL: <https://techinevolution.github.io/scroll-splice/>
- Build/commit: `2849d81`
- Tester: Katherine
- Current test: `W01`
- Overall result: In progress / Pass / Pass with notes / Fail
- Blocking issue, if any:

For each row, record **Pass**, **Pass with notes**, **Fail**, or **Skipped**. A note should say what happened, where it happened, and whether reloading changed it. Keep the same browser window open between rows so the creator story and browser-local project state carry forward.

## Safe test material

Use only synthetic or public-safe images that are not private Root & Table artwork.

- One ordinary PNG, JPEG, or WebP image.
- One transparent PNG if available.
- Optional replacement image with a visibly different color or shape.
- Suggested episode name: **Moonlit Garden**.
- Suggested creator category: **Garden Kit**.

## Story 1 — Open and understand the workspace

Imagine that you are starting a short vertical episode about a character crossing a moonlit garden.

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| W01 | Open the [deployed ScrollSplice editor](https://techinevolution.github.io/scroll-splice/) in a fresh browser tab. | **The Light We Planted** loads with the story canvas, left Asset Library rail, full-episode minimap, and Layers inspector visible; the canvas is usable rather than squeezed. |  |  |
| W02 | Click **File**, **Edit**, **View**, **Window**, and **Help**. | Each working menu opens above the Asset Library and canvas; moving between menus does not trigger an editor action. |  |  |
| W03 | Open **Help > Shortcuts & About**, then close it with Escape. | The help dialog explains local storage, portable projects, and the working shortcuts; Escape closes it. |  |  |
| W04 | Use **Window > Hide Inspector**, then show it again from the header control or Window menu. | The minimap/Layers inspector hides and returns without changing the episode. |  |  |
| W05 | Narrow the window to about 1,024 pixels wide and open the inspector. | The inspector behaves as an overlay instead of crushing the canvas; its close control, scrim, and Escape dismissal work. |  |  |
| W06 | Open one Asset Library category, then click the active category again. | The drawer opens over the workspace and the second click closes it. |  |  |

## Story 2 — Start and shape the episode

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| E01 | Choose **File > New Episode** and confirm any discard warning. | A blank 800 × 1,280 episode opens without deleting previously saved projects or reusable assets. |  |  |
| E02 | Click the episode title and rename it **Moonlit Garden**; press Enter. | Only the title footprint becomes editable, the **EPISODE** label stays anchored, and the saved title remains visible. |  |  |
| E03 | Re-enter title editing, type a temporary change, then press Escape. | The temporary change is canceled. Blank text is not accepted, and input stops at 60 characters. |  |  |
| E04 | Select **Background**, plane 1, and change **Base color** in Layers. | The complete episode base changes color immediately in the canvas and minimap. |  |  |
| E05 | Use the direct base-color control on the canvas for a second color. | The same Background plane 1 data changes; there is no separate or hardcoded canvas color. |  |  |
| E06 | Hide Background plane 1, then reveal it. | Hidden base content stops rendering while its eye state remains recoverable from Layers. |  |  |
| E07 | Click **Add scroll space** twice. | The episode grows by 1,280 logical units per click; the base, canvas, slice guides, scrollbar, and minimap refit to the new height. |  |  |
| E08 | Drag the episode's bottom resize edge down, then back upward. | Height changes continuously; shrinking stops before it would clip any visible or hidden element and never moves existing content. |  |  |
| E09 | Toggle **Slice guides** off and on. | Gray dotted 1,280-unit candidate boundaries disappear and return; they do not appear as layers or minimap content. |  |  |

## Story 3 — Build Background, Content, and Foreground planes

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| L01 | In Background, add two ordinary planes with the tab-strip **+**. | New numbered tabs appear; Background plane 1 remains pinned as the base. |  |  |
| L02 | Give the ordinary planes useful names such as **Night fade** and **Edge texture**. | Names save without replacing stable plane numbers or changing their composition group. |  |  |
| L03 | Reorder the ordinary planes with the tab drag grip, then with **Move Left/Right**. | Both methods change within-group order consistently; Background plane 1 cannot move. |  |  |
| L04 | Add enough planes for the tab strip to overflow. Use its left/right arrows. | The strip stays on one line; arrows reveal hidden tabs without reordering them. |  |  |
| L05 | On an empty ordinary plane, use **Delete plane**. | The plane is removed and another nearby plane activates; the base and the final plane in a group remain protected. |  |  |
| L06 | Populate an ordinary plane, open its plane actions, and choose a destination for its elements before deletion. | All elements move to the chosen same-group plane, then the old plane is deleted without data loss. |  |  |
| L07 | Repeat with a disposable populated plane and choose the destructive confirmation path. | The warning is explicit; confirmation deletes that plane and its elements. Cancel leaves everything unchanged. |  |  |
| L08 | Toggle a whole composition group's eye, a plane eye, and an element eye independently. | Parent visibility hides descendants without erasing their individual eye settings. Hidden elements remain selectable from Layers. |  |  |
| L09 | Switch among **Background**, **Content**, and **Foreground**. | Each group keeps its own numbered planes and Layers list; render order remains Background below Content below Foreground. |  |  |

## Story 4 — Create reusable assets and place them

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| A01 | Open **Uploads** and choose an ordinary PNG, JPEG, or WebP with **Upload image**. | The source is validated, saved locally, and shown with its name and dimensions; it is not placed until you choose or drag it. |  |  |
| A02 | Drop a PNG, JPEG, or WebP from Finder directly onto a clear canvas location. | One source is imported and exactly one image element is placed beneath the pointer on the active ordinary plane. |  |  |
| A03 | Place an imported or built-in asset by clicking its card. | The accessible fallback places one element near the center of the visible viewport. |  |  |
| A04 | Drag an imported or built-in asset from the drawer onto the canvas. | The asset lands under the pointer and the click fallback does not fire a second time. |  |  |
| A05 | Drag an asset onto a numbered plane tab, then onto the active Layers list. | Each valid drop places one element on the intended plane and gives clear target feedback. |  |  |
| A06 | Try dropping a non-image file or an asset on Background plane 1. | ScrollSplice refuses the invalid target/file clearly and does not create a broken layer. |  |  |
| A07 | Place a transparent PNG over a colored background. | Transparent pixels stay transparent in the canvas, minimap, Reader Preview, save/reopen path, and local renderer. |  |  |
| A08 | Open **Speech Balloons**, **Decor**, and **Splatters** and place at least one original built-in from each. | Each built-in is reusable, resizable, transparent, and independently selectable. The Oval and Rounded balloon outlines have no white seam. |  |  |
| A09 | In **Uploads**, create the creator category **Garden Kit**, rename it, move it left/right among creator categories, and then return it to that name. | Creator categories live inside Uploads, persist locally, and reorder without moving or duplicating source bytes. |  |  |
| A10 | Move an imported source into **Garden Kit**, rename the source, and replace its image. | The stable source remains reusable; placed references update to the replacement rather than becoming detached. |  |  |
| A11 | Try deleting a source still referenced by the current episode or a saved/recovery/local project. | Deletion is blocked with a useful explanation; no placed or saved image becomes silently missing. |  |  |
| A12 | Remove every reference to a disposable source and delete it. Then delete its creator category. | The unused source can be deleted; deleting a category keeps any remaining sources by moving them to **Unsorted** inside Uploads. |  |  |

## Story 5 — Compose panels, text, and speech

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| C01 | In Content, use **Panel / shape** to create a rectangle and an ellipse with custom names, fill, outline, width, and corners. | Each shape appears as an editable element with the chosen style and its own Layers row. |  |  |
| C02 | Select a shape and change rectangle/ellipse type, fill, outline visibility/color/width, and corner radius in the bottom controls. | Canvas, minimap, Reader Preview, undo/redo, and saved state agree. |  |  |
| C03 | Add independent text and edit wording, color, font size, weight, and alignment. | The text updates as its own movable/resizable element and can sit over any image or balloon. |  |  |
| C04 | Open **Speech Balloons** and choose **Editable balloon**. | One atomic balloon element appears with fitted text, an editable body, and an editable tail. |  |  |
| C05 | Change balloon wording, body/outline/text colors, line width, corners, font, min/max size, weight, alignment, line height, and padding; apply it. | Text refits inside the resized body and the complete edit is undoable. |  |  |
| C06 | Toggle the balloon tail, try every side, and adjust anchor, width, Tip X, and Tip Y. | Tail placement changes while the body and text remain editable; bounds, minimap, Reader Preview, and renderer include the tail. |  |  |
| C07 | Resize the editable balloon narrower, wider, shorter, and taller. | Text automatically refits between the chosen minimum and maximum font sizes instead of becoming a separate loose layer. |  |  |

## Story 6 — Arrange, transform, and style elements

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| T01 | Select an element on the canvas, then select a different one in Layers. | Canvas and Layers selection stay synchronized; Layers selection reveals an off-screen item in the viewport. |  |  |
| T02 | Drag an element while watching the status bar and minimap. | `x/y/w/h` and minimap position update during the drag, not only after release; release creates one history step. |  |  |
| T03 | Resize an ordinary element from each corner; resize a Background color region from corners and side handles. | Ordinary content keeps proportional corner behavior; a Background region can change width and height independently from all eight handles. |  |  |
| T04 | Leave **Magnet** on and move objects near the episode center, edges, and another element's edges/centers. | Alignment guides appear and the element snaps predictably without jumping after scrolling. |  |  |
| T05 | Repeat while holding Alt/Option, then repeat with Magnet off. | Snapping is temporarily bypassed or fully disabled so intentional asymmetry is possible. |  |  |
| T06 | Edit selected X, Y, W, and H directly; use Left/Center/Right and Top/Middle/Bottom alignment. | Geometry updates exactly and remains inside the episode unless bleed is enabled. |  |  |
| T07 | Use arrow keys to nudge; repeat with Shift. | The selection moves 1 logical unit per arrow, or 10 with Shift, and the action is undoable. |  |  |
| T08 | Rename, duplicate, lock, unlock, and delete a selected element. | Duplicate receives a new stable identity; a locked element cannot be moved/resized/deleted until unlocked; Delete/Backspace removes the selected instance only. |  |  |
| T09 | Rotate through a typed angle and the ±90° buttons, then flip horizontally and vertically. | Canvas, minimap, Reader Preview, history, persistence, and output use the same transformed geometry. |  |  |
| T10 | Change opacity from 100% to a partial value, then 0%, and try Normal, Multiply, Screen, Overlay, and Soft Light. | Appearance updates immediately; a 0%-opacity element remains recoverable from Layers; one slider gesture is one history step. |  |  |
| T11 | Use **Send Backward** and **Bring Forward** on overlapping elements. | Only stacking inside the current plane changes. |  |  |
| T12 | Use **Move to Plane** for one element. | Its stable element and source reference move to the selected ordinary plane exactly once; group/plane selection follows it. |  |  |
| T13 | Shift-click two or more Layers rows or canvas elements, then **Group** them and drag the primary. | All selected outlines remain visible and one item is primary. During the drag, only the primary position previews live in the status bar/minimap; follower members update together when release atomically commits the group move. |  |  |
| T14 | Duplicate, nudge, move up/down 128, move to another plane, and delete a grouped selection; then Undo each operation. | Each group operation is atomic. Group members keep relative spacing and do not become a recursive group. |  |  |
| T15 | Choose **Ungroup**. | Members remain in place as normal independent elements. |  |  |
| T16 | Use **Select all in plane**, then **Move up 128** and **Move down 128**. | The complete selected story beat moves together without changing composition groups or plane order. |  |  |

## Story 7 — Create backgrounds, panels, crop, and texture

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| P01 | On an ordinary Background plane, add a color region with a start position, length, and color. | It starts full width at the requested vertical position, remains movable/resizable, and is not confused with the pinned base. |  |  |
| P02 | Change the region to **Vertical fade** and set both stop colors and opacity values. | The gradient/fade renders consistently in canvas, minimap, Reader Preview, saved state, and output. |  |  |
| P03 | Select an image and try **Stretch**, **Cover / crop**, and **Tile texture**. | Stretch fills its bounds, Cover crops non-destructively, and Tile repeats the unchanged source at a bounded scale. |  |  |
| P04 | In Cover mode, change Focus X, Focus Y, and Crop zoom. | The visible crop moves inside the frame without changing or destroying the source asset. |  |  |
| P05 | Try Rectangle, Rounded rectangle, Slant left, Slant right, and Diamond masks. | Each preset clips the image cleanly and consistently in every view and in exported output. |  |  |
| P06 | Turn on a frame and edit its color and width. | The border follows the selected mask rather than drawing an unrelated rectangle. |  |  |
| P07 | Set **Edges** to Keep inside, then Allow bleed, and move the element across the episode edge. Also try the same with a masked image. | Keep inside constrains the element; Allow bleed permits episode-edge overflow while final output clips to the 800-wide boundary. A masked image remains clipped to its own frame. Panel-mask breakout is not first-class; use a separate duplicated unmasked overlay if you want to evaluate that workaround. |  |  |

## Story 8 — Navigate and preview the long scroll

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| N01 | Pan vertically with the wheel/trackpad and horizontally when zoomed above Fit Width. | The viewport moves smoothly and clamps at valid episode limits. |  |  |
| N02 | Click several minimap locations and drag its viewport box. | The main canvas jumps or pans to the matching logical location on both axes. |  |  |
| N03 | Move and resize an element while watching the minimap. | Its preview changes live and commits without a second jump. The minimap keeps the episode's proportions rather than stretching content. |  |  |
| N04 | Change zoom from 50% through 200%, then choose **Fit Width**. | Zoom preserves the logical center where practical, does not change document geometry, and Fit Width returns to the dependable reference. |  |  |
| N05 | Choose **View > Reader Preview** and inspect the whole episode. | A chrome-free full scroll matches visible elements, opacity, blend, transforms, masks, crop, frames, backgrounds, text, and balloons; closing it returns to the unchanged editor context. |  |  |

## Story 9 — Undo, save, recover, and move the project

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| S01 | Make one create, delete, move, resize, style, visibility, plane, group, and title change. Undo them, then Redo them with menus and shortcuts. | Meaningful document actions reverse and replay predictably; selection-only, viewport, zoom, and panel-open changes do not pollute history. |  |  |
| S02 | Choose **File > Save**, reload the page, and inspect the episode and reusable assets. | The explicit current local project reopens with layout, format-v6 appearance, groups, names, and asset references intact. |  |  |
| S03 | Make an unsaved change, then choose **Reopen Current** and confirm. | The last explicit save replaces unsaved edits; cancel would preserve them. |  |  |
| S04 | Choose **Save As…**, give the project a new name, and open **Open Local Project…**. | A second local project appears; each project can be opened independently and the current project is identified. |  |  |
| S05 | Delete a disposable local project from the local-project dialog. | A clear confirmation protects the project; the current project and referenced asset safety are respected. |  |  |
| S06 | Make a change, wait briefly, then close/reload without saving. | A crash-recovery banner offers the newer unsaved snapshot separately from the explicit save. Restore recovers it; Discard permanently removes only the recovery snapshot. |  |  |
| S07 | Choose **Export Project File…** and save the `.scrollsplice` file. | The portable file contains the episode and complete reusable local asset library; it does not contain credentials or cloud data. |  |  |
| S08 | In a disposable/new local project, choose **Import Project…** and select that file. | The imported episode and source blobs reopen intact; ID collisions are remapped safely rather than overwriting unrelated local categories or sources. |  |  |
| S09 | Use **Reset demo** with unsaved work: cancel once, then confirm. | Cancel is a complete no-op. Confirm loads the public synthetic fixture as unsaved while the last explicit save remains available to Reopen. |  |  |

## Story 10 — Produce provisional local files

These checks prove the local renderer, not WEBTOON acceptance. Do not publish the test episode.

| ID | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| X01 | Choose **File > Export Episode Images…**. | The dialog prominently says the 800 × 1,280 profile is provisional, has not passed upload verification, and still requires manual upload. |  |  |
| X02 | Review the default cuts, move one interior cut to a valid visual gutter, then use **Reset cuts**. | Custom cut positions remain ordered and are revalidated; Reset restores profile-derived candidates. |  |  |
| X03 | Select PNG and render slices. | Files use deterministic zero-padded names, are no wider than 800 and no taller than 1,280, and preflight reports count, total bytes, missing sources, and observed-limit issues. |  |  |
| X04 | Select JPEG, change its quality, and render again. | JPEG files rerender at the chosen quality; changing the episode or settings makes old output visibly stale rather than silently reusable. |  |  |
| X05 | Render and download the tall master. | The master contains the complete current episode without editor chrome, slice guides, selection handles, or off-episode bleed. |  |  |
| X06 | Download one slice and then **Download all**. | Downloads contain the rendered files in order. Browser multi-download permission may be required and should be noted, not mistaken for a renderer failure. |  |  |
| X07 | Visually compare one rendered slice with Reader Preview around text, transparency, gradients, masks, frames, transformed images, and an editable balloon tail. | Durable content matches. Any mismatch is a product defect even if local preflight passes. |  |  |

## Automated contracts Katherine does not need to reproduce manually

The repository's unit and browser checks should cover these low-level safety contracts during final validation:

- deterministic v3, v4, and v5 opening into format v6 defaults, plus safe rejection of unknown formats
- pure coordinate conversion, viewport clamping, slice planning, visual bounds, text fitting, and balloon-tail geometry
- stable image/category ID remapping for portable-project collisions
- reference-safe source deletion across the current episode, explicit saves, recovery, and every local project
- strict portable-project, local-project, recovery, and episode parsing
- one history checkpoint per compound command or opacity/drag gesture
- canvas, minimap, Reader Preview, and local-render parity for format-v6 transforms and masks

## Intentionally not in this build

Do not report these as missing regressions; they require separate approval or outside verification:

- OpenAI image generation, model tools, agent autonomy, or OpenAI OAuth
- user accounts, cloud storage/sync, backend services, or collaboration
- automated WEBTOON login, upload, preview inspection, scheduling, or publishing
- an upload-verified or guaranteed-WEBTOON-ready export claim
- native macOS/Windows menus or desktop packaging
- final Devpost video production and submission-form completion
- arbitrary freehand polygon-point editing, perspective/freeform distortion, or nested groups
- first-class art breaking out of an image mask; use a separate duplicated unmasked overlay in this build
- reusable editable-balloon template saving; the atomic editable balloon itself is implemented

## Final sign-off

- [ ] No blocker prevents completing the creator story.
- [ ] Save, recovery, portable-project, Reader Preview, and provisional output all preserve the same episode.
- [ ] No private artwork or personal file metadata was added to the repository during testing.
- [ ] Export remains described as provisional/manual until the authenticated unpublished WEBTOON upload test is complete.
- [ ] Findings have been grouped into blockers, normal bugs, and later polish.
