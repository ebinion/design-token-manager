import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Output into the extension package so vsce packages the assets and the host
// can load them via asWebviewUri from its own extensionUri.
const outdir = '../extension/dist/webview';

// Emits begin/end markers for the .vscode background task problem matcher.
const watchLogPlugin = {
  name: 'watch-log',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd(() => console.log('[watch] build finished'));
  },
};

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/main.ts', 'src/styles.css'],
  bundle: true,
  outdir,
  entryNames: 'main',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
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
