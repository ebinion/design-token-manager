import { describe, expect, it } from 'vitest';
import { findNode, walkNodes } from '../model/index.js';
import type { TokenNode } from '../model/index.js';
import { parseDocument } from '../parse/index.js';
import {
  createNode,
  deleteNode,
  detectFormatting,
  printDocument,
  renameNode,
  setDescription,
  setTokenType,
  setTokenValue,
} from './index.js';

// Inline fixture with exact known formatting, so we can assert byte-exact
// minimal diffs. Mixes inline objects, a composite dimension value, and the
// number lexemes (0.375, 1.2) whose preservation we care about.
const INLINE = `{
  "color": {
    "$type": "color",
    "brand": {
      "primary": { "$value": "#5B5BD6", "$description": "Brand" },
      "secondary": { "$value": "#12B5A8" }
    }
  },
  "space": {
    "$type": "dimension",
    "sm": { "$value": { "value": 8, "unit": "px" } },
    "radius": { "$value": 0.375 }
  },
  "ratio": {
    "$type": "number",
    "tight": { "$value": 1.2 }
  }
}
`;

/** Lines that differ between two strings of equal line count. */
function changedLineCount(before: string, after: string): number {
  const a = before.split('\n');
  const b = after.split('\n');
  expect(b.length).toBe(a.length);
  return a.reduce((n, line, i) => (line === b[i] ? n : n + 1), 0);
}

describe('detectFormatting', () => {
  it('detects 2-space indentation and LF', () => {
    expect(detectFormatting(INLINE)).toEqual({
      insertSpaces: true,
      tabSize: 2,
      eol: '\n',
    });
  });

  it('detects tab indentation', () => {
    const tabbed = '{\n\t"a": {\n\t\t"$value": 1\n\t}\n}\n';
    expect(detectFormatting(tabbed).insertSpaces).toBe(false);
  });
});

describe('surgical edits produce minimal diffs', () => {
  it('changes only the edited value line', () => {
    const next = setTokenValue(INLINE, ['color', 'brand', 'primary'], '#6E56CF');
    expect(next).toBe(INLINE.replace('#5B5BD6', '#6E56CF'));
    expect(changedLineCount(INLINE, next)).toBe(1);
  });

  it('leaves untouched number lexemes byte-identical (0.375, 1.2)', () => {
    const next = setTokenValue(INLINE, ['color', 'brand', 'primary'], '#6E56CF');
    expect(next).toContain('"$value": 0.375');
    expect(next).toContain('"$value": 1.2');
    expect(next).toContain('"value": 8, "unit": "px"');
  });

  it('edits only the description span', () => {
    const next = setDescription(
      INLINE,
      ['color', 'brand', 'primary'],
      'Brand color',
    );
    expect(next).toBe(INLINE.replace('"Brand"', '"Brand color"'));
  });

  it('renames a key in place without touching its value (one-line diff)', () => {
    const next = renameNode(INLINE, ['color', 'brand', 'primary'], 'primaryAction');
    expect(next).toBe(INLINE.replace('"primary":', '"primaryAction":'));
    expect(changedLineCount(INLINE, next)).toBe(1);
  });

  it('updates an existing $type in place', () => {
    const next = setTokenType(INLINE, ['ratio', 'tight'], 'fontWeight');
    const tight = findNode(
      parseDocument(next).document!.root,
      ['ratio', 'tight'],
    ) as TokenNode;
    // tight had no own $type; setting it must not corrupt the document.
    expect(tight.type).toBe('fontWeight');
    expect(parseDocument(next).errors).toEqual([]);
  });
});

describe('create and delete', () => {
  it('inserts a new token and keeps the document valid', () => {
    const next = createNode(INLINE, ['color', 'brand'], 'tertiary', {
      $value: '#000000',
    });
    const { document, errors } = parseDocument(next);
    expect(errors).toEqual([]);
    const tertiary = findNode(document!.root, [
      'color',
      'brand',
      'tertiary',
    ]) as TokenNode;
    expect(tertiary.value).toBe('#000000');
  });

  it('removes a token and leaves siblings intact', () => {
    const next = deleteNode(INLINE, ['color', 'brand', 'secondary']);
    const { document, errors } = parseDocument(next);
    expect(errors).toEqual([]);
    expect(findNode(document!.root, ['color', 'brand', 'secondary'])).toBeUndefined();
    expect(findNode(document!.root, ['color', 'brand', 'primary'])).toBeDefined();
  });
});

describe('printDocument (new-file emit)', () => {
  it('emits canonical JSON that re-parses to the same model', () => {
    const root = parseDocument(INLINE).document!.root;
    const printed = printDocument(root);
    expect(printed.endsWith('\n')).toBe(true);
    const reparsed = parseDocument(printed);
    expect(reparsed.errors).toEqual([]);

    const snapshot = (r: typeof root) =>
      [...walkNodes(r)]
        .filter((n) => n.kind === 'token')
        .map((n) => `${n.path.join('.')}=${JSON.stringify((n as TokenNode).value)}`)
        .sort();
    expect(snapshot(reparsed.document!.root)).toEqual(snapshot(root));
  });
});
