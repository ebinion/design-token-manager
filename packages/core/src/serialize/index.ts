// Model -> JSON (FR-1.2 / FR-5.2 / AC-4).
//
// The on-disk text is the source of truth. Edits are SURGICAL: each function
// patches only the changed span via jsonc-parser's modify()/applyEdits(),
// leaving every other byte verbatim — so a no-op produces a byte-identical
// round-trip and a one-token change is a one-line diff. printDocument() is a
// full deterministic pretty-printer used only for brand-new files.

import { applyEdits, findNodeAtLocation, modify, parseTree } from 'jsonc-parser';
import type { FormattingOptions, JSONPath } from 'jsonc-parser';
import type { GroupNode, ModelNode, TokenNode } from '../model/index.js';

/**
 * Infer the document's formatting (indent unit + line ending) so inserted or
 * reformatted spans match the surrounding style, keeping diffs minimal.
 */
export function detectFormatting(text: string): FormattingOptions {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const indent = text.match(/\n([ \t]+)\S/)?.[1];
  if (indent !== undefined) {
    if (indent.startsWith('\t')) return { insertSpaces: false, tabSize: 1, eol };
    return { insertSpaces: true, tabSize: indent.length, eol };
  }
  return { insertSpaces: true, tabSize: 2, eol };
}

function edit(text: string, path: JSONPath, value: unknown): string {
  const edits = modify(text, path, value, {
    formattingOptions: detectFormatting(text),
  });
  return applyEdits(text, edits);
}

/** Set an arbitrary property at `path` (use `undefined` to remove it). */
export function setProperty(
  text: string,
  path: readonly string[],
  value: unknown,
): string {
  return edit(text, [...path], value);
}

/** Set a token's `$value`. */
export function setTokenValue(
  text: string,
  tokenPath: readonly string[],
  value: unknown,
): string {
  return edit(text, [...tokenPath, '$value'], value);
}

/** Set a token's or group's `$description`. */
export function setDescription(
  text: string,
  nodePath: readonly string[],
  description: string,
): string {
  return edit(text, [...nodePath, '$description'], description);
}

/** Set a token's or group's `$type`. */
export function setTokenType(
  text: string,
  nodePath: readonly string[],
  type: string,
): string {
  return edit(text, [...nodePath, '$type'], type);
}

/** Insert a new token/group object named `name` under `parentPath`. */
export function createNode(
  text: string,
  parentPath: readonly string[],
  name: string,
  node: unknown,
): string {
  return edit(text, [...parentPath, name], node);
}

/** Remove the token/group at `path`. */
export function deleteNode(text: string, path: readonly string[]): string {
  return edit(text, [...path], undefined);
}

/**
 * Rename the token/group at `path`. Done by splicing only the property KEY
 * string in place (not modify(), which would remove+re-add and churn key
 * order), so the rename is a truly minimal diff and the value is untouched.
 */
export function renameNode(
  text: string,
  path: readonly string[],
  newName: string,
): string {
  if (path.length === 0) return text; // the root has no key to rename
  const tree = parseTree(text);
  if (!tree) return text;
  const valueNode = findNodeAtLocation(tree, [...path]);
  const keyNode = valueNode?.parent?.children?.[0];
  if (!keyNode) return text;
  const start = keyNode.offset;
  const end = keyNode.offset + keyNode.length;
  return text.slice(0, start) + JSON.stringify(newName) + text.slice(end);
}

// --- Deterministic full emit (new files only) -------------------------------

export interface PrintOptions {
  /** Spaces per indent level. Default 2. */
  readonly indent?: number;
  /** Line ending. Default `"\n"`. */
  readonly eol?: string;
}

function tokenToJson(token: TokenNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (token.type !== undefined) out.$type = token.type;
  out.$value = token.value;
  if (token.description !== undefined) out.$description = token.description;
  if (token.extensions !== undefined) out.$extensions = token.extensions;
  if (token.deprecated !== undefined) out.$deprecated = token.deprecated;
  return out;
}

function groupToJson(group: GroupNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (group.type !== undefined) out.$type = group.type;
  if (group.description !== undefined) out.$description = group.description;
  if (group.extensions !== undefined) out.$extensions = group.extensions;
  if (group.deprecated !== undefined) out.$deprecated = group.deprecated;
  for (const child of group.children) out[child.name] = nodeToJson(child);
  return out;
}

function nodeToJson(node: ModelNode): Record<string, unknown> {
  return node.kind === 'token' ? tokenToJson(node) : groupToJson(node);
}

/**
 * Pretty-print a model to canonical DTCG JSON. For creating NEW files only —
 * existing files are edited surgically over their original text.
 */
export function printDocument(root: GroupNode, options: PrintOptions = {}): string {
  const indent = options.indent ?? 2;
  const eol = options.eol ?? '\n';
  let json = JSON.stringify(groupToJson(root), null, indent);
  if (eol !== '\n') json = json.replace(/\n/g, eol);
  return json + eol;
}
