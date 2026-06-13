// DTCG JSON -> internal model (FR-1.1).
//
// Uses jsonc-parser for tolerant parsing: malformed input is reported as errors
// rather than thrown, so the Day-3 editor can surface them inline (FR-2.7)
// instead of crashing. The model built here stores everything verbatim
// (FR-1.2a) — serialization is surgical text patching over the original `text`
// (see ../serialize), so parsing never needs to be loss-free for round-trip.

import { getNodeValue, parseTree, printParseErrorCode } from 'jsonc-parser';
import type { ParseError as JsoncParseError } from 'jsonc-parser';
import type {
  GroupNode,
  ModelNode,
  TokenDocument,
  TokenNode,
} from '../model/index.js';

/** A problem found while parsing a token document. */
export interface ParseError {
  readonly message: string;
  readonly offset?: number;
  readonly length?: number;
}

export interface ParseResult {
  /** Present whenever the top level is an object (even with errors elsewhere). */
  readonly document?: TokenDocument;
  readonly errors: ParseError[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Object entries that are children (non `$`-prefixed keys). */
function childEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.entries(obj).filter(([key]) => !key.startsWith('$'));
}

function readType(obj: Record<string, unknown>): string | undefined {
  return typeof obj.$type === 'string' ? obj.$type : undefined;
}

function readDescription(obj: Record<string, unknown>): string | undefined {
  return typeof obj.$description === 'string' ? obj.$description : undefined;
}

function readDeprecated(
  obj: Record<string, unknown>,
): boolean | string | undefined {
  const d = obj.$deprecated;
  return typeof d === 'boolean' || typeof d === 'string' ? d : undefined;
}

function buildNode(
  name: string,
  path: string[],
  value: unknown,
  errors: ParseError[],
): ModelNode {
  if (isPlainObject(value) && '$value' in value) {
    const stray = childEntries(value);
    if (stray.length > 0) {
      errors.push({
        message: `"${path.join('.')}" has both $value and child tokens; treated as a token (a DTCG object cannot be both).`,
      });
    }
    const token: TokenNode = {
      kind: 'token',
      name,
      path,
      type: readType(value),
      value: value.$value,
      description: readDescription(value),
      extensions: '$extensions' in value ? value.$extensions : undefined,
      deprecated: readDeprecated(value),
    };
    return token;
  }

  if (isPlainObject(value)) {
    const group: GroupNode = {
      kind: 'group',
      name,
      path,
      type: readType(value),
      description: readDescription(value),
      extensions: '$extensions' in value ? value.$extensions : undefined,
      deprecated: readDeprecated(value),
      children: childEntries(value).map(([key, child]) =>
        buildNode(key, [...path, key], child, errors),
      ),
    };
    return group;
  }

  // A non-object where a token/group object was expected. Preserve the raw
  // value as a token so nothing is dropped, and report it.
  errors.push({
    message: `"${path.join('.')}" is not a valid token or group object.`,
  });
  return { kind: 'token', name, path, value };
}

/** Parse DTCG token-file text into an internal model (FR-1.1). */
export function parseDocument(text: string): ParseResult {
  const jsoncErrors: JsoncParseError[] = [];
  const tree = parseTree(text, jsoncErrors, {
    disallowComments: true,
    allowTrailingComma: false,
  });
  const errors: ParseError[] = jsoncErrors.map((e) => ({
    message: printParseErrorCode(e.error),
    offset: e.offset,
    length: e.length,
  }));

  if (!tree) {
    if (errors.length === 0) {
      errors.push({ message: 'Empty or invalid document.' });
    }
    return { errors };
  }

  const value = getNodeValue(tree) as unknown;
  if (!isPlainObject(value)) {
    errors.push({ message: 'A DTCG token file must be a JSON object.' });
    return { errors };
  }

  const root: GroupNode = {
    kind: 'group',
    name: '',
    path: [],
    type: readType(value),
    description: readDescription(value),
    extensions: '$extensions' in value ? value.$extensions : undefined,
    deprecated: readDeprecated(value),
    children: childEntries(value).map(([key, child]) =>
      buildNode(key, [key], child, errors),
    ),
  };

  return { document: { text, root }, errors };
}
