import { describe, expect, it } from 'vitest';
import { readFixture } from './__fixtures__/load.js';
import { effectiveType, findNode } from './model/index.js';
import type { GroupNode, TokenNode } from './model/index.js';
import { parseDocument } from './parse/index.js';
import { setTokenValue } from './serialize/index.js';

const FIXTURES = [
  'reference/default.tokens.json',
  'theme/light.tokens.json',
  'theme/dark.tokens.json',
];

describe('round-trip identity (AC-4)', () => {
  it.each(FIXTURES)('parses %s with no errors', (path) => {
    expect(parseDocument(readFixture(path)).errors).toEqual([]);
  });

  it.each(FIXTURES)('keeps %s byte-identical on a no-op (text is truth)', (path) => {
    const text = readFixture(path);
    // The model holds the original text verbatim; with no edit applied, the
    // on-disk bytes are unchanged by construction.
    expect(parseDocument(text).document!.text).toBe(text);
  });
});

describe('one-token edits stay minimal (FR-5.2 / AC-4)', () => {
  it('changing one color value is a one-line diff', () => {
    const text = readFixture('reference/default.tokens.json');
    const next = setTokenValue(text, ['color', 'neutral', '0'], '#fefefe');

    const before = text.split('\n');
    const after = next.split('\n');
    expect(after.length).toBe(before.length);
    const changed = before.filter((line, i) => line !== after[i]);
    expect(changed).toEqual(['      "0": { "$value": "#ffffff" },']);
  });
});

describe('normalization never leaks to disk (FR-1.2a)', () => {
  it('an unrelated edit leaves loose-typed tokens untouched on disk', () => {
    const text = readFixture('reference/default.tokens.json');
    const next = setTokenValue(text, ['color', 'neutral', '0'], '#fefefe');

    // The loosely-typed `font.family` group keeps its on-disk `text` $type and
    // value form — normalization is display-only.
    expect(next).toContain('"$type": "text"');
    expect(next).toContain('"sans": { "$value": "Inter"');

    const root = parseDocument(next).document!.root;
    const family = findNode(root, ['font', 'family']) as GroupNode;
    const sans = findNode(root, ['font', 'family', 'sans']) as TokenNode;
    expect(family.type).toBe('text'); // on-disk loose $type preserved
    expect(sans.value).toBe('Inter');
    expect(effectiveType(root, ['font', 'family', 'sans'])).toBe('text');
  });
});
