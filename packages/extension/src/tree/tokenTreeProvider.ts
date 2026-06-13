import * as vscode from 'vscode';

/**
 * Tree node. `contextValue` drives the `view/item/context` `when` clauses in
 * package.json (e.g. delete only on token/group rows).
 */
export class TokenTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    contextValue: 'set' | 'file' | 'group' | 'token',
  ) {
    super(label, collapsibleState);
    this.contextValue = `dtm.${contextValue}`;
  }
}

/**
 * TreeDataProvider for the token browser (FR-3.x).
 *
 * STUB: returns no children, so the `viewsWelcome` empty-state CTA shows. The
 * real provider presents the multi-file token set (set -> files -> groups ->
 * tokens) per `tokenSetOrder` and focuses the editor on selection (FR-3.1/3.2).
 */
export class TokenTreeProvider implements vscode.TreeDataProvider<TokenTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TokenTreeItem | undefined | void
  >();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: TokenTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(): TokenTreeItem[] {
    return [];
  }
}
