import * as vscode from 'vscode';
import { CORE_VERSION } from '@dtm/core';
import { renderWebviewHtml } from '../webview/html.js';

/**
 * CustomTextEditorProvider for `*.tokens.json` (viewType `dtm.tokenEditor`).
 *
 * STUB: renders the webview shell and pushes the raw document text so the dev
 * loop and the doc->webview channel are proven end-to-end. The real surface —
 * per-type editors, minimal-`WorkspaceEdit` sync, validation (FR-2.x) — is
 * Phase 1 feature work.
 */
export class TokenEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'dtm.tokenEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      TokenEditorProvider.viewType,
      new TokenEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: false } },
    );
  }

  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): void {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
      ],
    };
    webviewPanel.webview.html = renderWebviewHtml(
      webviewPanel.webview,
      this.context.extensionUri,
    );

    const pushDocument = () => {
      void webviewPanel.webview.postMessage({
        type: 'document',
        coreVersion: CORE_VERSION,
        uri: document.uri.toString(),
        text: document.getText(),
      });
    };

    // doc -> webview: undo/redo + external/PR edits flow back here (FR-2.4).
    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        pushDocument();
      }
    });
    webviewPanel.onDidDispose(() => changeSub.dispose());

    // webview -> ext: the real minimal-WorkspaceEdit handler lands with the editor.
    webviewPanel.webview.onDidReceiveMessage((msg: { type?: string }) => {
      if (msg?.type === 'ready') {
        pushDocument();
      }
    });

    pushDocument();
  }
}
