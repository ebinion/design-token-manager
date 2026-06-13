# Phase 1 — UI Mockups Needed

Derived from [prd-phase-1.md](../../specs/prd-phase-1.md) §5.2–5.5. Each item links to the
functional requirement(s) that demand it. Priority order reflects §7's cut list: the custom
editor and color editing are non-negotiable; composite editors are the first to drop if the
week slips.

> **Visual style for every mockup below is governed by the shared
> [Visual Design Guidelines](../README.md).** Read those first; this file only enumerates _what_
> to mock, not _how_ it should look.

## Core surfaces (must mock)

### 1. Custom Text Editor — token document GUI (FR-2.2)

The centerpiece: the webview that renders a `.tokens.json` file as editable GUI instead of raw
JSON. Needs:

- Overall layout — `groups → tokens` hierarchy with per-token rows
- The five **per-type token editors** (each renders differently):
  - Color — swatch + value
  - Dimension — value + unit selector
  - Number — numeric entry
  - Font-family — string / font-stack entry
  - Font-weight — numeric or keyword entry
- **Alias / reference token** display — showing the `{group.token}` link _and its resolved
  value_ (FR-1.3, AC-7)
- **Composite editors** — typography and shadow (single + layered) (§4)
- Token `$description` display / edit
- **Read-only unknown token** rendering — preserved, shown, not editable (AC-3)

### 2. Token Browser — Tree View (FR-3.1–3.5)

Activity Bar container + sidebar tree showing **set → files → groups → tokens** with type icons.

- Populated tree — multi-file set ordered by `tokenSetOrder`
- Type icons per token type
- Title / context menu actions — create token, create group, delete, refresh (FR-3.3)
- **Empty state** — `viewsWelcome` with a "Create your first token file" CTA (FR-3.4)

### 3. Color Picker (FR-4.1–4.2)

Basic sRGB/HSV visual picker + hex text entry. Phase 1 is sRGB/hex only (no OKLCH/P3 — that's
Phase 2), so the mockup reflects the simpler version but the contract is built to be swapped in
Phase 2 (FR-4.3).

## Interaction / state mockups

### 4. Inline validation states (FR-2.7, AC-5)

How errors surface in the GUI: invalid color, dangling alias, duplicate token name, and the
**cycle-detection rejection** — AC-5 requires a clear, _non-technical_ error with no file write.

### 5. Create / rename flows (FR-2.3, FR-3.3)

Creating a token (with a type picker), creating a group, renaming.

### 6. Theme variants (FR-2.6, AC-10)

The key screens shown in **light, dark, and high-contrast**. Not new layouts, but `var(--vscode-*)`
theming is an acceptance gate, so the primary surfaces should be shown in each theme.

## Explicitly NOT needed (no custom UI)

- **Git / PR flow** — delegated to VS Code's built-in Source Control view (FR-5.1, non-goal).
- **Save / dirty / undo-redo** — owned by VS Code (AC-9).
- **Multi-mode / side-by-side theming authoring** — Phase 3 non-goal; modes are just separate
  files in Phase 1.

## Suggested mocking order

1. Custom editor layout + the 5 primitive type editors — this is the product.
2. Alias token display with resolved value — trickiest interaction, a P1 differentiator.
3. Tree view (populated + empty state).
4. Color picker.
5. Validation / error states (esp. cycle rejection).
6. Composite typography / shadow editors — lowest priority; §7 flags these as the first cut.
