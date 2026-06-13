import { describe, expect, it } from 'vitest';
import { readFixture } from '../__fixtures__/load.js';
import { parseDocument } from '../parse/index.js';
import {
  aliasTarget,
  displayType,
  effectiveType,
  findNode,
  isAlias,
  isKnownType,
  nodeChain,
  toReferencePath,
  walkNodes,
} from './index.js';

const reference = parseDocument(
  readFixture('reference/default.tokens.json'),
).document!.root;

describe('alias helpers', () => {
  it('recognizes curly-brace aliases', () => {
    expect(isAlias('{color.neutral.0}')).toBe(true);
    expect(isAlias('#ffffff')).toBe(false);
    expect(isAlias('{a} {b}')).toBe(false);
    expect(isAlias(8)).toBe(false);
  });

  it('extracts the dotted target of an alias', () => {
    expect(aliasTarget('{color.blue.500}')).toBe('color.blue.500');
    expect(aliasTarget('#ffffff')).toBeUndefined();
  });

  it('builds a dotted reference path', () => {
    expect(toReferencePath(['color', 'blue', '500'])).toBe('color.blue.500');
  });
});

describe('effectiveType / displayType', () => {
  it('inherits $type from the nearest ancestor group', () => {
    expect(effectiveType(reference, ['color', 'blue', '500'])).toBe('color');
    expect(effectiveType(reference, ['size', 'spacing', 'sm'])).toBe('number');
  });

  it('prefers a token-local $type over inheritance', () => {
    // motion.duration.fast sets its own $type.
    expect(effectiveType(reference, ['motion', 'duration', 'fast'])).toBe(
      'vendorDuration',
    );
  });

  it('returns undefined when no type is in scope', () => {
    expect(effectiveType(reference, ['nope'])).toBeUndefined();
  });

  it('normalizes loose types for display only (FR-1.2a)', () => {
    // font.family is loosely typed `text` on disk -> canonical fontFamily.
    expect(effectiveType(reference, ['font', 'family', 'sans'])).toBe('text');
    expect(displayType(reference, ['font', 'family', 'sans'])).toBe(
      'fontFamily',
    );
  });

  it('passes unknown types through unchanged for display', () => {
    expect(displayType(reference, ['motion', 'duration', 'fast'])).toBe(
      'vendorDuration',
    );
  });
});

describe('type knowledge', () => {
  it('classifies canonical vs unknown DTCG types', () => {
    expect(isKnownType('color')).toBe(true);
    expect(isKnownType('fontFamily')).toBe(true);
    expect(isKnownType('vendorDuration')).toBe(false);
    expect(isKnownType(undefined)).toBe(false);
  });
});

describe('tree navigation', () => {
  it('finds a node and its chain by path', () => {
    const node = findNode(reference, ['color', 'neutral', '0']);
    expect(node?.kind).toBe('token');
    const chain = nodeChain(reference, ['color', 'neutral', '0']);
    expect(chain?.map((n) => n.name)).toEqual(['', 'color', 'neutral', '0']);
  });

  it('returns undefined for a missing path', () => {
    expect(findNode(reference, ['color', 'missing'])).toBeUndefined();
  });

  it('walks every token in the tree', () => {
    const tokens = [...walkNodes(reference)].filter((n) => n.kind === 'token');
    // 6 colors + 4 sizes + 4 fonts + 1 motion = 15 tokens.
    expect(tokens.length).toBe(15);
  });
});
