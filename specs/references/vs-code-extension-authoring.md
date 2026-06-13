# VS Code Extension Authoring — Notes

Research notes for building **Design Token Manager** as a VS Code extension. Mapped to our goals: a GUI over DTCG JSON files, clean git-friendly diffs, git-native workflow, internal (no Marketplace) distribution.

## In a nutshell

An extension is a Node/TypeScript package whose `package.json` manifest declares **contribution points** (UI/commands VS Code shows) and **activation events** (when to load it), plus an `extension.ts` whose `activate()` registers behavior against the **VS Code API**. You scaffold it with the `yo code` generator, develop by pressing `F5` to launch an Extension Development Host, and ship it by running `vsce package` into a `.vsix`. For our case the core is a **Custom Text Editor** that renders a webview GUI over DTCG JSON files while VS Code's `TextDocument` handles saving and undo.

- Official API docs root: https://code.visualstudio.com/api
- Full API reference: https://code.visualstudio.com/api/references/vscode-api
- Extension manifest reference: https://code.visualstudio.com/api/references/extension-manifest
- Contribution points reference: https://code.visualstudio.com/api/references/contribution-points
- Activation events reference: https://code.visualstudio.com/api/references/activation-events
- Samples repo (copy-paste starting points): https://github.com/microsoft/vscode-extension-samples

---

## 1. Scaffolding & dev loop

Docs: https://code.visualstudio.com/api/get-started/your-first-extension

- Scaffold with Yeoman generator: `npx --package yo --package generator-code -- yo code`
  - Choose **New Extension (TypeScript)**, bundler **esbuild/webpack** (recommended for shipping; cuts size), npm.
- `F5` → launches **Extension Development Host** (separate VS Code window running the extension).
- After edits: **Developer: Reload Window** in the host, or restart debug.
- Debug config lives in `.vscode/launch.json`; build tasks in `.vscode/tasks.json`.

## 2. Anatomy & manifest

Docs: https://code.visualstudio.com/api/get-started/extension-anatomy

Three pillars: **Activation Events**, **Contribution Points** (declared in `package.json`), **VS Code API** (called in code).

- Entry file `src/extension.ts` exports:
  - `export function activate(context: vscode.ExtensionContext)` — register everything here.
  - `export function deactivate()` — cleanup.
- `context.subscriptions.push(disposable)` — auto-disposes registrations on deactivate.
- Key `package.json` fields: `name`, `publisher`, `main` (e.g. `./out/extension.js`), `engines.vscode` (min API version), `activationEvents`, `contributes`.
- Since VS Code 1.74, declared commands auto-activate the extension (no explicit `onCommand` needed).
- For our internal tool, prefer narrow activation (e.g. activate when a DTCG token file / our custom editor opens) over `*`.

## 3. The GUI surface — choosing the right primitive

Capabilities overview: https://code.visualstudio.com/api/extension-capabilities/overview
→ We're a **Workbench extension** using the **Webview API**: https://code.visualstudio.com/api/extension-capabilities/extending-workbench

### ⭐ Custom Text Editor — best fit for editing DTCG JSON

Docs: https://code.visualstudio.com/api/extension-guides/custom-editors
Sample: https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample

- `CustomTextEditorProvider` — backs the GUI with a standard `TextDocument`. **VS Code owns save, undo/redo, backups, dirty state, and external-edit handling.** Ideal because tokens are text (JSON).
  - (Contrast: `CustomEditorProvider` / `CustomReadonlyEditorProvider` are for binary/custom doc models — we own save/undo. Not needed.)
- Register: `window.registerCustomEditorProvider(viewType, provider)`.
- Declare via `contributes.customEditors`: `viewType`, `displayName`, `selector` (glob, e.g. `*.tokens.json`), `priority` (`default` | `option` — use `option` so designers opt into the GUI and JSON stays openable as text).
- **Sync model (this is what gives us clean diffs — directly satisfies the "git-friendly, minimal diffs" constraint):**
  - Webview → doc: on GUI edit, build a minimal `WorkspaceEdit` and `vscode.workspace.applyEdit(...)`. Write only the changed span, not the whole file.
  - Doc → webview: subscribe to `vscode.workspace.onDidChangeTextDocument`, `postMessage` updated state to webview (handles undo/redo + external/PR edits).
  - ⚠️ Our serializer must produce stable key order + formatting so round-trips don't churn the diff. Abstract this in the storage model layer (per CLAUDE.md DTCG-churn constraint).

### Alternative GUI surfaces

- **Webview panel** (free-floating editor tab): `vscode.window.createWebviewPanel(viewType, title, viewColumn, { enableScripts: true })`. Use for the live-impact / preview view that isn't bound to one file.
- **Webview view** (docked in sidebar/panel): contribute via `contributes.views` with `"type": "webview"` + `WebviewViewProvider` / `registerWebviewViewProvider` / `resolveWebviewView`. Good for a persistent color-picker or a11y inspector. (Covered within the Webview guide.)

### Webview essentials

Docs: https://code.visualstudio.com/api/extension-guides/webview

- Messaging:
  - Ext → webview: `panel.webview.postMessage(obj)`; webview listens `window.addEventListener('message', ...)`.
  - Webview → ext: `acquireVsCodeApi().postMessage(obj)` (call `acquireVsCodeApi()` **once**); ext listens `webview.onDidReceiveMessage(...)`.
- Local assets (our bundled JS/CSS/icons): `webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', ...))`; restrict with `localResourceRoots`.
- **CSP required** (defense-in-depth): `default-src 'none'; script-src ${webview.cspSource} 'nonce-...'; style-src ${webview.cspSource};`. No inline scripts — use a nonce.
- State: `getState()`/`setState()` (cheap, survives hide); `WebviewPanelSerializer` (survives restart); `retainContextWhenHidden: true` (keeps DOM alive but costs memory — use sparingly).
- Lifecycle: handle `onDidDispose`, `onDidChangeViewState`.
- **Theming:** style with VS Code CSS theme variables (`var(--vscode-...)`); test light / dark / high-contrast. (Note: the old _Webview UI Toolkit_ is deprecated — build our own components or use a lightweight lib.)

## 4. Token browser — Tree View

Docs: https://code.visualstudio.com/api/extension-guides/tree-view

- `contributes.viewsContainers` → our own Activity Bar container (icon + title).
- `contributes.views` → the tree view(s) inside it.
- Implement `TreeDataProvider`: `getChildren(element?)`, `getTreeItem(element)`; fire `onDidChangeTreeData` to refresh.
- `TreeItem`: `label`, `collapsibleState`, `iconPath`, `contextValue` (drives `when` clauses).
- Item/title actions via `contributes.menus`: `view/title`, `view/item/context`.
- `viewsWelcome` for empty-state CTA (e.g. "Create your first token file").
- Use for the token group/collection hierarchy; selecting a token opens/focuses it in the custom editor.

## 5. Files, workspace & git-native workflow

- File I/O: **`vscode.workspace.fs`** (`readFile`/`writeFile`/`readDirectory`/`stat`) — host-agnostic, works in remote/web. Prefer over Node `fs`.
- Find token files: `vscode.workspace.findFiles(glob)`.
- Watch for external/PR changes: `vscode.workspace.createFileSystemWatcher(glob)` → `onDidChange/Create/Delete`.
- Git: VS Code has no public git-write API — drive git via the built-in **vscode.git** extension's exported API, or shell out, to power the guided commit/branch/PR flow (hide jargon per PRD).
- Related provider APIs (probably not needed, but noted): https://code.visualstudio.com/api/extension-guides/virtual-documents (`TextDocumentContentProvider` for read-only virtual docs; `FileSystemProvider` for custom file systems).

## 6. Packaging & internal distribution (no Marketplace)

Docs: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

- Tool: `npm install -g @vscode/vsce`.
- Build artifact: `vsce package` → `design-token-manager-x.y.z.vsix`.
- Install: Extensions view → **Install from VSIX…**, or `code --install-extension *.vsix`.
- Distribute internally via: GitHub Releases artifact, private registry, or direct share. ✅ Matches "internal tool for CoupleFi, not Marketplace."
- (Bundle with esbuild/webpack before packaging to keep the VSIX small.)

## 7. Editor-agnostic core (per CLAUDE.md)

- Keep token parsing / model / references / color / a11y in a plain TS package with **zero `vscode` imports**.
- The extension layer = thin adapter: custom editor, tree, webview messaging, file/git I/O.
- Lets the core move hosts later and be unit-tested without the Extension Host.

---

## Quick map: PRD goal → API

| Goal                       | Mechanism                                               |
| -------------------------- | ------------------------------------------------------- |
| GUI over DTCG JSON         | `CustomTextEditorProvider` + webview                    |
| Clean, minimal git diffs   | minimal `WorkspaceEdit` + stable serializer             |
| Token browser/organize     | Tree View (`TreeDataProvider`) in custom view container |
| Live impact / preview      | separate webview panel, fed via `postMessage`           |
| Color picker / a11y inline | webview view (sidebar) or in-editor webview             |
| Git-native commit/PR flow  | vscode.git extension API / shell + file watchers        |
| Read/write token files     | `vscode.workspace.fs`, `findFiles`, FileSystemWatcher   |
| Internal distribution      | `vsce package` → `.vsix`, no Marketplace                |
| Editor-agnostic core       | vscode-free core TS module                              |
