import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from './index.js';

// Placeholder smoke test — proves the Vitest gate runs without the Extension
// Host (AC-11). Replace/expand with the real parse/serialize round-trip,
// cross-file alias resolution, and cycle-detection golden tests (AC-4/5/7).
describe('@dtm/core', () => {
  it('loads outside the VS Code Extension Host', () => {
    expect(CORE_VERSION).toBe('0.0.1');
  });
});
