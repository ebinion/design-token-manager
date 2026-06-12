# Design Token Manager — Product Requirements (High-Level)

**A VS Code extension that lets designers manage design tokens directly in the repo, with built-in visualization and accessibility guardrails.**

_Status: Pitch / pre-funding · Owner: Zeke Binion · Pilot: CoupleFi · Last updated: 2026-06-12_

---

## The Pitch (TL;DR)

Design tokens are the source of truth for a product's visual language, but today they live in **Figma + Token Studio**, disconnected from the code that actually ships. The result: a brittle, manual sync between design and engineering, tokens edited blind to their downstream impact, and accessibility checked late (if at all).

**Design Token Manager** moves token authoring into the repo — where engineering already lives — and gives designers a friendly GUI that makes the _right_ choice the _easy_ choice: modern color spaces with automatic fallbacks, live impact previews, and inline accessibility scoring.

> One source of truth. No export step. Designers and engineers editing the same files.

---

## The Problem

- **Two sources of truth.** Tokens live in Figma; the build consumes JSON/CSS. Keeping them in sync is manual, error-prone, and a recurring source of "it looked right in Figma" bugs.
- **Editing blind.** Changing a core token (e.g. a brand hue, a spacing ramp) silently cascades across hundreds of components. Designers can't see the blast radius until it ships.
- **Accessibility is an afterthought.** Contrast and color-vision checks happen in separate tools, late in the process, when fixes are expensive.
- **Tooling tax.** Token Studio + Figma seats, plugin licensing, and the export/import dance add cost and friction for every design-system change.
- **Modern color is hard.** OKLCH / Display-P3 unlock better, more perceptually-even palettes — but the tooling to author them safely (with sRGB fallbacks) isn't in designers' hands.

## The Opportunity

- Design systems are now a board-level investment; the tooling around them hasn't caught up to "design-in-repo."
- VS Code is the universal substrate — free, ubiquitous, and where the code already is.
- W3C **Design Tokens Format Module** is stabilizing, giving us an open standard to build on rather than a proprietary lock-in.
- Being early to first-class OKLCH/P3 authoring is a genuine differentiator.

---

## What It Is

A VS Code extension that reads and writes standard design-token files (W3C DTCG JSON) in the user's repo, presenting them through a visual GUI instead of raw text — while keeping the underlying files human-readable and git-friendly.

### Core Features

| Feature                         | What it does                                                                                                  | Why it matters                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Token GUI editor**            | Browse, create, edit, and organize tokens (color, type, spacing, radius, shadow, etc.) in a visual panel      | Designers work without touching JSON               |
| **Advanced color picker**       | Huetone-style perceptual editing in OKLCH / Display-P3, with auto-generated, override-able hex/sRGB fallbacks | Modern color, safely, in designers' hands          |
| **Live impact visualization**   | See every component/preview that uses a token update in real time as you edit                                 | Edit with eyes open, not blind                     |
| **Accessibility scoring**       | Inline WCAG 2.x / APCA contrast and color-vision-deficiency checks as you pick colors                         | Make the accessible choice the default choice      |
| **Token references & aliasing** | First-class semantic → primitive token linking with cycle detection                                           | Maintainable, scalable token architecture          |
| **Git-native workflow**         | Edits are plain file changes — diffable, reviewable, revertable in PRs                                        | Designers participate in the existing eng workflow |
| **Theming & modes**             | Manage light/dark and brand/mode variants side-by-side                                                        | Multi-theme systems without duplication            |

### Explicitly In Scope (v1)

- Standards-based token files (W3C DTCG JSON) as the storage format.
- Color, typography, spacing, sizing, radius, shadow, and reference token types.
- The visual editor, color tooling, accessibility checks, and live preview.

### Explicitly Out of Scope (v1)

- A full Figma replacement for _layout/component design_ — we replace **token management**, not vector editing.
- **Public VS Code Marketplace launch.** This is an internal tool for CoupleFi; broad distribution is not a goal.
- Cross-org collaboration server / hosted backend — git is the collaboration layer.
- Auto-generating production component code from tokens.
- Non-VS Code IDEs.

---

## Why Now / Why Us

- **Designers are moving closer to code.** "Design engineering" is a real, growing discipline; this meets it where it's heading.
- **Open standard exists.** We build on DTCG instead of reinventing a format — lower risk, instant interop with Style Dictionary and friends.
- **The accessibility mandate is real.** Regulatory and brand pressure (e.g. EAA) makes built-in a11y a buying trigger, not a nice-to-have.

---

## Key Trade-offs & Decisions

- **In-repo, git-based — not a hosted app.** ✅ Zero infra, fits eng workflow, lives alongside the CoupleFi codebase. ⚠️ Asks designers to adopt git basics; we mitigate with a guided, low-friction commit/PR flow inside the extension.
- **VS Code as the host.** ✅ Already CoupleFi's editor, rich extension API, no new tool to roll out. ⚠️ Ties us to one editor; acceptable since CoupleFi standardizes on VS Code, and the core logic stays editor-agnostic if that ever changes.
- **Standards-based format (DTCG).** ✅ Interoperable, future-proof, no lock-in. ⚠️ Spec is still evolving; we may lead the spec in places and absorb churn.
- **Complement, don't fully replace Figma.** ✅ Realistic v1 scope, clear wedge. ⚠️ Designers keep Figma for layout — we must nail the token handoff so the boundary feels seamless (optional Figma sync is a likely fast-follow).
- **Modern color spaces (OKLCH/P3) with fallbacks.** ✅ Best-in-class output and differentiation. ⚠️ Added complexity in the picker and rendering; managed by sensible auto-defaults the designer can override.

---

## Success Metrics

- **Adoption:** weekly active design + eng users on the CoupleFi team.
- **Workflow shift:** % of CoupleFi token changes that ship via the extension vs. manual JSON / Figma export.
- **Quality:** reduction in design↔code sync defects; share of tokens passing a11y thresholds at author time.
- **Velocity:** time from "decide a token change" to "merged in repo."

## Risks & Mitigations

| Risk                               | Mitigation                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| Designers resist git               | Guided in-extension commit/branch/PR flow; hide git jargon                       |
| DTCG spec churn                    | Abstract storage behind an internal model; track spec actively                   |
| "Just use Token Studio" inertia    | Lead on impact visualization + a11y — the things competitors lack                |
| Live preview fidelity vs. real app | Start with token-level previews; integrate real component previews incrementally |

---

## Phasing (Indicative)

- **Phase 1 — Foundations (1 week):** read/write DTCG files, token GUI, basic color picker, git-friendly diffs.
- **Phase 2 — Differentiators (4 weeks):** OKLCH/P3 + fallbacks (Huetone-style), inline accessibility scoring.
- **Phase 3 — Impact:** live impact visualization and component previews; theming/modes.
- **Phase 4 — Fit & polish:** optional Figma sync and CoupleFi-specific workflow refinements based on pilot feedback.

---

## The Ask

Funding to build a Phase 1–2 MVP and validate it on the **CoupleFi** design system as the pilot — measuring adoption by CoupleFi's design + eng team. Target: a Phase 1 internal beta in **1 week**, with the full Phase 1–2 differentiators landing ~**4 weeks** after that (~5 weeks total). No public Marketplace launch is planned; success is judged on CoupleFi outcomes, with reuse on other internal products as a possible later step.
