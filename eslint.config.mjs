// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  // Node-run build/config scripts (esbuild.mjs, this file) — give them Node globals.
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  // G6 / AC-11: the editor-agnostic core must never import the VS Code API
  // (or the host-specific packages). This is the lint-time guarantee that the
  // token model stays unit-testable without the Extension Host.
  {
    files: ['packages/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vscode',
              message:
                'core/ must stay editor-agnostic — no vscode imports (G6 / AC-11).',
            },
          ],
          patterns: [
            {
              group: ['vscode', '@dtm/extension', '@dtm/extension/*', '@dtm/webview', '@dtm/webview/*'],
              message:
                'core/ must not depend on the VS Code host or the extension/webview layers (G6 / AC-11).',
            },
          ],
        },
      ],
    },
  },
);
