// Internal token model — abstracted from the on-disk DTCG shape (FR-1.1).
//
// The rest of the codebase talks to THIS model, never to raw DTCG JSON shapes,
// so spec churn stays contained (CLAUDE.md). Per FR-1.2a the model stores each
// token's ORIGINAL on-disk `$type` and value form verbatim — normalization
// (see ../normalize) is display/resolution-only and is never written back.

import { normalizeType } from '../normalize/index.js';

/**
 * Canonical DTCG `$type` values (cheat sheet §4–§6). The model stores the raw
 * on-disk type string verbatim; this union just names the canonical set for
 * normalization and known-type checks. Out-of-scope/unknown types are kept as
 * plain strings and preserved opaquely (AC-3).
 */
export type DtcgType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'number'
  | 'duration'
  | 'cubicBezier'
  | 'strokeStyle'
  | 'border'
  | 'transition'
  | 'shadow'
  | 'gradient'
  | 'typography';

const KNOWN_DTCG_TYPES: ReadonlySet<string> = new Set<DtcgType>([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'number',
  'duration',
  'cubicBezier',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
]);

/** True when `type` is a canonical DTCG `$type` we know how to interpret. */
export function isKnownType(type: string | undefined): type is DtcgType {
  return type !== undefined && KNOWN_DTCG_TYPES.has(type);
}

/** Fields common to both groups and tokens. */
export interface NodeBase {
  /** The object key (token/group name). The root group's name is `""`. */
  readonly name: string;
  /** Keys from the document root to this node (the root's path is `[]`). */
  readonly path: readonly string[];
  /** `$description`, verbatim. */
  readonly description?: string;
  /** `$extensions`, preserved verbatim even when not rendered (AC-3). */
  readonly extensions?: unknown;
  /** `$deprecated`, verbatim. */
  readonly deprecated?: boolean | string;
}

/** A token: an object with `$value` (cheat sheet §1). */
export interface TokenNode extends NodeBase {
  readonly kind: 'token';
  /** The token's OWN `$type`, verbatim (FR-1.2a); `undefined` => inherits. */
  readonly type?: string;
  /** The raw `$value`, verbatim. */
  readonly value: unknown;
}

/** A group: an object without `$value` (cheat sheet §1). */
export interface GroupNode extends NodeBase {
  readonly kind: 'group';
  /** Group-level default `$type`, verbatim — inherited by descendants. */
  readonly type?: string;
  readonly children: readonly ModelNode[];
}

export type ModelNode = GroupNode | TokenNode;

/** One parsed token file. `text` is the verbatim source (the source of truth). */
export interface TokenDocument {
  /** The original file text, verbatim — surgical edits patch this directly. */
  readonly text: string;
  /** The whole file modeled as a group (name `""`, path `[]`). */
  readonly root: GroupNode;
}

/** True when a `$value` is a curly-brace alias, e.g. `"{color.brand.primary}"`. */
export function isAlias(value: unknown): value is string {
  return typeof value === 'string' && /^\{[^{}]+\}$/.test(value);
}

/** Extract the dotted target path of an alias value, or `undefined`. */
export function aliasTarget(value: unknown): string | undefined {
  return isAlias(value) ? value.slice(1, -1) : undefined;
}

/** Build the dotted reference path for a node, e.g. `color.brand.primary`. */
export function toReferencePath(path: readonly string[]): string {
  return path.join('.');
}

/** Walk every node (groups and tokens) under `node`, depth-first. */
export function* walkNodes(node: ModelNode): Generator<ModelNode> {
  yield node;
  if (node.kind === 'group') {
    for (const child of node.children) yield* walkNodes(child);
  }
}

/** The chain of nodes from the root down to `path`, or `undefined` if absent. */
export function nodeChain(
  root: GroupNode,
  path: readonly string[],
): ModelNode[] | undefined {
  const chain: ModelNode[] = [root];
  let current: ModelNode = root;
  for (const name of path) {
    if (current.kind !== 'group') return undefined;
    const next: ModelNode | undefined = current.children.find(
      (c) => c.name === name,
    );
    if (!next) return undefined;
    chain.push(next);
    current = next;
  }
  return chain;
}

/** The node at `path`, or `undefined`. */
export function findNode(
  root: GroupNode,
  path: readonly string[],
): ModelNode | undefined {
  return nodeChain(root, path)?.at(-1);
}

/**
 * The effective `$type` of the node at `path` (cheat sheet §2): the node's own
 * `$type`, else the nearest ancestor group's `$type`. Returned verbatim (not
 * normalized). Alias-derived types (step 3) and "otherwise invalid" reporting
 * are deferred to the resolver (Day 5).
 */
export function effectiveType(
  root: GroupNode,
  path: readonly string[],
): string | undefined {
  const chain = nodeChain(root, path);
  if (!chain) return undefined;
  const node = chain[chain.length - 1];
  if (node.type !== undefined) return node.type;
  for (let i = chain.length - 2; i >= 0; i--) {
    const ancestor = chain[i];
    if (ancestor.kind === 'group' && ancestor.type !== undefined) {
      return ancestor.type;
    }
  }
  return undefined;
}

/**
 * The effective type mapped through the loose->canonical table, for GUI display
 * only (never written back). See ../normalize.
 */
export function displayType(
  root: GroupNode,
  path: readonly string[],
): string | undefined {
  const raw = effectiveType(root, path);
  return raw === undefined ? undefined : normalizeType(raw);
}
