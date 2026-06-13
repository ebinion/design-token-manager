import { describe, expect, it } from 'vitest';
import * as core from './index.js';

// Smoke test for the public barrel: proves @dtm/core loads outside the VS Code
// Extension Host (AC-11) and exposes the Day-2 API surface. Behavior is covered
// by the per-layer suites (parse/, model/, serialize/, roundtrip).
describe('@dtm/core barrel', () => {
  it('loads outside the VS Code Extension Host', () => {
    expect(core.CORE_VERSION).toBe('0.0.1');
  });

  it('exposes the parse + serialize + model API', () => {
    for (const name of [
      'parseDocument',
      'setTokenValue',
      'renameNode',
      'printDocument',
      'effectiveType',
      'displayType',
      'isAlias',
      'normalizeType',
    ] as const) {
      expect(typeof core[name]).toBe('function');
    }
  });
});
