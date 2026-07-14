# ScrollSplice OpenAI Build Week Compliance

This is ScrollSplice's working rule-to-evidence checklist. It was last cross-checked on **July 13, 2026** against the [OpenAI Build Week overview](https://openai.devpost.com/) and [Official Rules](https://openai.devpost.com/rules). The live rules, organizer notices, and Devpost submission form control if this file ever differs from them.

Checklist symbols:

- `[x]` evidence exists now
- `[ ]` required action or Katherine confirmation still pending
- `[—]` not applicable to the chosen submission

## Event clock

- Registration: July 9, 2026 at 10:00 AM PT through July 21, 2026 at 5:00 PM PT.
- Submission: July 13, 2026 at 9:00 AM PT through July 21, 2026 at 5:00 PM PT.
- Judging: July 22, 2026 at 10:00 AM PT through August 5, 2026 at 5:00 PM PT.
- Winners announced: on or around August 12, 2026 at 2:00 PM PT.
- ScrollSplice internal submission target: July 21 at 12:00 PM PT.

Do not rely on the internal target as an extension of the official deadline. After the submission period ends, the rules allow no submission changes or alterations except a narrow correction expressly permitted by Sponsor/Devpost for potentially infringing material, personal information, or other inappropriate material. The separate Devpost portfolio may still be updated, but that does not change the entered submission.

## 1. Entrant and registration confirmations

These are personal/legal confirmations that the repository cannot prove:

- [x] Katherine has clicked **Join Hackathon**, registered on Devpost, created the ScrollSplice project, and advanced its draft form to the video and later-evidence stage as of July 13.
- [ ] Katherine is at least the age of majority where she resides.
- [ ] Katherine resides in an [OpenAI-supported country or territory](https://platform.openai.com/docs/supported-countries) and is not in an excluded jurisdiction identified by the rules.
- [ ] Katherine is not an event judge; an employee, representative, or agent of a promotion entity; an ineligible family/household member; or otherwise subject to a real or apparent conflict described in the rules.
- [ ] Submit as an individual, or document the authorized representative if the entrant changes to a team or organization.
- [ ] Review the complete official rules personally before final submission; entering forms a contract with the sponsor and administrator.

The optional Devpost plugin is not required. If additional event credits are needed, the overview lists a July 17 at 12:00 PM PT request deadline; ordinary paid usage beyond granted credits remains Katherine's responsibility.

## 2. Project identity and category

- [x] Project name: **ScrollSplice**.
- [x] Planned category: **Apps for Your Life**, because this is a creativity tool for a real individual workflow.
- [x] Intended platform: desktop Chrome-class web browser.
- [x] Public repository: <https://github.com/techinevolution/scroll-splice>.
- [x] Relevant public license: `LICENSE` uses MIT for repository source and documentation.
- [ ] Confirm the final Devpost category remains Apps for Your Life before submission.

## 3. Pre-existing work boundary

The rules allow a pre-existing project only if it is meaningfully extended after the submission period starts; only the new work is judged, and the entrant must clearly distinguish prior work from new work.

- [x] Katherine identified the seven original documents as planning work completed July 12, before the submission period.
- [x] Those files were first committed unchanged on July 13 at 11:28:56 AM PT as root commit `e4db897`.
- [x] Annotated tag `pre-build-week-planning` was created on July 13 to mark that owner-attested no-code baseline.
- [x] The baseline contains only `AGENTS.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `PLAN.md`, `PROJECT_OUTLINE.md`, `README.md`, and `TODO.md`.
- [x] The baseline contains no application scaffold or product code.
- [x] Compliance and scope corrections were added in separate commit `a567865` on July 13 at 11:50:26 AM PT, after the 9:00 AM PT submission start; that commit also contains no application code.
- [x] Local Codex session `019f5921-6190-7520-ba51-f5e0897c5af9` supplies contemporaneous July 12 evidence: the session began at 6:41:50 PM PDT, the naming request appears at 6:46:56 PM, and the ScrollForge MVP-spec request appears at 7:03:03 PM. The Git timestamp still records preservation on July 13 rather than the original work time.
- [ ] Keep all judged implementation in later dated commits and do not rewrite the root commit or tag.
- [ ] In the final README and Devpost description, say plainly that July 12 produced planning only and identify the implementation completed July 13–21.
- [ ] Retain the primary Codex task/session record as further timestamped evidence.

## 4. Required Codex and GPT-5.6 use

The overview says to create a project using Codex with GPT-5.6. The rules also evaluate how thoroughly and skillfully the project uses Codex.

- [x] The local Codex configuration was checked on July 13 and named GPT-5.6 as the active model before implementation.
- [x] Use Codex with GPT-5.6 for the majority of ScrollSplice's core implementation in one identifiable primary task.
- [x] Keep dated commits showing meaningful implementation, testing, review, and decisions during the submission period.
- [x] Update README from actual evidence: how Katherine collaborated with Codex, where Codex accelerated work, Katherine's key product/engineering/design decisions, and how GPT-5.6/Codex affected the result.
- [x] Run `/feedback` in the primary task where the majority of core functionality was built.
- [x] Record that Codex Session ID here and in README.
- [ ] Enter the recorded Codex Session ID in the Devpost form before submission.

Codex `/feedback` Session ID: **`019f5921-6190-7520-ba51-f5e0897c5af9`**, returned after Katherine's July 13 hands-on walkthrough.

### Stage One ambiguity to manage

The project requirements and overview describe **building with Codex and GPT-5.6**, without separately stating that the finished product must call an OpenAI API at runtime. However, Stage One judging uses broader boilerplate about reasonably applying required APIs/SDKs featured in the event.

- [ ] Ask the hackathon manager for written clarification: does substantial Codex-with-GPT-5.6 development plus the required evidence satisfy this requirement for a consumer app, or is an in-product OpenAI API/SDK integration expected?
- [ ] If a response arrives, save it with the submission notes and revise scope only if the answer requires it.

This clarification reduces risk but is not a blocker if the organizer does not reply: the live project requirements expressly say to build with Codex and GPT-5.6 and do not separately state that the finished consumer app must call an OpenAI API. OpenAI-powered autonomous comic creation is now an intended ScrollSplice product direction, but it follows the human editor and must not become a decorative eligibility feature or a new submission dependency. If an in-product integration is required or attempted as stretch, Katherine must approve the scope change and the implementation must solve the real generate-and-place need described in `PLAN.md`.

### Optional OpenAI runtime stretch

These items apply only if the generate-and-place proof is actually attempted:

- [ ] The complete human editor, validation suite, public access, and submission evidence passed before runtime OpenAI work began.
- [ ] Katherine approved the network, privacy, credential, cost, and dependency boundary in writing in the project record.
- [ ] The base judge experience remains free and usable without OpenAI login, API credits, or model access.
- [ ] Only synthetic prompts and references are sent; no Root & Table production art or other private creative material is uploaded.
- [ ] No API key, OAuth token, reusable provider credential, or private response data appears in the browser bundle, repository, logs, screenshots, or video.
- [ ] Generated assets record provenance, and the demo distinguishes implemented behavior from the later full-autonomy vision.
- [ ] The integration follows current OpenAI terms, usage policies, model availability, and an officially supported authorization path.

## 5. Working-project requirements

- [x] The project installs from documented commands on its specified platform.
- [ ] The project runs consistently and matches the text description and video.
- [x] README contains verified setup, run, validation, supported-browser, and sample-data instructions.
- [x] The original **Signal in the Fog** sample is made from code-defined shapes and text, so judges do not need private assets.
- [ ] Typecheck, lint, unit tests, production build, and the Playwright smoke test pass from a clean checkout.
- [x] The running UI has been visually inspected at 1440 × 900, 1280 × 720, and 1024 × 768.
- [x] An isolated Playwright Chromium context can complete the defining story, including numbered-plane navigation, base-color changes, hidden-row selection, canvas/layers selection, movement, and reset.
- [x] The defining human editor story works with every optional OpenAI feature disabled or unavailable.

## 6. Free and unrestricted judge access

Rules require a website, functioning demo, or test build that is free and unrestricted through the end of judging.

- [ ] Preferred: publish the passing static build through GitHub Pages.
- [ ] Fallback: provide an unrestricted downloadable test build with exact launch steps.
- [ ] Put the working-access URL in README and the Devpost form.
- [ ] Test that URL from a signed-out/private browser session with no credentials, local files, private assets, or paid services.
- [ ] Keep the submitted working project free, unrestricted, and available until **August 5, 2026 at 5:00 PM PT**.

Working-access URL: **PENDING — the local application and production build exist; public deployment has not begun.**

## 7. Repository and technical evidence

- [x] Repository is public and currently accessible without an invitation.
- [x] Repository has relevant licensing.
- [x] `.gitignore` excludes local/private assets, secrets, generated output, and local reports.
- [x] `pnpm-lock.yaml` is included with the first approved implementation slice after resolving compatible stable dependencies on July 13.
- [x] The first implementation slice contains no secrets, tokens, credentials, private artwork, generated reports, or machine-local files.
- [ ] Every third-party package, API, SDK, font, icon, visual, and audio asset is authorized and its license/terms are followed.
- [x] Repository history remains dated and understandable through the testable-editor milestone; no baseline rewrite or misleading authorship/provenance.
- [ ] Final README contains repository URL, access URL, accurate current status, verified commands, sample-data explanation, Build Week boundary, and Codex/GPT-5.6 collaboration evidence.
- [x] README does not imply that autonomous generation exists.
- [ ] Final video must not imply that autonomous generation exists unless the submitted build demonstrates it.
- [ ] Use of OpenAI services complies with the [Terms of Use](https://openai.com/policies/terms-of-use/), [Business Terms](https://openai.com/policies/business-terms/) where applicable, [Service Credit Terms](https://openai.com/policies/service-credit-terms/), and [Usage Policies](https://openai.com/policies/usage-policies/).
- [ ] If event credits are used, record their source and monitor usage; the rules say event credits expire July 31, 2026.

## 8. Required Devpost submission fields

- [ ] Project name: ScrollSplice.
- [ ] Category: Apps for Your Life.
- [ ] English project description explaining features and functionality.
- [ ] Every submission material is in English or has a complete English translation, including video, description, testing instructions, and other submitted material.
- [ ] Public repository URL: <https://github.com/techinevolution/scroll-splice>.
- [ ] Working website/demo/test-build URL.
- [ ] Public YouTube demo URL.
- [ ] Codex `/feedback` Session ID from the primary core-functionality task: `019f5921-6190-7520-ba51-f5e0897c5af9` is ready to paste into Devpost.
- [ ] Testing instructions that identify a desktop Chrome-class browser and require no rebuilding, account, private data, or payment.
- [ ] Submit all required fields before July 21 at 5:00 PM PT.

## 9. Demonstration video

- [ ] Video is shorter than three minutes; target 2:30–2:45 to leave margin.
- [ ] Video is uploaded to YouTube and publicly visible.
- [ ] Video has clear English audio or complete English translation.
- [ ] Video shows the actual working project, not only slides or mockups.
- [ ] Audio explains what was built and how Codex and GPT-5.6 were used.
- [ ] Demonstration matches the submitted build and text description.
- [ ] Video contains no third-party trademark, copyrighted music, artwork, footage, personal data, or other material without permission.
- [ ] Crop or conceal browser/OS chrome, bookmarks, notifications, account details, and unapproved logos/trademarks in the screen recording.
- [ ] Use original narration and, safest, no background music.
- [ ] Verify playback while signed out and record the final URL.

Public YouTube URL: **PENDING.**

## 10. Ownership, privacy, and third parties

- [ ] The final submission is Katherine's original work and is solely owned by the entrant, subject only to properly licensed open-source components.
- [ ] It does not violate copyright, trademark, patent, contract, privacy, publicity, or other third-party rights.
- [ ] Root & Table production art and private creative material are absent unless Katherine separately gives explicit permission for specific files.
- [ ] Synthetic fixture content, screenshots, thumbnails, icons, fonts, narration, and any music have a documented safe provenance.
- [x] The exact AI-generated Devpost thumbnail is retained at `public/submission/devpost-thumbnail.png`; its purpose, dimensions, hash, and project-specific provenance are recorded in `public/submission/README.md`.
- [x] A basic public screen found material conflicts for **ScrollForge**, so that working name was retired.
- [x] Katherine delegated the replacement choice with the requirement that the final name contain “scroll”; Codex selected **ScrollSplice**.
- [x] A July 13 exact-name screen found no matching ScrollSplice software brand in general web search, GitHub repositories, npm, or PyPI.
- [ ] Treat the basic ScrollSplice screen as risk reduction, not legal trademark clearance; obtain additional review if Katherine needs legal certainty.
- [ ] Any third-party SDK, API, or data is used within its terms and license.
- [ ] The project has no malware or harmful/disablement code.
- [ ] Confirm the project is not disqualified by prohibited prior financial or preferential support from the sponsor/administrator or another conflict described in the official rules.
- [ ] Katherine acknowledges that submission grants the Sponsor a non-exclusive license to use the entry for judging.
- [ ] Katherine acknowledges that Sponsor/Devpost may promote the submission and use contributors' name, likeness, voice, and image in promotional material for three years, and that submission components may be displayed publicly.

### Name screen and clearance

The retired ScrollForge working name produced at least these existing exact or near-exact software/product uses:

- [RipSaw ScrollForge](https://forgepatterns.com/), an active scroll-saw/intarsia creative-design application.
- [Scroll Forge](https://addons.mozilla.org/firefox/addon/scroll-forge/), a Firefox scrolling extension.
- [ScrollForge](https://scroll-forge.vercel.app/upload), an open-source PDF converter web app.
- [`scrollforge`](https://www.npmjs.com/package/scrollforge), a programming framework package.

ScrollSplice was then screened as an exact term on July 13. No matching software brand appeared in general web search, GitHub repository names, npm, or PyPI. That substantially reduces the obvious collision risk but does not prove legal availability or trademark clearance.

## 11. Final submission lock

- [ ] Re-read the live overview, official rules, updates, FAQs, and Devpost form on July 20 or 21; record any changes.
- [ ] Complete a clean-clone validation and signed-out judge walkthrough.
- [ ] Confirm the repo, build, description, screenshots, and video all describe the same feature set.
- [ ] Confirm all links work and remain public.
- [ ] Confirm every checklist statement marked complete has evidence.
- [ ] Submit by the internal target of July 21 at 12:00 PM PT.
- [ ] Verify Devpost shows the intended submission as successfully entered before 5:00 PM PT.
- [ ] Record the final submitted URLs and timestamp.
- [ ] Create an annotated `build-week-submission` tag at the exact submitted commit and push it without moving it later.
- [ ] Do not substantively change the submitted Devpost entry after the official deadline unless the sponsor/administrator expressly permits a narrow correction.
- [ ] Keep all judge access available through August 5 at 5:00 PM PT.

## 12. Judging alignment

The four Stage Two criteria are equally weighted. The submission materials should make each case with working evidence:

- **Technological implementation:** dated Codex/GPT-5.6 collaboration, clean shared-state architecture, tested coordinate math, and a reliable non-trivial interaction.
- **Design:** one coherent, runnable editor story rather than a broad collection of partial controls.
- **Potential impact:** faster, clearer assembly and navigation of long vertical comics for a real creator workflow.
- **Quality of idea:** a scroll-native canvas/minimap/layers system distinct from adapting a page-oriented general image editor.

Stage One is pass/fail for baseline viability and event-tool fit. Resolve the API/SDK wording ambiguity above before submission rather than relying on an assumption.

## Evidence record

| Evidence | Value | Status |
| --- | --- | --- |
| Public repository | <https://github.com/techinevolution/scroll-splice> | Complete |
| Owner-attested pre-event baseline commit | `e4db897`, first committed July 13 at 11:28:56 AM PT | Complete |
| Baseline marker tag | `pre-build-week-planning`, created July 13 | Complete |
| Independent July 12 timestamped evidence | Codex session `019f5921-6190-7520-ba51-f5e0897c5af9`, 6:41:50–7:03:03 PM PDT | Complete |
| Project-name screen | ScrollForge retired; ScrollSplice exact-name screen found no matching software brand July 13 | Complete basic screen |
| Documentation/compliance commit | `a567865`, July 13 at 11:50:26 AM PT | Complete |
| Devpost registration/project draft | Created July 13; form advanced to video and later-evidence stage | Complete |
| Editor core commit | `c33b491`, coordinates, commands, shared state, and 15 passing unit tests | Complete |
| Testable editor commit | `05ac06b`, workspace, minimap, layers, navigation, selection, movement, reset, and smoke test | Complete |
| Composition groups checkpoint | `f02776f`, Background, Content, and Foreground filtering plus independent group/element visibility | Complete July 13 |
| Numbered layer-plane checkpoint | `c5f83c5`, format-v3 planes, pinned editable backdrop, three-level visibility, hidden-row selection, top-to-bottom rows, overflow navigation, and full-height inspector | Complete locally July 13; push pending |
| Local validation | Typecheck, lint, 38 unit tests, production build, three consecutive isolated Chromium walkthroughs on port `4174`, and visual inspection at 1440 × 900, 1280 × 720, and 1024 × 768 on July 13 | Complete |
| Progress screenshot | `docs/progress/2026-07-13-first-testable-editor.png`, captured by Katherine before composition groups | Complete |
| Composition progress screenshot | `docs/progress/2026-07-13-composition-groups-and-visibility.png`, 1440 × 900, SHA-256 `32ad4cf5dfa38826404703c3dc1bb2e66db2131b2e3085bb6c27db2631c95202` | Complete locally; push pending |
| Layer-plane progress screenshot | `docs/progress/2026-07-13-layer-planes-and-editable-backdrop.png`, 1440 × 900, SHA-256 `d9688284f870786821a7cdf9c25010a21dac0f5dec1ecdfaf83561bea2da6d76` | Complete locally; push pending |
| Devpost thumbnail | `public/submission/devpost-thumbnail.png`, 1536 × 1024 PNG with provenance record | Complete |
| WEBTOON Manage Episode discovery | Katherine's July 13 authenticated form transcription recorded in `WEBTOON_REQUIREMENTS.md` | Form contract recorded; upload behavior pending |
| Working project URL | Pending | Pending |
| Public YouTube URL | Pending | Pending |
| Primary `/feedback` Session ID | `019f5921-6190-7520-ba51-f5e0897c5af9` | Complete locally; Devpost entry pending |
| Devpost submission URL | Pending | Pending |
| Submitted commit/tag | Pending / `build-week-submission` | Pending |
| Final submission timestamp | Pending | Pending |
| Judge-access expiry | August 5, 2026 at 5:00 PM PT | Planned |
