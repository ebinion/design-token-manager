import * as vscode from 'vscode';
import { TokenEditorProvider } from './editor/tokenEditorProvider.js';
import { TokenTreeProvider } from './tree/tokenTreeProvider.js';

export function activate(context: vscode.ExtensionContext): void {
  // Custom Text Editor for *.tokens.json (AC-1: opt-in GUI, JSON stays editable).
  context.subscriptions.push(TokenEditorProvider.register(context));

  // Token browser tree.
  const treeProvider = new TokenTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('dtm.tokenTree', treeProvider),
  );

  // Commands. STUBS: wired so the contributions/menus/welcome CTA resolve; the
  // real create/delete/refresh behavior lands with the tree + editor.
  const stub = (name: string) =>
    vscode.commands.registerCommand(name, () => {
      void vscode.window.showInformationMessage(`Design Token Manager: "${name}" is not implemented yet.`);
    });

  context.subscriptions.push(
    vscode.commands.registerCommand('dtm.refresh', () => treeProvider.refresh()),
    stub('dtm.createTokenFile'),
    stub('dtm.createToken'),
    stub('dtm.createGroup'),
    stub('dtm.delete'),
  );
}

export function deactivate(): void {
  // Registrations are disposed via context.subscriptions.
}
