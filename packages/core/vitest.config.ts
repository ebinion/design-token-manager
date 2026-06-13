import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // core/ runs entirely outside the VS Code Extension Host (AC-11).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
