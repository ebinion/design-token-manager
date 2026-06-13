# VS Code Design Token Manager

A VS Code extension that lets designers manage [W3C DTCG](https://www.designtokens.org) design tokens directly in a repo — reading and writing standard token files through a visual GUI while keeping them human-readable and git-friendly. Internal tool for CoupleFi; not a Marketplace product.

See [CLAUDE.md](CLAUDE.md) for architecture and [specs/prd-phase-1.md](specs/prd-phase-1.md) for the current build scope.

## Prerequisites

- **Node ≥ 20**
- **pnpm** — enable with `corepack enable` (no separate install needed)

## Getting started

```sh
corepack enable      # one-time: makes pnpm available
pnpm install         # install all workspace packages
pnpm build           # bundle the extension + webview
```

Then press **F5** in VS Code (the "Run Extension" launch config) to open an Extension Development Host with the extension loaded on the [fixtures/](fixtures/) token set. It rebuilds on save via a background watch task.

Open `fixtures/reference/default.tokens.json` and choose **Reopen Editor With… → Design Token Manager** to see the GUI; the file still opens as plain JSON by default.

## Scripts

Run from the repo root:

| Command          | What it does                                                              |
| ---------------- | ------------------------------------------------------------------------- |
| `pnpm build`     | Bundle webview then extension into `packages/extension/dist/` (esbuild).  |
| `pnpm watch`     | Rebuild webview + extension on change (this is what F5 runs).             |
| `pnpm test`      | Run the `@dtm/core` Vitest suite — no Extension Host required.            |
| `pnpm typecheck` | `tsc --noEmit` across all packages.                                       |
| `pnpm lint`      | ESLint, including the rule that bans `vscode` imports in `core/`.         |
| `pnpm package`   | Build + `vsce package` → a `.vsix` for internal install (no Marketplace). |

To install a packaged build: Extensions view → **Install from VSIX…**, or `code --install-extension <file>.vsix`.

## Project layout

A pnpm workspace with three layers (see [CLAUDE.md](CLAUDE.md#phase-1-package-layering-per-the-prds-technical-design)):

```
packages/
  core/        @dtm/core      — DTCG parse/model/serialize/resolve/color. ZERO vscode imports.
  extension/   the VS Code adapter + manifest. The .vsix is built from here.
  webview/     @dtm/webview   — the GUI (vanilla TS + CSS), bundled into the extension.
fixtures/      a sample Token Studio multi-file token set for tests & manual smoke testing.
```

The core/extension/webview split is enforced: `core/` must stay editor-agnostic so it can be unit-tested without the Extension Host. `pnpm lint` fails if anything in `core/` imports `vscode`.
