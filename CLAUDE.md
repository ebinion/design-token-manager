# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The dev environment is **scaffolded**; Phase 1 feature work is in progress (target: internal beta in ~1 week). The repo is a **pnpm workspace** with the three-layer package split described below. Source folders are stubbed with wiring that proves the dev loop (custom editor + tree + webview render); the real DTCG model, resolver, editors, and color picker are the Phase 1 build.

### Build / test / run

Requires Node ≥20 and pnpm (via `corepack enable`).

- `pnpm install` — install all workspace packages.
- `pnpm build` — bundle webview then extension into `packages/extension/dist/` (esbuild).
- `pnpm watch` — rebuild webview + extension on change (used by the F5 debug task).
- `pnpm test` — run the `@dtm/core` Vitest suite (no Extension Host; AC-11).
- `pnpm typecheck` — `tsc --noEmit` across packages.
- `pnpm lint` — ESLint, incl. the core import-boundary rule (no `vscode` in `core/`).
- `pnpm package` — build + `vsce package --no-dependencies` → a `.vsix` (no Marketplace).
- **Debug:** press **F5** (the "Run Extension" launch config) to open the Extension Development Host on `fixtures/`.

Test token files live in [fixtures/](fixtures/) — a Token Studio multi-file set (`$metadata.json` `tokenSetOrder`, `$themes.json`, `reference/` + `theme/` files) intentionally loose-typed to exercise normalization, cross-file aliases, and unknown-type passthrough.

### Where things live (read these before coding)

- [specs/high-level-product-requirements.md](specs/high-level-product-requirements.md) — the authoritative **product vision** across all phases (the pitch, problem, full feature set).
- [specs/prd-phase-1.md](specs/prd-phase-1.md) — the **Phase 1 PRD** (Foundations). Now a complete spec, not a placeholder: scope, functional requirements (FR-*), technical design, build plan, and acceptance criteria (AC-*). This is the contract for the first build — start here.
- [specs/references/dtcg-spec-cheat-sheet.md](specs/references/dtcg-spec-cheat-sheet.md) — DTCG `2025.10` (first stable release) format reference: token/group shapes, `$`-properties, aliases, `$ref`, `$extends`. The wire format, not the in-memory model.
- [specs/references/vs-code-extension-authoring.md](specs/references/vs-code-extension-authoring.md) — VS Code extension research: Custom Text Editor, webview, contribution points, `yo code`, packaging.
- [design/README.md](design/README.md) — **visual design guidelines** binding on all mockups/UI: the extension must look like a first-party VS Code panel (style against `var(--vscode-*)`, Codicons, density over decoration — no custom brand palette/fonts). [design/phase-1/](design/phase-1/) tracks the mockups Phase 1 needs.

### Phase 1 package layering (per the PRD's technical design)

When scaffolding, structure the code as three layers — this operationalizes the editor-agnostic-core constraint below:

- `core/` — plain TypeScript, **zero `vscode` imports**: DTCG parse, internal model, deterministic serializer/formatter, alias resolution + cycle detection, color value handling. Unit-tested without the Extension Host (AC-11).
- `extension/` — thin VS Code adapter: `activate()`, Custom Text Editor provider, tree provider, webview host, file/watch I/O, message routing.
- `webview/` — the GUI (bundled JS/CSS, theme-variable styling; no deprecated Webview UI Toolkit).

## What this is

**Design Token Manager** is a **VS Code extension** that lets designers manage design tokens directly in a repo, replacing the Figma + Token Studio workflow. It reads/writes standard token files and presents them through a visual GUI panel, keeping the underlying files human-readable and git-friendly.

It is an **internal tool for CoupleFi** (the pilot design system), not a public VS Code Marketplace product.

## Architecture constraints (these shape every decision)

- **Storage format is W3C DTCG JSON.** Tokens are stored as standard Design Tokens Community Group files in the user's repo. Build on the open standard rather than a proprietary format; this gives interop with Style Dictionary et al. Abstract storage behind an internal model so DTCG spec churn doesn't ripple through the codebase.
- **Git is the collaboration layer.** No hosted backend, no sync server. All edits are plain file changes — diffable, reviewable, revertable in PRs. Designers are guided through commit/branch/PR flows inside the extension with git jargon hidden.
- **Files stay human-readable and git-friendly.** The GUI is a view over the files; round-tripping must produce clean, minimal diffs.
- **Editor-agnostic core.** VS Code is the host, but keep core token logic (parsing, model, references, color, a11y) decoupled from the VS Code extension API so it could move hosts later.

## Domain concepts to know before coding

- **Token types in scope (v1):** color, typography, spacing, sizing, radius, shadow, and reference/alias tokens.
- **References & aliasing:** semantic → primitive token linking is first-class and **requires cycle detection**.
- **Modern color:** the color picker authors in **OKLCH / Display-P3** (Huetone-style perceptual editing) with **auto-generated, override-able hex/sRGB fallbacks**. Sensible auto-defaults that the designer can override are the design principle.
- **Accessibility scoring:** inline **WCAG 2.x / APCA** contrast checks and color-vision-deficiency checks happen *at author time*, as colors are picked — not as a separate late step.
- **Live impact visualization:** editing a token shows the blast radius (which components/previews use it) in real time.
- **Theming & modes:** light/dark and brand/mode variants are managed side-by-side without duplication.

## Explicitly out of scope (v1)

Do not build toward: a Figma replacement for layout/vector design, a public Marketplace launch, a hosted collaboration backend, auto-generating production component code from tokens, or non-VS Code IDE support. Optional Figma sync is a possible Phase 4 fast-follow, not v1.
