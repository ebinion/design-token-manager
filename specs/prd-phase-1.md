# Design Token Manager — Phase 1 PRD: Foundations

**Read/write DTCG token files through a git-friendly GUI in VS Code.**

_Status: Draft · Owner: Zeke Binion · Pilot: CoupleFi · Target: internal beta in ~1 week · Last updated: 2026-06-12_

Parent spec: [high-level-product-requirements.md](high-level-product-requirements.md) · Tech research: [references/vs-code-extension-authoring.md](references/vs-code-extension-authoring.md)

---

## 1. Purpose & framing

Phase 1 builds the **foundation everything else stands on**: a VS Code extension that reads and writes W3C DTCG token files, presents them in a visual GUI instead of raw JSON, and round-trips them back to disk with **clean, minimal git diffs**. It deliberately ships the _plumbing_ — the storage model, the editor surface, the tree browser, a basic color picker — and defers the differentiators (OKLCH/P3 authoring, accessibility scoring, live impact visualization, theming) to Phases 2–3.

The bet for Phase 1: prove a designer can open the CoupleFi token files in VS Code, browse and edit tokens visually, save, and produce a PR diff an engineer would happily review — **without ever hand-editing JSON**.

### What "done" looks like

A CoupleFi designer can:

1. Open a `*.tokens.json` file and see it rendered as an editable GUI (not text).
2. Browse all token files/groups/tokens in a dedicated sidebar tree.
3. Create, rename, edit, and delete the in-scope token types — color, dimension, number, font-family, font-weight, alias (and composite typography/shadow where present) — per §4.
4. Pick colors with a basic visual picker (sRGB/hex).
5. Save, and see a **minimal, readable git diff** containing only what they actually changed.

---

## 2. Goals & non-goals

### Goals

- **G1.** Faithful round-trip read/write of DTCG JSON via an editor-agnostic core model.
- **G2.** A GUI editor surface (Custom Text Editor) that fully replaces hand-editing for in-scope token types.
- **G3.** A token browser (tree view) for navigating files, groups, and tokens.
- **G4.** A basic color picker (sRGB/hex) wired into the editor.
- **G5.** Minimal, deterministic diffs — editing one token changes one span, not the whole file.
- **G6.** Editor-agnostic core: zero `vscode` imports in the token/model/parse/reference layer.

### Non-goals (Phase 1)

- OKLCH / Display-P3 authoring and auto fallbacks → **Phase 2**.
- Inline WCAG 2.x / APCA accessibility & CVD scoring → **Phase 2**.
- Live impact visualization / component previews → **Phase 3**.
- Side-by-side theming & light/dark mode management UI → **Phase 3** (Phase 1 _reads/preserves_ existing modes but offers no dedicated multi-mode authoring UI).
- Guided in-extension commit/branch/PR flow → **later** (Phase 1 relies on VS Code's built-in Git UI; our contribution is clean diffs, not a custom git wizard).
- Optional Figma sync → **Phase 4**.
- Public Marketplace launch → never (internal CoupleFi tool).

---

## 3. Users

- **Primary: CoupleFi designers** — comfortable in Figma/Token Studio, _not_ fluent in JSON or git. Need a GUI that hides the file format and an opt-in path so JSON never gets in their face.
- **Secondary: CoupleFi engineers** — already in VS Code and git. Need diffs that are clean enough to review in a PR and files that stay human-readable in raw text.

---

## 4. Scope — token types & DTCG coverage

In scope for the Phase 1 model and editor:

| Type                                              | DTCG `$type`                     | Phase 1 editing support                                                                                         |
| ------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Color                                             | `color`                          | Full — via basic sRGB/hex picker + text entry                                                                  |
| Dimension (spacing / sizing / radius / font-size) | `dimension`                      | Full — value + unit                                                                                            |
| Number                                            | `number`                         | Full — numeric entry (unitless values, e.g. CoupleFi's pre-migration sizes)                                    |
| Font family                                       | `fontFamily`                     | Full — string / font-stack entry                                                                              |
| Font weight                                       | `fontWeight`                     | Full — numeric or keyword entry                                                                                |
| Reference / alias                                 | (any, via `{group.token}` alias) | Create/edit aliases, resolve, **cycle detection**                                                              |
| Typography (composite)                            | `typography`                     | Composite editor — **supported if present**; CoupleFi decomposes into primitives, so not expected in the pilot |
| Shadow (composite)                                | `shadow`                         | Composite editor (single + layered) — **supported if present**; not in the pilot data                          |

The **primitive** types dominate the CoupleFi pilot data (`fontFamily`, `fontWeight`, `number`/`dimension`); the composite `typography`/`shadow` editors are built for completeness but may not be exercised by the pilot. See §6's normalization note for how CoupleFi's loose `text`/`number` types map onto `fontFamily`/`fontWeight`/`dimension`.

Cross-cutting DTCG handling: `$value`, `$type`, `$description`, `$extensions` (preserved verbatim, even when we don't render them), nested groups, and `$type` inheritance from group level. Unknown/out-of-scope token types are **displayed read-only and preserved on save** — never dropped or corrupted.

> **Decision:** alias support lands in Phase 1, not later. Resolving aliases and detecting cycles is part of _correctly reading_ a DTCG file — the model can't be trusted without it. The rich reference-authoring UX (visual link picker, blast-radius view) is what's deferred.

---

## 5. Functional requirements

### 5.1 DTCG storage model & I/O (the core)

- **FR-1.1** Parse DTCG JSON into an internal model abstracted from the on-disk spec (per CLAUDE.md DTCG-churn constraint). The rest of the codebase talks to the model, never to raw JSON shapes.
- **FR-1.2** Serialize the model back to JSON with a **stable, deterministic formatter**: preserved key order, consistent indentation, preserved `$extensions` and unknown fields. Round-tripping an unchanged file produces a byte-identical (or whitespace-only) result.
- **FR-1.2a** **Normalization is display/resolution-only and must not leak into output.** The model retains each token's **original on-disk `$type` and value form** and writes them back unchanged. Type normalization (§6) affects how tokens are interpreted, resolved, and shown in the GUI — it does **not** rewrite `$type` or value form on save. An open-and-save with no user edits must not change any token's type or value (this is what makes FR-1.2 / AC-4 hold for CoupleFi's loose-typed files). A token's on-disk `$type` changes **only** when the user explicitly remaps it (the migration pass).
- **FR-1.3** Resolve alias references (`{color.brand.primary}` style) to their targets and expose resolved values to the GUI. Resolution **spans the whole token set, not just the open file** — a reference in one file (e.g. `theme/light.tokens.json`) may target a token in another (e.g. `reference/default.tokens.json`), and is resolved honoring set precedence (see FR-1.7). Cycle detection (FR-1.4) likewise operates across the set.
- **FR-1.4** **Cycle detection** — adding/editing an alias that would create a reference cycle is rejected with a clear error before write.
- **FR-1.5** File I/O via `vscode.workspace.fs` (host-agnostic); discover token files with `vscode.workspace.findFiles`; watch for external/PR edits with a `FileSystemWatcher` and reconcile into the open GUI.
- **FR-1.6** Token file detection by glob, **standardized on `**/*.tokens.json`** (overridable via a setting, but `.tokens.json` is the convention). CoupleFi renames its files to this convention as part of the DTCG migration (`reference/default.json` → `reference/default.tokens.json`, `theme/light.json` → `theme/light.tokens.json`, etc.). The Token Studio `tokenSetOrder` set names (`reference/default`, `theme/light`) are unaffected by the rename.
- **FR-1.7** **Token-set awareness (multi-file).** Recognize a multi-file token set and its file ordering/precedence — for CoupleFi, a **Token Studio** set defined by `$metadata.json` `tokenSetOrder` (e.g. `reference/default → theme/light → theme/dark`). The model loads the set as a unit so cross-file resolution (FR-1.3) is correct. The Token Studio sidecars `$metadata.json` and `$themes.json` are **not DTCG** and must be **preserved untouched** on save (passthrough, like `$extensions`) — never rewritten or dropped.

### 5.2 Token GUI editor (Custom Text Editor)

- **FR-2.1** Register a `CustomTextEditorProvider` (viewType e.g. `dtm.tokenEditor`) bound to the token-file glob, with `priority: "option"` so designers opt into the GUI and the file remains openable as plain text.
- **FR-2.2** Render the token document as an editable webview GUI: groups, tokens, per-type editors (color, dimension, typography, shadow, alias), descriptions.
- **FR-2.3** Create, edit, rename, and delete tokens and groups from the GUI.
- **FR-2.4** **Webview ↔ document sync:** GUI edits produce a _minimal_ `WorkspaceEdit` (only the changed span) applied via `vscode.workspace.applyEdit`; document changes (undo/redo, external/PR edits) flow back via `onDidChangeTextDocument` → `postMessage` to refresh the webview. VS Code owns save, dirty state, undo/redo, and backups.
- **FR-2.5** Webview security per VS Code guidance: strict CSP, nonce'd scripts, no inline script, assets via `asWebviewUri` with `localResourceRoots`.
- **FR-2.6** Theme-aware UI using `var(--vscode-*)` variables; usable in light, dark, and high-contrast themes.
- **FR-2.7** Validation surfaced inline (invalid color, dangling alias, cycle, duplicate token name) before write.

### 5.3 Token browser (Tree View)

- **FR-3.1** Dedicated Activity Bar container (`contributes.viewsContainers`) with a tree view (`TreeDataProvider`) presenting the **token set** (set → files → groups → tokens), not isolated files — reflecting the multi-file structure and ordering from FR-1.7.
- **FR-3.2** Tree items show type icon + name; selecting a token opens/focuses it in the Custom Text Editor.
- **FR-3.3** Title/context actions (`contributes.menus`) for create token, create group, delete, refresh.
- **FR-3.4** `viewsWelcome` empty state with a "Create your first token file" CTA.
- **FR-3.5** Tree refreshes on document and file-system change (`onDidChangeTreeData`).

### 5.4 Basic color picker

- **FR-4.1** A visual sRGB/hex color picker (hue/saturation/value or equivalent) for editing `color` tokens, plus direct hex text entry.
- **FR-4.2** Writes back a valid DTCG color `$value` (hex/sRGB form acceptable for Phase 1).
- **FR-4.3** Architected so the Phase 2 OKLCH/P3 + fallback engine can replace the internals without changing the editor contract. (No OKLCH/P3 authoring in Phase 1.)

### 5.5 Git-friendly output

- **FR-5.1** Edits land as plain file changes reviewable in VS Code's built-in Source Control view and in PRs — no custom git wizard in Phase 1.
- **FR-5.2** Minimal diffs are a hard acceptance gate: changing one token's value yields a diff touching only that token's line(s).

---

## 6. Technical design (Phase 1)

Grounded in [references/vs-code-extension-authoring.md](references/vs-code-extension-authoring.md).

- **Packages / layering**
  - `core/` — plain TypeScript, **zero `vscode` imports**: DTCG parse, internal model, serializer/formatter, alias resolution + cycle detection, color value handling. Unit-tested without the Extension Host.
  - `extension/` — thin VS Code adapter: `activate()`, Custom Text Editor provider, tree provider, webview host, file/watch I/O, message routing.
  - `webview/` — the GUI (bundled JS/CSS, theme-variable styling, no Webview UI Toolkit since deprecated).
- **Scaffolding:** `yo code` (TypeScript), esbuild bundling, `engines.vscode` pinned, narrow activation (on token file / custom editor open, not `*`).
- **Sync contract:** webview→doc minimal `WorkspaceEdit`; doc→webview via `onDidChangeTextDocument` + `postMessage`. Single `acquireVsCodeApi()`.
- **Distribution:** `vsce package` → `.vsix`, shared via GitHub Release / direct install. No Marketplace.
- **Testing:** core unit tests (parse/serialize round-trip, alias resolution, cycle detection, minimal-diff serializer); a small fixture set of representative CoupleFi token files; manual smoke checklist in the Extension Development Host.

> **Design note (non-normative) — type normalization for CoupleFi's DTCG migration.** CoupleFi's tokens are a Figma export that is DTCG-shaped but loosely typed: `text` for font families (canonical `fontFamily`), bare unitless `number` for dimensions and font weights (canonical `dimension` / `fontWeight`), and legacy hex-string colors (latest DTCG draft prefers a structured color object). CoupleFi intends to migrate to clean DTCG, so the `core` model should make remapping these **easy and declarative**:
>
> - Normalize on read via a **loose-type → canonical-DTCG-type map** (a table, not per-type code), so improving types is a config change. Distinguish these _loose-but-mappable_ types (normalize/upgrade) from _genuinely unknown_ types (preserve opaquely per **AC-3**). Normalization is **read/display-only** and is **not** written back unless the user explicitly remaps (per **FR-1.2a**).
> - **Scope of the Phase 1 map: `$type` only.** It covers the type relabels (`text`→`fontFamily`, `number`→`dimension`/`fontWeight`). The color **value-form** upgrade (hex-string → structured color object) is **Phase 2**, bundled with OKLCH/P3 authoring — Phase 1 keeps hex (FR-4.2) and does not rewrite color values.
> - With this in place, migration is just "open → remap → save a clean diff" using the Phase 1 workflow — **no new Phase 1 requirement**; this is purely a constraint on how the core is structured.
> - Two calls deferred to implementation, owned by CoupleFi not the extension: the **unit policy** for `number`→`dimension` (px vs rem, possibly per group), and the fact that a remap pass is an _intentionally large_ diff — the one case where the minimal-diff goal (**AC-4**) does not apply.

> **Design note (non-normative) — reference resolution & cycle detection: build, don't borrow.** Style Dictionary (Apache-2.0, so legally reusable) exposes a standalone `resolveReferences` util with cycle detection, but it only models curly-brace `{dot.path}` aliases over its own flattened dictionary. Our spec coverage is wider — `{...}` aliases **plus** `$ref` JSON-Pointer (property-level) **plus** `$extends` group-inheritance cycles (all 2025.10 stable; see [references/dtcg-spec-cheat-sheet.md](references/dtcg-spec-cheat-sheet.md) §3, §7) — and taking SD as a dependency would couple `core/` to SD's token shape, against **G6**. Since the cycle check itself is a ~30-line DFS/Tarjan and the real work is resolving against _our_ model anyway, `core/` owns a **single unified resolver**: model all three reference kinds as edges in one dependency graph and run one cycle check (**FR-1.3 / FR-1.4 / AC-5**). SD's `resolveObject.js` is fair game as a **reference implementation to read**, not a runtime dep. Revisit only if we later adopt Style Dictionary as the export/build backend, where reusing its resolver for the alias case would avoid a second implementation.

---

## 7. Indicative build plan (~1 week)

| Day | Focus                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Scaffold extension (`yo code` + esbuild); package layering (`core`/`extension`/`webview`); activation; DTCG fixture set. |
| 2   | Core model: parse + deterministic serializer; round-trip + minimal-diff unit tests.                                      |
| 3   | Custom Text Editor + webview shell; doc↔webview sync; render groups/tokens read-only.                                    |
| 4   | Editing: color, dimension, typography, shadow editors; create/rename/delete; inline validation.                          |
| 5   | Basic color picker; alias editing + resolution + cycle detection.                                                        |
| 6   | Tree view browser, container, menus, welcome state; wire selection → editor.                                             |
| 7   | Polish, theming (light/dark/HC), diff-cleanliness pass, package `.vsix`, smoke test on real CoupleFi files.              |

> Timeline is aggressive and assumes a single focused build. If it slips, cut in this order: shadow composite editor → typography composite editor → tree context menus (keep create/delete from the editor). Core model, custom editor, color editing, and clean diffs are non-negotiable.

---

## 8. Acceptance criteria

- **AC-1** Opening a `*.tokens.json` file offers the GUI editor; the same file still opens as plain text via "Reopen with…".
- **AC-2** All in-scope token types per §4 (color, dimension, number, fontFamily, fontWeight, alias, and composite typography/shadow where present) can be created, edited, and deleted from the GUI.
- **AC-3** Unknown/out-of-scope token types, `$extensions`, and Token Studio sidecars (`$metadata.json`, `$themes.json`) survive a load→edit-something-else→save round-trip unchanged.
- **AC-4** Round-tripping an unedited file produces no meaningful diff; editing one token produces a diff limited to that token.
- **AC-5** Creating an alias cycle is rejected with a clear, non-technical error and no file write.
- **AC-6** The token tree presents the multi-file token set (set → files → groups → tokens) per `tokenSetOrder`, and selecting a token focuses it in the editor.
- **AC-7** A cross-file alias (e.g. a `theme/light.tokens.json` token referencing `reference/default.tokens.json`) resolves to its target value in the GUI, honoring set precedence.
- **AC-8** A basic color picker edits color tokens and writes valid DTCG color values.
- **AC-9** Undo/redo, save, dirty indicator, and external-edit reconciliation all behave correctly (delegated to VS Code).
- **AC-10** UI is legible in light, dark, and high-contrast themes.
- **AC-11** `core/` contains zero `vscode` imports and its tests pass without the Extension Host.

---

## 9. Success metrics (Phase 1)

- A CoupleFi designer completes "open → edit a token → save → open a PR" **without touching JSON** in a moderated walkthrough.
- An engineer rates a Phase-1-produced diff as "reviewable / would approve."
- 100% of fixture files round-trip with no spurious diff.
- ≥1 real CoupleFi token change ships through the extension during the beta week.

---

## 10. Risks & mitigations

| Risk                                                  | Mitigation                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1-week scope is tight                                 | Pre-ranked cut list (§7); core + diffs are the protected minimum             |
| Serializer churns diffs                               | Deterministic formatter + round-trip golden tests as a gate (AC-4)           |
| DTCG spec edge cases (composite types, `$extensions`) | Abstract behind the model; preserve-and-passthrough unknowns (AC-3)          |
| Webview ↔ document sync bugs (undo, external edits)   | Lean on `TextDocument`/`WorkspaceEdit` ownership; test the reconcile path    |
| Designers bounce off git                              | Out of scope for P1 to _fix_; rely on built-in Git UI now, guided flow later |

---

## 11. Open questions

- ~~Token-file glob: standardize on `**/*.tokens.json`, or match CoupleFi's existing naming/layout?~~ **Resolved:** standardize on **`**/*.tokens.json`** (see FR-1.6). CoupleFi renames its current `*.json` token files to the `.tokens.json` convention as part of the migration; the glob stays overridable via a setting but `.tokens.json` is the default and the recommended convention.
- ~~Are CoupleFi's current tokens already DTCG, or do we need a one-time import/convert step (possibly Phase 1.5)?~~ **Resolved:** their tokens are already DTCG-shaped (a Figma Variables export — correct `$`-keys, groups, `{...}` aliases, `$extensions`), so **no import/convert step is needed**. What's required is _type normalization_, not conversion: the loose types (`text`→`fontFamily`, unitless `number`→`dimension`/`fontWeight`, hex-string→structured color) are handled by the core's declarative loose→canonical type-map (see §6 design note). CoupleFi's intended DTCG migration then runs as "open → remap → save" on the Phase 1 workflow — not a separate Phase 1.5.
- ~~Do existing CoupleFi files use light/dark modes today? If so, Phase 1 must _preserve_ them even though mode-authoring UI is Phase 3.~~ **Resolved:** yes — via **file-per-mode** in a **Token Studio multi-file set** (`next/reference/default.tokens.json` primitives + `next/theme/light.tokens.json` + `next/theme/dark.tokens.json` after the rename in FR-1.6), ordered by `$metadata.json` `tokenSetOrder` (`reference/default → theme/light → theme/dark`), with a `$themes.json` sidecar (currently `[]`). Because each mode is its own file, Phase 1 opens a mode the same way it opens any token file — **no side-by-side mode UI needed** (still Phase 3), it just works. Two obligations this creates: (a) the `$metadata.json` / `$themes.json` Token Studio sidecars are **not DTCG** and must be **preserved untouched** (treat like `$extensions` passthrough); (b) see the cross-file resolution item below.
- ~~Single-file or multi-file token sets in the pilot repo — does the tree need cross-file alias resolution on day one?~~ **Resolved:** **multi-file, and yes.** The theme files are almost entirely aliases into the reference set (e.g. `theme/light.tokens.json` has 158 aliases like `{color.blue.950}` that resolve against `reference/default.tokens.json`). So to render resolved values for a theme file the GUI **must do cross-file alias resolution day one**, honoring `tokenSetOrder` precedence. This is now reflected in **FR-1.3** (resolution spans the set), **FR-1.7** (token-set awareness + sidecar passthrough), and **FR-3.1** (tree presents the set).
