# WEBTOON Requirements and Discovery

This file separates confirmed current WEBTOON guidance from older or still-unverified upload limits. It was last reviewed on **July 13, 2026**. WEBTOON can change creator requirements without changing ScrollForge, so live platform evidence must win over this record.

ScrollForge's goal is to prepare files that a creator can upload manually. It will not automate WEBTOON login, upload, scheduling, or publishing.

## Confirmed current workflow

- Publishing is performed from the WEBTOON website rather than the mobile app. The April 2026 Creator Dashboard is desktop-only. Sources: [How to Publish on WEBTOON](https://webtooncanvas.zendesk.com/hc/en-us/articles/18556588863380-How-to-Publish-on-WEBTOON) and [CANVAS Creator Dashboard FAQ](https://webtooncanvas.zendesk.com/hc/en-us/articles/48452348349332-CANVAS-Creator-Dashboard-FAQ).
- An episode can be saved as a draft and resumed later. Source: [How do I save a draft?](https://webtooncanvas.zendesk.com/hc/en-us/articles/18556523173652-How-do-I-save-a-draft).
- WEBTOON provides PC and mobile episode previews before publishing. Its guidance calls out formatting, font legibility, opacity/ghost lines, panel order, gutter pacing, and fuzziness. ScrollForge should additionally recommend checking cropping and seams. Source: [Preview Episodes Before Publishing](https://webtooncanvas.zendesk.com/hc/en-us/articles/42850360989076-Preview-Episodes-Before-Publishing).
- Episodes can be scheduled through the website workflow. Source: [How to Schedule Your Episodes](https://webtooncanvas.zendesk.com/hc/en-us/articles/42851069168148-How-to-Schedule-Your-Episodes).
- Static episode images are the relevant CANVAS output; music, animation, and special effects are reserved for WEBTOON ORIGINALS. Source: [How do I put music/GIF animations into my series?](https://webtooncanvas.zendesk.com/hc/en-us/articles/18556594573076-How-do-I-put-music-gif-animations-into-my-series).
- CANVAS series require a content rating; the current rating update became mandatory June 1, 2026. Source: [WEBTOON CANVAS Content Rating Updates](https://webtooncanvas.zendesk.com/hc/en-us/articles/48337973227412-WEBTOON-CANVAS-Content-Rating-Updates).
- Creators can request pre-publication content review and should ordinarily allow two to three business days. Source: [How to request a Content Review](https://webtooncanvas.zendesk.com/hc/en-us/articles/42977173469972-How-to-request-a-Content-Review-before-publishing-your-new-episodes).
- Creators remain responsible for current platform and content rules. Source: [WEBTOON CANVAS Policy](https://www.webtoons.com/en/terms/canvasPolicy).

ScrollForge may later show workflow reminders and preflight warnings. It must not claim that a comic is policy-compliant or choose a content rating for the creator.

## Confirmed current thumbnail requirements

The current thumbnail guidance, updated March 18, 2026, lists:

| Use | Dimensions | File limit | Formats | Notes |
| --- | ---: | ---: | --- | --- |
| Square series thumbnail | 1080 × 1080 px | Under 500 KB | JPG, JPEG, PNG | Required series art |
| Vertical series thumbnail | 1080 × 1920 px | Under 700 KB | JPG, JPEG, PNG | Required vertical series art |
| Episode thumbnail | 202 × 142 px recommended | Under 500 KB | JPG, JPEG, PNG | Filename should use English letters and numbers only |

Source: [Designing Your Series & Episode Thumbnails](https://webtooncanvas.zendesk.com/hc/en-us/articles/32913712749588-Designing-Your-Series-Episode-Thumbnails-Sizes-Guidelines-and-Help).

Thumbnail generation is a separate future workflow from slicing episode art. It is not part of the Build Week MVP.

## Episode-image constraints: provisional, not production-ready

Older official WEBTOON guidance describes these episode upload constraints:

- JPG/JPEG/PNG images
- up to 800 × 1280 px per image to avoid platform optimization/slicing
- 2 MB per image
- 100 images per episode
- 20 MB total per episode
- oversized images may be automatically optimized or sliced

Sources:

- [Before You Publish Checklist 2024 (official PDF)](https://webtoons-static.pstatic.net/creator101/en/pdf/Before-You-Publish-Checklist-2024.pdf?dt=2024011001)
- [WEBTOON CANVAS notice on image optimization](https://www.webtoons.com/en/notice/detail?noticeNo=1766)

These sources are useful starting evidence but are not a complete, current 2026 upload contract. In particular, public references conflict about the current total episode size, and the unauthenticated help material does not expose every upload behavior. Do not represent `20 MB` or any reported `50 MB` value as confirmed-current until the live test below is recorded.

No current official requirement was found for DPI, bit depth, ICC profile or color space, PNG alpha behavior, or JPEG quality. Do not present a conventional graphics setting as a WEBTOON rule without current evidence.

For now, `800` logical units is a useful episode width and `800 × 1280`, 2 MB, 100 files, and 20 MB are conservative provisional profile values—not guarantees of acceptance and not permanent editor constants.

## Required authenticated discovery test

Complete this before approving production WEBTOON export. Use a harmless original synthetic test series/episode, keep it unpublished, and never automate the login or upload.

Record the date, browser, account context, observed UI text, screenshots that contain no personal data, test files, and result for each item:

- [ ] Where the episode editor accepts images and whether mobile upload exists or website-only remains enforced.
- [ ] Accepted MIME types and extensions, including whether PNG transparency is preserved.
- [ ] Observed treatment of DPI metadata, bit depth, ICC profile/color space, and JPEG quality; distinguish recommendations from platform-enforced rules.
- [ ] Maximum width and height that are accepted without automatic resize, compression, or slicing.
- [ ] Per-image file-size limit and whether the boundary is strict.
- [ ] Total episode byte limit: confirm the current value rather than assuming 20 MB or 50 MB.
- [ ] Maximum image count and whether thumbnails or other episode assets count toward it.
- [ ] Filename restrictions, normalization, and whether zero-padded names preserve ordering.
- [ ] Multi-file selection behavior and whether upload order follows selection, filename, or manual ordering.
- [ ] Whether folder or ZIP upload is supported; do not design packaging around it until observed.
- [ ] Reordering, deletion, and replacement behavior after upload.
- [ ] Exact behavior for an image taller than the accepted limit: rejection, resize, compression, or platform slicing.
- [ ] PC and mobile preview accuracy for seams, gutters, text size, color, transparency, and image order.
- [ ] Draft saving and reopening without publishing.
- [ ] Any accessibility, rating, scheduling, or metadata fields that affect the pre-publish checklist.

Do not publish the test episode. Delete or retain the unpublished draft according to Katherine's direction after its evidence has been generalized into this document.

## Future `ExportProfile` contract

WEBTOON must be represented as versioned data at the export boundary, not as constants embedded in the episode model. A future profile should be able to express:

- profile ID, human-readable name, source links, and verification date
- accepted formats and any verified extension/filename rules
- target width and maximum slice height
- maximum encoded bytes per image
- maximum total encoded bytes
- maximum image count
- alpha/color-handling expectations
- whether limits are hard rejection limits or thresholds that trigger optimization
- thumbnail profiles kept separate from episode slices

Unknown values must remain visibly unknown. The exporter should refuse a “verified WEBTOON package” claim when the profile is stale or incomplete; it may still offer a clearly labeled provisional export.

## Future export behavior

The simplest dependable pipeline is:

1. Render a non-destructive tall master from the logical episode.
2. Plan slices within the selected verified profile.
3. Prefer slice boundaries in visual gutters so important art and text are not split.
4. Encode and measure each file; adjust only through documented quality rules.
5. Give slices a conservative ScrollForge zero-padded alphanumeric basename, such as `episode01001.jpg`; treat this as an ordering convention until live testing confirms episode-image filename rules.
6. Preflight dimensions, format, per-file bytes, total bytes, count, and sequence.
7. Write a manifest containing profile version and verification date.
8. Ask the creator to upload manually, inspect PC/mobile preview, set the content rating, and publish or schedule on WEBTOON.

Export must never overwrite source art. A passing ScrollForge preflight means the files match the recorded profile; it does not guarantee WEBTOON policy approval or replace the creator's preview and content review.

## Build Week boundary

Build Week can demonstrate the episode model and editor interaction without production export. The discovery file itself is enough for the one-week scope. Do not spend Build Week implementing slicing, thumbnails, WEBTOON metadata, login, or upload unless Katherine explicitly changes the approved milestone after the core submission is already safe.
