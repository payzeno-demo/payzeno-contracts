import { defineConfig } from 'tsup';

/**
 * Multi-entry build. Every entry here MUST have a matching subpath in package.json
 * `exports` — the seven frozen entrypoints and nothing else. A consumer that reaches
 * into `@payzeno/contracts/dist/...` is doing it wrong and we will break them.
 *
 * `dts: true` is not optional: payzeno-api and payzeno-console consume this package
 * as types first and runtime second. If the .d.ts emit breaks, four repos stop typechecking.
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    events: 'src/events.ts',
    errors: 'src/errors.ts',
    guards: 'src/guards.ts',
    money: 'src/money.ts',
    ids: 'src/ids.ts',
    version: 'src/version.ts',
    'codegen/cli': 'src/codegen/cli.ts',
  },
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  // typescript is a devDependency used by the codegen loader only. It must never be
  // bundled into dist — that would drag a 6MB compiler into every consumer's install.
  external: ['typescript', 'node:fs', 'node:path'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
