# ScrollSplice Editable Speech-Balloon Catalog

## Purpose and research boundary

This document is ScrollSplice's research-backed inventory for building editable comic and webtoon speech balloons. It records the practical range a creator should be able to make without treating lettering traditions as rigid rules.

There is no universal, exhaustive list in which every visual style has one fixed meaning. Professional letterers combine body shape, outline, fill, tail, typography, placement, and relationships between balloons. Editors and creators also bend those conventions for tone, genre, space, and personal style. ScrollSplice should therefore offer familiar **presets** whose parts remain freely editable, not a collection of locked pictures.

Professional letterers generally call these objects **balloons**, including thought balloons. The interface may say **Speech Balloons** because that is familiar to creators, while documentation uses “balloon” as the umbrella term.

Current bounded implementation: the library offers ten empty editable starting types—Standard, Rounded, Thought, Whisper, Shout, Electric, Rough, Wavy, Telepathic, and Double Outline. Each creates the same atomic body element and preserves editable type, fill, outline, bounds, tail, and creator-shaped normalized contour points. Creators add lettering as an independent Text element. The broader body, tail, relationship, and creator-saved-preset inventory below remains the roadmap rather than a claim that every catalog row is complete.

Research reviewed July 16, 2026:

- [Blambot: Comic Book Grammar & Tradition](https://blambot.com/pages/comic-book-grammar-tradition) — professional lettering conventions and terminology.
- [Clip Studio Paint: official balloon-tool guide](https://tips.clip-studio.com/en-us/articles/863) — editable body, outline, fill, tail, free-curve, flash, and joined-balloon behavior.
- [Clip Studio Paint: Text & Speech Bubble Tools](https://www.clipstudio.net/en/comics-manga/tool/text-balloons.html) — current tool-level editing expectations for comic, manga, and webtoon lettering.
- [Webtoon 101 by a WEBTOON Original creator](https://tips.clip-studio.com/en-us/articles/4143) — creator guidance on mobile readability, larger lettering, spacing, and connected dialogue.
- [Webtoon paneling tips](https://tips.clip-studio.com/en-us/articles/9310) — creator examples of using balloon color and balloon-only beats for full-color vertical storytelling.

The last two are workflow guidance from experienced creators, not WEBTOON platform requirements. No official WEBTOON balloon taxonomy was found, so this catalog does not present one.

## One composable balloon system

Every preset should be assembled from the same editable parts:

| Part | What it controls |
| --- | --- |
| Body | Ellipse, rectangle or rounded rectangle, cloud, burst, uniform jagged, rough, wavy, double outline, radiating flash, decorative motif, or creator-drawn/freeform path. |
| Outline | Color, width, solid/dashed/dotted/wavy treatment, roughness, second outline, and optional absence. |
| Fill | Color, opacity, gradient or texture when supported, including dark/reverse and translucent treatments. |
| Tail or source marker | Standard wedge, straight, curved, bent, thought dots, lightning, off-panel edge, squink, none, or multiple tails. |
| Lettering | Wording, font, size or auto-fit range, weight, italic, color, alignment, line height, padding, case, and later per-word emphasis. |
| Relationship | Independent, directly joined, connector-linked, multi-speaker, stacked, border-anchored, or intentionally border-breaking. |
| Ordinary element behavior | Position, size, rotation, flip, lock, visibility, opacity, blend, plane, stacking, history, save/reopen, preview, and output parity. |

A creator may start with **Whisper**, change its body to a rounded rectangle, add a curved tail, make the fill translucent blue, and save that result as a personal preset. The name suggests a useful starting convention; it must never restrict what can be edited.

## Body and voice presets

These are the visible starting choices for an eventual editable preset library.

| Preset | Conventional reading | Default construction | Priority |
| --- | --- | --- | --- |
| Standard speech | Ordinary spoken dialogue. | Soft oval or rounded organic body, solid outline, standard pointed tail aimed toward the speaker's mouth. | Core |
| Rounded dialogue | Compact modern dialogue, especially useful in narrow digital layouts. No fixed emotional meaning. | Rounded rectangle or pill body with a standard tail. | Core |
| Angular / boxed dialogue | Precise, clipped, mechanical, or simply space-efficient dialogue according to the creator's visual language. | Rectangle or angular polygon body with optional corner treatment and tail. It is distinct from a narration caption because it remains a speaking balloon. | Expanded |
| Freeform / hand-drawn | A creator-defined voice or handmade visual style. | Editable spline or pressure-like body with an uneven optional stroke. | Expanded |
| Thought | Internal thought in the traditional style. | Cloud or scalloped body with at least three decreasing thought dots aimed toward the speaker's head. | Core |
| Whisper | Quiet, private, or hushed speech. | Standard or soft body with a dashed outline; muted color, small text, lowercase, or italic are optional modifiers. | Core |
| Shout / burst | Screaming or forceful dialogue. | Irregular chaotic spikes, often a heavier outline, with bold or enlarged emphasis available. | Core |
| Electric / radio / broadcast | Speech transmitted through a phone, radio, television, communicator, or speaker. | More uniform spikes than a shout balloon, a lightning-style tail, and optional italic lettering. | Core |
| Rough / monster | Distorted, monstrous, inhuman, or intentionally unsettling voice. | Irregular rough body and uneven or heavy outline; font choice remains creator-controlled. | Core |
| Wavy / weak / distressed | Pain, exhaustion, fading consciousness, trembling, or physical distress. | Shaky body and tail with optional smaller text, ellipses, and breath marks. | Core |
| Telepathic / psychic | Mind-to-mind speech or another supernatural voice. | Traditional thought-like body with opposing breath marks, or a creator-defined custom body; italic is optional. | Core |
| Double-outline emphasis | Strong emphasis without using the ordinary burst shape. | Two nested outlines; the outer body may use a heavier stroke or contrasting fill. | Expanded |
| Flash / radiating | Sudden, dramatic, urgent, or highly energized speech. | Central fill with editable radiating effect lines, line density, length, and roughness. | Expanded |
| Dark / reverse | Ominous, internal, altered, villainous, or simply high-contrast dialogue according to the creator's visual language. | Dark fill with light lettering and an independently editable outline. It has no universal fixed meaning. | Expanded |
| Colored / translucent | Emotion, speaker identity, atmosphere, or a balloon-only webtoon beat. Meaning is creator-defined. | Any body with editable fill color and opacity while maintaining readable text contrast. | Core treatment |
| Decorative / symbolic | Genre- or character-specific voice using hearts, flowers, drips, smoke, frost, petals, or another repeated edge motif. Meaning is creator-defined. | Any base body with an editable repeated motif or creator-drawn outline; motifs are styling, not semantic rules. | Expanded |
| Tailless / ambient | Speech whose source is obvious, deliberately ambiguous, environmental, or off-panel. | Any body with no tail. | Core treatment |
| Small dialogue / large balloon | Muttering, sheepish speech, self-talk, or a very soft whisper. | Ordinary body with deliberately small lettering and generous empty space. | Expanded treatment |

“Core treatment” rows should not become separate hard-coded geometry. They are one-click style changes that can be combined with the other presets.

## Tail and source-marker presets

The tail answers “where is this voice coming from?” and should be editable separately from the body.

| Tail/source preset | Typical use | Required controls |
| --- | --- | --- |
| Standard wedge | Visible speaker. | Body side, attachment position, base width, tip position, and length. |
| Straight narrow tail | Precise or restrained source direction. | Start, end, width, and taper. |
| Curved / spline tail | Natural direction around nearby art. | Start, tip, and one or more curve handles. |
| Bent / polyline tail | Route around a face, panel, or other lettering. | Movable corner points, start, and tip. |
| Thought-dot trail | Internal thought. | Dot count, spacing, size falloff, curve, and final direction toward the head. |
| Lightning tail | Electronic or transmitted speech. | Segment count, bend points, width, and tip. |
| Off-panel edge tail | Speaker beyond the visible panel or current beat. | Arc or S-shaped edge termination, chosen edge, and edge position. A tailless alternative remains available. |
| Squink | A voice behind a door, inside a building, or otherwise originating at a concealed point. | Ordinary or routed tail ending in a small editable multipoint burst. |
| Short burst junction | A less forceful shout than a full burst body. | Standard body and tail with a small burst where they meet. |
| No tail | Obvious, ambient, or deliberately ambiguous source. | One toggle; disabling a tail must preserve its previous settings for later restoration. |
| Multiple tails | A crowd, simultaneous speakers, or one shared balloon. | Add, select, edit, reorder, and delete independent tail records. |

Tail direction is guidance, not enforcement. ScrollSplice may offer a gentle mouth/head-direction hint later, but creators must be able to place any tail anywhere.

## Multi-balloon and placement variants

These variants describe how balloons relate to one another or to panel edges.

| Variant | Conventional reading | Product behavior |
| --- | --- | --- |
| Directly joined balloons | One speaker continuing the same thought or topic. | Two or more editable bodies share a flat relationship; overlapping portions visually merge without destroying either source record. |
| Connector-linked balloons | Separate ideas spoken in sequence. | A selectable connector sits between independent balloons. |
| Alternating-speaker chain | Back-and-forth dialogue arranged in reading order. | Staggered independent balloons may share connectors while retaining distinct speakers and tails. |
| Stacked continuation | Long dialogue split for pacing or mobile readability. | Reading order remains explicit; each body and its text stay independently editable. |
| Butted / anchored balloon | Space-saving placement against a panel edge. | One side may be cropped flat against a chosen edge without permanently flattening the underlying editable body. |
| Border-breaking balloon | An intentional stylistic break into a gutter or beyond a panel. | Overflow is explicit and preview/output must match; it is never introduced accidentally by clipping. |
| Shared multi-speaker balloon | Several characters speaking the same words at once. | One body contains multiple editable tails; the creator controls speaker order and tail geometry. |

Relationships must remain **flat and explicit**. They should not create recursive groups or duplicate geometry, and unlinking them must leave the individual balloons intact.

## Lettering and delivery modifiers

These modifiers may be applied to multiple body presets. They are not separate raster assets.

| Modifier | Suggested default, never a rule |
| --- | --- |
| Normal dialogue | Readable mixed-case lettering with comfortable padding and a solid outline/fill contrast. |
| Whisper | Dashed or muted outline, smaller or lowercase text, and optional italic. |
| Shout / emphasis | Heavier weight, selected enlarged words, and optional underline or stronger body stroke. |
| Transmitted voice | Optional italic plus electric body/tail treatment. |
| Singing | Music-note decoration, optional italic, and later an editable wavy baseline. A lone music note can indicate whistling. |
| Mutter / sheepish | Smaller lettering with intentionally generous internal space. |
| Weak / fading | Progressively smaller lettering, optional ellipses, and breath marks. |
| Cough / sputter / breath | Editable breath marks around a word or at the end of fading speech. |
| Language or special voice | Creator-chosen font, italic, color, or outline treatment; ScrollSplice does not infer language or identity from style. |
| Symbol / silent reaction | Ellipsis, punctuation, icons, or creator-supplied symbols inside a balloon without ordinary dialogue. |
| Per-word emphasis | Later rich-text spans for weight, italic, size, color, underline, or outline without splitting the sentence into unrelated text elements. |

Mobile readability takes priority over automatically imitating a print-comic convention. ScrollSplice should provide phone-width preview, text-overflow warnings, padding/contrast warnings, and reading-order checks, but should not block a deliberate stylistic choice.

## Related lettering containers that are not speech balloons

These belong in the broader lettering toolkit but should not be mislabeled as balloon presets:

| Container | Purpose |
| --- | --- |
| Internal-monologue caption | A modern alternative to a traditional thought balloon. |
| Spoken / off-camera caption | Vocal dialogue from a speaker outside the visible scene, conventionally distinguished from narration. |
| Location and time caption | Establishes place, date, or time. |
| Editorial / narrator caption | Narrator, writer, or editorial voice. |
| Sound effect / onomatopoeia | Visualized sound such as “WOBBLE,” “BOOM,” or “CRASH”; it needs a separate editable display-lettering system. |

Caption boxes can share typography and appearance primitives with balloons, but they should remain a separate element kind so tails, balloon joining, and speaker-source rules do not leak into them. Sound effects likewise need transformation and display-type controls beyond ordinary fitted dialogue.

## Minimum editable controls

Completing this catalog does not mean drawing one fixed SVG for every row. It means the composable editor can reproduce every row while preserving these controls:

1. Change body kind without losing wording, placement, or tail settings.
2. Edit fill, fill opacity, outline color, outline width, and outline pattern independently.
3. Adjust shape-specific values such as corner radius, scallop size, spike count/depth, wave amplitude/frequency, roughness, repeated edge motif, double-outline gap, or flash-line density.
4. Add, remove, and edit one or more tails or source markers independently of the body.
5. Edit wording and practical typography, including auto-fit range, padding, line height, alignment, weight, italic, and text color.
6. Move and resize the whole atomic balloon while retaining ordinary ScrollSplice rotation, flip, lock, visibility, opacity, blend, plane, stacking, grouping, history, and persistence behavior.
7. Join, connect, unlink, or anchor balloons without rasterizing them or destroying their independent records.
8. Preview the exact same result in the canvas, minimap, Reader Preview, saved/reopened project, portable project, and local output.
9. Save a customized result as a creator-owned preset later without altering balloons already placed in an episode.

## Data and preset rules

- The episode owns the complete rendered balloon properties. A placed balloon must not depend on a mutable built-in preset definition to reopen correctly.
- A built-in preset is an original ScrollSplice starting configuration. It materializes ordinary editable values when placed; it is not a locked commercial asset or copied third-party vector.
- Built-in preset IDs are stable for discovery and testing, but the preset name never determines rendering or meaning.
- Creator-saved presets belong at the application edge and may be included in portable projects. Saving one must not add provider, account, or asset-store fields to the episode model.
- Body/tail/joining extensions require an explicit versioned document decision when implementation starts. Existing format-v6 balloons must receive deterministic defaults and render unchanged.
- Captions and sound effects should use shared typography primitives but remain separate element kinds.
- Every document change must use pure commands and participate in undo/redo, save/reopen, recovery, portability, preview, and output parity.

## Recommended implementation order

### Slice 1 — Core editable preset foundation

Extend the existing atomic `SpeechBalloonElement` with data-driven body, outline, and tail kinds. Deliver **Standard**, **Rounded**, **Thought**, **Whisper**, **Shout**, **Electric**, **Rough**, **Wavy**, **Telepathic**, and **Double Outline** presets. Keep new balloon bodies empty and use the existing independent Text element for lettering.

### Slice 2 — Source direction and relationships

Add straight, spline, polyline, thought-dot, lightning, off-panel, squink, none, and multiple-tail editing. Then add flat direct-join and connector relationships, reading order, anchoring, and explicit unlink behavior.

### Slice 3 — Webtoon styling and creator presets

Add angular, dark/reverse, colored/translucent, decorative, freeform, and radiating-flash treatments; richer lettering modifiers; mobile readability checks; and creator-saved editable presets.

### Slice 4 — Related lettering tools

Add caption containers and a separately designed editable sound-effect system. These complete the lettering toolkit but are not disguised as speech balloons.

Each slice needs pure command tests, deterministic older-document defaults, persistence and portable-project round trips, canvas/minimap/preview/output parity, undo/redo coverage, and a phone-width visual review.

## Completion definition

The research catalog is implemented when a creator can reproduce every balloon, tail, relationship, and delivery treatment above from editable primitives; customize the result beyond its starting convention; save and reopen it without drift; and see matching output everywhere ScrollSplice renders the episode. A growing pile of fixed raster or SVG thumbnails does not satisfy this definition.
