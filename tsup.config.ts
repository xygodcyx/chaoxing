import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  minify: false,
  splitting: true,
  sourcemap: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  external: ['axios'],
  banner: {
    js: `#!/usr/bin/env node
    
/**
 * @project chaoxing
 * @author xygodcyx
 * @license CC BY-NC-SA 4.0
 * @prohibit Commercial use is strictly prohibited.
 * @description 本工具由 xygodcyx 原创, 仅供学习交流, 严禁任何形式的商业牟利。
 * @see https://github.com/xygodcyx/chaoxing
 */`,
  },
});
