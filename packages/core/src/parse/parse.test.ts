import { describe, expect, it } from 'vitest';
import { readFixture } from '../__fixtures__/load.js';
import type { GroupNode, TokenNode } from '../model/index.js';
import { findNode } from '../model/index.js';
import { parseDocument } from './index.js';

describe('parseDocument', () => {
  it('parses a valid multi-group fixture with no errors', () => {
    const { document, errors } = parseDocument(
      readFixture('reference/default.tokens.json'),
    );
    expect(errors).toEqual([]);
    expect(document).toBeDefined();
    expect(document!.root.children.map((c) => c.name)).toEqual([
      'color',
      'size',
      'font',
      'motion',
    ]);
  });

  it('retains the original text verbatim on the document', () => {
    const text = readFixture('theme/light.tokens.json');
    const { document } = parseDocument(text);
    expect(document!.text).toBe(text);
  });

  it('distinguishes groups from tokens by $value presence', () => {
    const { document } = parseDocument(
      readFixture('reference/default.tokens.json'),
    );
    const color = findNode(document!.root, ['color']);
    const white = findNode(document!.root, ['color', 'neutral', '0']);
    expect(color?.kind).toBe('group');
    expect(white?.kind).toBe('token');
    expect((white as TokenNode).value).toBe('#ffffff');
  });

  it('captures own $type, $description, $extensions verbatim (AC-3)', () => {
    const { document } = parseDocument(
      readFixture('reference/default.tokens.json'),
    );
    const unknown = findNode(document!.root, [
      'motion',
      'duration',
      'fast',
    ]) as TokenNode;
    expect(unknown.kind).toBe('token');
    expect(unknown.type).toBe('vendorDuration');
    expect(unknown.value).toBe('120ms');
    expect(unknown.description).toContain('round-trip');
    expect(unknown.extensions).toEqual({
      'io.couplefi.source': 'figma-variables',
    });
  });

  it('reads group-level $type without treating it as a child', () => {
    const { document } = parseDocument(
      readFixture('reference/default.tokens.json'),
    );
    const color = findNode(document!.root, ['color']) as GroupNode;
    expect(color.type).toBe('color');
    expect(color.children.map((c) => c.name)).toEqual(['neutral', 'blue']);
  });

  it('reports an object that is both a token and a group', () => {
    const { document, errors } = parseDocument(
      '{ "x": { "$value": 1, "child": { "$value": 2 } } }',
    );
    expect(findNode(document!.root, ['x'])?.kind).toBe('token');
    expect(errors.some((e) => e.message.includes('both $value'))).toBe(true);
  });

  it('reports malformed JSON instead of throwing', () => {
    const { errors } = parseDocument('{ "a": }');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-object top level', () => {
    const { document, errors } = parseDocument('[]');
    expect(document).toBeUndefined();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('parses cross-file alias values as raw strings', () => {
    const { document } = parseDocument(readFixture('theme/light.tokens.json'));
    const bg = findNode(document!.root, [
      'color',
      'background',
      'default',
    ]) as TokenNode;
    expect(bg.value).toBe('{color.neutral.0}');
  });
});
