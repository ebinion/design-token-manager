import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Emits begin/end markers so the .vscode background task's problem matcher
// knows when a watch rebuild starts and finishes (drives F5 preLaunchTask).
const watchLogPlugin = {
  name: 'watch-log',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd(() => console.log('[watch] build finished'));
  },
};

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  // `vscode` is provided by the host at runtime — never bundle it.
  // @dtm/core IS bundled in, so neither core source nor node_modules ship in the .vsix.
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  plugins: watch ? [watchLogPlugin] : [],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
