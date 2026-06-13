// Loose -> canonical $type map (FR-1.2a, PRD §6 design note).
//
// CoupleFi's tokens are a Figma export that is DTCG-shaped but loosely typed.
// This table relabels loose types to canonical DTCG ones FOR DISPLAY/RESOLUTION
// ONLY — it is never written back unless the user explicitly remaps (the
// migration pass). A table, not per-type code, so improving the mapping is a
// config change.
//
// Phase 1 scope: $type relabels only. The color value-form upgrade
// (hex-string -> structured color object) is Phase 2. The unitless
// `number` -> `dimension`/`fontWeight` case is intentionally NOT in this table:
// it is ambiguous from the $type alone (a genuine ratio like a line-height is a
// real `number`), so disambiguating it needs group context + CoupleFi's unit
// policy, which is deferred to the migration work, not this display helper.

import type { DtcgType } from '../model/index.js';

/** Loose on-disk `$type` string -> canonical DTCG `$type`. */
export const LOOSE_TYPE_MAP: Readonly<Record<string, DtcgType>> = {
  text: 'fontFamily',
};

/**
 * Map a raw on-disk `$type` to its canonical DTCG type for display. Unknown or
 * already-canonical types pass through unchanged.
 */
export function normalizeType(rawType: string): string {
  return LOOSE_TYPE_MAP[rawType] ?? rawType;
}
