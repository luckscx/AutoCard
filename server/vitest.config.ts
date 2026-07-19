import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// 把 `./Foo.js` 形式的相对 ESM 导入解析到对应的 `.ts` 源码
function tsExtensionResolver() {
  return {
    name: 'ts-extension-resolver',
    enforce: 'pre' as const,
    async resolveId(source: string, importer: string | undefined) {
      if (!importer) return null;
      // 仅处理相对路径且以 .js 结尾的导入
      if (!source.startsWith('.') || !source.endsWith('.js')) return null;
      const base = source.slice(0, -3); // 去掉 .js
      const absBase = path.resolve(path.dirname(importer), base);
      const candidates = [`${absBase}.ts`, `${absBase}.tsx`, path.join(absBase, 'index.ts')];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [tsExtensionResolver()],
  resolve: {
    alias: {
      '@autocard/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/game/battle/__tests__/**', 'node_modules/**'],
    globals: false,
    server: {
      deps: { inline: [/@autocard\/shared/] },
    },
  },
});
