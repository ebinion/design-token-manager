/**
 * @dtm/core — the editor-agnostic DTCG token engine.
 *
 * This package contains ZERO `vscode` imports (enforced by ESLint, see
 * eslint.config.mjs) so it can be unit-tested without the Extension Host
 * (AC-11) and could move hosts later (G6).
 *
 * Layers, filled in during Phase 1 feature work (PRD §5.1 / §6):
 *   - model/     internal token model, abstracted from the on-disk DTCG shape
 *   - parse/     DTCG JSON -> model
 *   - serialize/ model -> JSON via a deterministic, minimal-diff formatter
 *   - resolve/   unified resolver for {alias} + $ref + $extends, with cycle detection
 *   - normalize/ loose -> canonical $type map (read/display-only)
 *   - color/     sRGB/hex color value handling
 */

/** Marker so consumers can confirm the core bundle loaded. Replace as the API grows. */
export const CORE_VERSION = '0.0.1';

export * from './model/index.js';
export * from './parse/index.js';
export * from './serialize/index.js';
export * from './resolve/index.js';
export * from './normalize/index.js';
export * from './color/index.js';
