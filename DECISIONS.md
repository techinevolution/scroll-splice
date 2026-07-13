# ScrollForge Decisions

## 2026-07-12: Name the product ScrollForge

Decision: The vertical comic builder is named ScrollForge. Root & Table is its first story project and proving ground.

Reason: The tool should have a concise identity independent of a particular comic.

Consequences: Product documentation and UI should say ScrollForge; Root & Table examples should be presented as project content.

## 2026-07-12: Design around scroll-native editing

Decision: The primary document is one long vertical episode, not a set of conventional comic pages.

Reason: Pacing, gaps, reveals, and navigation in a scrolling comic are core creative controls rather than export-time formatting.

Consequences: Canvas geometry, minimap navigation, preview, and export all use the same vertical episode model.

## 2026-07-12: Use one shared episode document

Decision: The canvas, minimap, layers panel, reader preview, and export are views of one authoritative episode document.

Reason: Separate representations would create selection, ordering, and geometry inconsistencies.

Consequences: All saved edits pass through document commands; transient UI state stays separate.

## 2026-07-12: Make drag and drop the common interaction language

Decision: Assets, placed elements, layers, panel groups, and minimap navigation use direct dragging where appropriate.

Reason: The editor should feel tactile and reduce dependence on forms and menus.

Consequences: Drag types and valid drop targets must be explicit, visually previewed, and tested so similar gestures do not conflict.

## 2026-07-12: Preserve source assets

Decision: Placed elements reference imported source assets; transforms and edits are stored on the instance.

Reason: Creators must be able to reuse art and recover from editing mistakes without destructive file changes.

Consequences: The asset library and episode document have separate identities and storage responsibilities.

## 2026-07-12: Keep the MVP local-first

Decision: The MVP has no required accounts, cloud services, AI services, or publishing integrations.

Reason: The core editor interaction can be proven more safely and simply with local projects.

Consequences: The runtime choice must support a credible local save/open path, but that persistence can follow the initial editor milestone.

## 2026-07-12: Defer the application framework decision (superseded)

Decision: Select the framework at the start of the first implementation slice rather than in planning.

Reason: The repo is empty and the defining requirements can be expressed without prematurely committing to a stack.

Consequences: Setup, run, test, and build commands remain unverified until Slice 1 begins.

Superseded by the locked Build Week stack decision below.

## 2026-07-12: Lock the Build Week stack

Decision: Build the first ScrollForge editor MVP as a local browser app using Node.js 22, pnpm 10, React 19, strict TypeScript, Vite 8, React-Konva/Konva, Zustand, and plain CSS. Use native pointer and drag events for Build Week. Use Vitest for unit tests, Playwright for one editor smoke test, ESLint for linting, and `tsc --noEmit` for type checking.

Reason: This stack provides the editor, canvas, shared-state, and testing primitives needed to prove ScrollForge's defining interaction within the available Build Week hours without introducing a backend or desktop wrapper.

Consequences: Do not add Next.js, Tauri, dnd-kit, a backend, database, cloud service, or OAuth dependency during Build Week. Resolve current stable package versions when the approved scaffold begins and commit the generated `pnpm-lock.yaml`. Adding another dependency requires evidence that the current stack cannot safely satisfy the active slice.

## 2026-07-12: Render a viewport, not one giant canvas

Decision: The Konva stage represents the visible editor viewport into a larger logical episode. It must not be sized to the episode's full height.

Reason: A very tall live canvas would increase rendering cost and couple editor performance to episode length.

Consequences: The episode model stores logical coordinates. Canvas and minimap convert through one tested coordinate module, and the editor renders only the visible area plus a small buffer.

## 2026-07-12: Keep future authentication provider-neutral

Decision: Future OAuth belongs behind a provider-neutral application boundary and does not enter the editor core, episode schema, or Build Week dependency set.

Reason: Authentication identifies who may access a workspace; it does not define comic content or editing behavior.

Consequences: Provider tokens and identity records must remain outside episode documents and document commands. Do not add user IDs, OAuth fields, provider SDKs, or cloud persistence until an account-enabled slice is explicitly approved.

## 2026-07-13: Separate the Build Week MVP from the creator-ready MVP

Decision: Treat the July 21 submission as the smallest complete editor MVP and the larger import-save-edit-export workflow as the creator-ready MVP.

Reason: The shared canvas, minimap, layers, movement, and reset story is ScrollForge's clearest product insight and can be a coherent end-to-end experience within the available week. Calling every future creator workflow a contest must-have would hide that complete story behind unfinished breadth.

Consequences: Build Week requires navigation, synchronized selection, one move command, reset, tests, public access, and submission evidence. Import, persistence, undo, resize, ordering, production export, and accounts are explicitly deferred.

## 2026-07-13: Preserve a public pre-event baseline

Decision: Record Katherine's identification of the seven original documents as July 12 planning work, first commit them unchanged on July 13 at 11:28:56 AM PT as root commit `e4db897`, and mark them with annotated tag `pre-build-week-planning` in the public `techinevolution/scroll-forge` repository. License repository source and documentation under MIT.

Reason: The event permits meaningful extensions to pre-existing work but judges only work completed after the submission period begins. An immutable no-code snapshot makes the boundary inspectable, while explicit wording avoids claiming that its July 13 Git timestamp independently proves July 12 creation.

Consequences: Never amend, squash, delete, or force-move the baseline commit or tag. All judged code and Build Week evidence must appear in later dated commits. MIT does not automatically license private, third-party, or separately identified creative assets.

## 2026-07-13: Submit in Apps for Your Life with public static access

Decision: Target the **Apps for Your Life** category and publish the passing static build through GitHub Pages. Use an unrestricted downloadable test build only if Pages cannot be made reliable in the allotted session.

Reason: ScrollForge is a focused creator tool for an individual's real creative workflow. Public static access is the simplest way to let judges use it without accounts, backend availability, or special permissions.

Consequences: The build must be usable from the public access path, and the submitted repository, demo, video, and access path must remain available through August 5, 2026 at 5:00 PM PT. Deployment does not justify adding a backend or account system.

## 2026-07-13: Use a flat sample model and one defining edit

Decision: Use a provisional `800`-unit fixed logical width, flexible height, a flat ordered element collection, a fixed fit scale, and one document edit: moving a selected element. Provide reset. Defer zoom, panel groups, nested layers, resize, reorder, import, and undo.

Reason: This is the smallest model that demonstrates long-scroll navigation and shared selection while leaving geometry and command boundaries clean.

Consequences: The Build Week fixture contains six original story beats made from code-rendered shapes and text, with stable IDs and readable layer names. Selecting an off-screen layer centers it. The minimap is a lightweight React/CSS/SVG view rather than a second editable canvas.

## 2026-07-13: Keep sample content public-safe

Decision: Use original code-rendered shapes and text for the repository, automated tests, screenshots, public deployment, and demo video unless a specific separate asset has documented permission.

Reason: The repository and video are public submission artifacts, while Root & Table artwork is private creative material and unnecessary to prove the editor interaction.

Consequences: Root & Table remains the real product proving ground after Build Week, but its production art must not be committed or displayed publicly without Katherine's explicit approval. Do not use unlicensed music, trademarks, or copied comic material in the demo.

## 2026-07-13: Treat WEBTOON as a manual export target

Decision: ScrollForge will prepare files for manual WEBTOON website publishing. It will not automate WEBTOON login, upload, or publishing.

Reason: Public WEBTOON guidance confirms a website publishing workflow but does not provide an approved direct-publishing integration for this project. Current public episode limits are not complete enough to hardcode with confidence.

Consequences: A later exporter uses a versioned `ExportProfile`, creates a tall master plus ordered slices, and preflights limits. Before implementing the WEBTOON profile, perform a harmless authenticated unpublished upload test and record the live constraints. Platform data stays outside the episode model and commands.

## 2026-07-13: Use Codex with GPT-5.6 as the Build Week AI contribution

Decision: Use Codex with GPT-5.6 to implement and validate ScrollForge, and record that collaboration through dated commits, README evidence, the demo explanation, and a `/feedback` Session ID from the primary core-functionality task. Do not add a token runtime AI feature merely to imply eligibility; first obtain organizer clarification on the Stage One "required APIs/SDKs" wording.

Reason: The official event brief asks builders to create projects with Codex and GPT-5.6 and requires the submission to explain that use. ScrollForge's product value is the editor interaction; a speculative embedded AI feature would enlarge the scope without strengthening it.

Consequences: Concrete README claims must be written from completed work, not predicted in advance. Requesting clarification is a risk-reduction action, not a submission blocker if the organizer does not reply. If the organizer says an in-product OpenAI feature is required, pause and revise the scope before implementation continues.

## 2026-07-13: Keep the requested repository name but treat final branding as uncleared

Decision: Keep the requested project name **ScrollForge** and repository slug `scroll-forge` for this documentation slice, while recording that final submission-name clearance is unresolved.

Reason: A basic public screen found multiple exact-name uses, including the active **RipSaw ScrollForge** creative-design application, a Scroll Forge browser extension, a ScrollForge PDF converter, and a `scrollforge` programming package. A public search is not legal clearance, and the creative-software overlap is meaningful enough that the submission warranty must not be assumed.

Consequences: Do not state that ScrollForge is trademark-cleared. Katherine must decide before the public video and Devpost submission whether to retain the working name after appropriate review or select a more distinctive brand. A rename would change branding and the repository slug/links, not the framework-independent editor model or architecture.
