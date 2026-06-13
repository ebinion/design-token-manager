# Visual Design Guidelines

These guidelines govern the look and feel of **every mockup across all phases** of the Design
Token Manager. They exist to keep the visual language consistent across designers and AI agents —
copy the relevant sections into prompts for other agents (including image diffusion models) so
output stays on-brand.

Per-phase mockup needs live alongside this file: [phase-1/README.md](phase-1/README.md).

## North star

> **A native VS Code panel for editing design tokens — not a branded app living inside an
> editor.** It should read as if it shipped with VS Code itself. Borrow the _information design_
> of Figma's Variables table and Token Studio's panel; borrow the _visual chrome_ from VS Code.

Three references, each for a specific reason:

- **VS Code** — the visual skin. Chrome, color, type, spacing, controls all come from here. The
  extension must be indistinguishable from a first-party panel.
- **Figma Variables** — the information architecture. A dense, scannable table of named tokens:
  name on the left, resolved value + swatch on the right, grouped into collapsible collections.
  Aliases shown as pill/chip references to other tokens.
- **Token Studio** — the token-management interactions. Grouped sets in a sidebar, type-aware
  rows, inline editing, the mental model of "sets that layer in precedence order."

## Hard rules (non-negotiable)

1. **No custom brand palette.** Every color comes from a `var(--vscode-*)` token. Never hardcode
   hex for UI chrome. (Token _values being edited_ are real colors and are exempt — a red token
   swatch is genuinely red.)
2. **No custom fonts.** Use `var(--vscode-font-family)` for UI and `var(--vscode-editor-font-family)`
   (the user's monospace) for token values, paths, aliases, and any code-like content.
3. **Theme-adaptive, always.** Must look correct and legible in light, dark, and high-contrast
   without per-theme art. Design against the variables, not a fixed background.
4. **Reuse VS Code's controls.** Inputs, dropdowns, checkboxes, buttons, tree twisties, and list
   rows should match native VS Code widgets — same height, border, focus ring, hover state.
5. **Density over decoration.** This is a power-user data tool. Favor a compact, table-like
   information density (Figma Variables, not a marketing page). No cards with drop shadows, no
   gradients, no rounded "app" containers, no hero illustrations.
6. **Flat, quiet, functional.** Minimal borders, subtle separators, restrained use of accent
   color (reserve `--vscode-focusBorder` / accent for selection and focus only).

## Design tokens to use (VS Code theme variables)

Prompt agents to style against these rather than literal colors:

| Purpose                | Variable(s)                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- |
| Panel background       | `--vscode-editor-background`, `--vscode-sideBar-background`                       |
| Primary text           | `--vscode-foreground`, `--vscode-editor-foreground`                               |
| Muted / secondary text | `--vscode-descriptionForeground`                                                  |
| Separators / borders   | `--vscode-panel-border`, `--vscode-widget-border`                                 |
| Inputs                 | `--vscode-input-background`, `--vscode-input-foreground`, `--vscode-input-border` |
| Dropdowns              | `--vscode-dropdown-background`, `--vscode-dropdown-border`                        |
| Buttons (primary)      | `--vscode-button-background`, `--vscode-button-foreground`                        |
| Buttons (secondary)    | `--vscode-button-secondaryBackground`                                             |
| Row hover              | `--vscode-list-hoverBackground`                                                   |
| Row selected           | `--vscode-list-activeSelectionBackground`                                         |
| Focus ring             | `--vscode-focusBorder`                                                            |
| Links / alias chips    | `--vscode-textLink-foreground`                                                    |
| Error / validation     | `--vscode-inputValidation-errorBackground`, `--vscode-errorForeground`            |
| Warning                | `--vscode-inputValidation-warningBackground`                                      |
| Badge (counts, types)  | `--vscode-badge-background`, `--vscode-badge-foreground`                          |
| Icons                  | `--vscode-icon-foreground`; prefer Codicons over custom glyphs                    |

## Layout & spacing

- **Spacing scale:** 4px base unit — use 4 / 8 / 12 / 16. Tight, consistent gutters.
- **Row height:** ~22–28px per token row, matching VS Code list/tree row density.
- **Two-column token rows:** name (+ type icon) left, value editor + swatch right — the Figma
  Variables pattern. Resolved alias value shows inline, dimmed.
- **Groups:** collapsible with a Codicon twisty (`chevron-right` / `chevron-down`), indented one
  level like a tree.
- **Alignment:** left-align names and labels; align value editors into a consistent column so the
  table scans vertically.

## Typography

- UI labels, group names, descriptions → `--vscode-font-family` at editor base size (~13px).
- Token names, alias references (`{color.brand.primary}`), hex values, dimensions, paths →
  monospace (`--vscode-editor-font-family`).
- Secondary metadata (resolved values, descriptions, units) → `--vscode-descriptionForeground`,
  same size, lower contrast.

## Iconography

- Use **Codicons** (VS Code's built-in icon set) exclusively — no custom icon language.
- Per-type token icons should be simple, monochrome, and tint with `--vscode-icon-foreground`
  (e.g. a filled swatch for color, a ruler/`symbol-ruler` for dimension, `symbol-numeric` for
  number, `text-size` for typography, `link` for alias). Keep them legible at 16px.

## Color swatches (the one place real color appears)

- Show a small (~14–16px) rounded-corner swatch next to color tokens and inside the picker.
- Give swatches a subtle `--vscode-widget-border` outline so near-background colors stay visible.
- Indicate alpha with a checkerboard behind transparent swatches.

## Component-specific notes

- **Tree view** — must be visually identical to a native VS Code tree (twisties, indent guides,
  hover/selection highlight, `viewsWelcome` empty state styled like other empty views).
- **Color picker** — a compact popover, not a full-screen modal. sRGB/HSV square + hue slider +
  hex field. Plain, utilitarian, like a native picker — no skeuomorphism.
- **Validation** — inline, using `--vscode-inputValidation-*`; errors appear adjacent to the
  offending field. Cycle-rejection message is plain-language and non-technical (AC-5).

## Anti-patterns (do NOT generate)

- ❌ A custom brand color, logo, or accent that isn't from the active VS Code theme.
- ❌ Marketing-style cards, drop shadows, gradients, glassmorphism, or large rounded containers.
- ❌ Hero illustrations, mascots, decorative imagery, or empty-state art beyond a Codicon + text.
- ❌ Light-mode-only or dark-mode-only designs with hardcoded backgrounds.
- ❌ Non-VS-Code fonts, oversized headings, or generous "web app" whitespace.
- ❌ Anything that would make a user think "this is a third-party app," not "this is VS Code."

## Reusable prompt seed (for image / design agents)

> A Visual Studio Code extension panel for editing design tokens. Native VS Code dark theme:
> `#1e1e1e` editor background, `#cccccc` foreground, monospace token names and values. Dense,
> table-like layout inspired by Figma's Variables panel — token name on the left with a small
> type icon, resolved value and a 16px rounded color swatch on the right, organized into
> collapsible groups with chevron twisties like a file tree. A left sidebar tree lists token sets,
> files, and groups (Token Studio style). Flat, quiet, functional UI; no gradients, no shadows, no
> custom branding; controls (inputs, dropdowns, buttons) styled exactly like native VS Code
> widgets. Subtle 1px separators, 4px spacing grid, blue focus ring (`#007acc`). Looks like it
> shipped with VS Code, not a third-party app.

Swap the literal hex values for the light / high-contrast equivalents when prompting for those
themes; they are stand-ins for the `--vscode-*` variables only because diffusion models can't read
CSS variables.
