// Test-only helper: load the repo's shared fixture token files (fixtures/).
// Lives outside *.test.ts so it isn't collected as a suite, but is typechecked.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// packages/core/src/__fixtures__ -> repo root is four levels up.
const repoRoot = join(here, '..', '..', '..', '..');

/** Read a fixture file under `fixtures/`, e.g. `readFixture('theme/light.tokens.json')`. */
export function readFixture(relativePath: string): string {
  return readFileSync(join(repoRoot, 'fixtures', relativePath), 'utf8');
}
