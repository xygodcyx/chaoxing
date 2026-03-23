import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  clean: true,
  minify: false,
  sourcemap: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
