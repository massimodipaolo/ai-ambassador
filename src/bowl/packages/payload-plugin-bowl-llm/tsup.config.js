import { postcssModules, sassPlugin } from 'esbuild-sass-plugin';
import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  // name: !options.watch ? 'production' : undefined,
  clean: true,
  sourcemap: options.watch ? true : false,
  tsconfig: options.watch ? 'tsconfig.json' : 'tsconfig.json',
  bundle: options.watch ? false : true,
  splitting: false,
  minify: false, // options.watch ? false : true,
  // keepNames: true,
  keepNames: true,
  treeShaking: true,
  dts: true,
  format: ['cjs'],
  target: ['esnext'],
  outDir: 'dist',
  skipNodeModulesBundle: true,
  entryPoints: ['src/index.ts'],
  entry: ['src/**/*(?<!test).{js,jsx,ts,tsx}'],
  external: ['react'],
  loader: {
    '.json': 'json',
  },
  esbuildOptions(options, context) {
    // options.outbase = './';
    options.chunkNames = 'chunks/[name]-[hash]';
    options.entryNames = '[dir]/[name]';
  },
  esbuildPlugins: [
    sassPlugin({
      type: 'style',
      filter: /\.module\.scss$/,
      transform: postcssModules({
        // localsConvention: 'camelCaseOnly'
      })
    }),
    sassPlugin({
      type: 'css',
      filter: /\.scss$/,
    }),
  ],
}));
