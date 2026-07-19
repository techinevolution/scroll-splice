# ScrollSplice dual-appearance design QA

The Bright Studio light direction and Graphite/Copper dark direction were selected from Katherine's conversation-supplied design explorations. Those source mockups remain outside the repository; only the implemented public-safe editor evidence is committed.

## Matched implementation evidence

- [Dark appearance](docs/progress/2026-07-19-big-feature-ui-dark.png)
- [Light appearance](docs/progress/2026-07-19-big-feature-ui-light.png)
- Viewport: 1440 × 900
- State: fresh browser storage, **The Light We Planted**, inspector visible, Details Bar hidden, no user uploads

Both captures use the same document, viewport, minimap position, inspector state, and layer organization. Browser coverage verifies appearance switching and persistence, optional Details Bar behavior, the larger scrollable minimap, constrained inspector controls, project-owned branding, and loaded in-repository story assets.

## QA result

- Automated consistency: pass.
- Public/private-content check: pass; only project-owned UI/branding and original generated demo art appear.
- Functional regression: pass with all 15 Chromium stories.
- Final aesthetic preference remains Katherine's product review rather than an automated claim of pixel-for-pixel mockup identity.

final result: evidence captured; ready for product review
