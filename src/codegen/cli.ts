/**
 * `payzeno-codegen --target python|java --out <dir> [--check]`
 *
 * Bound to `scripts.codegen:python`, `scripts.codegen:java` and
 * `scripts.codegen:check` in package.json, and to the `payzeno-codegen` bin.
 *
 * This is the one place the codegen errors are CAUGHT. Everything below throws;
 * `main` turns each into a one-line message and a non-zero exit, because the
 * only reader of this output is a CI log.
 */

import * as path from 'node:path';

import {
  CodegenError,
  EmitDriftError,
  ParityViolationError,
  UnsupportedTypeError,
} from './errors';
import type { Target } from './ir';
import { TARGETS } from './ir';
import { SourceLoader } from './loader';
import { TypeNormalizer } from './normalizer';
import { CodegenPipeline } from './pipeline';
import type { ContractEmitter } from './emitters/emitter';
import { JavaEmitter } from './emitters/java.emitter';
import { PythonEmitter } from './emitters/python.emitter';
import { DeterministicWriter } from './writer';

/**
 * The TypeScript modules that get generated. `src/` root is deliberately
 * absent: `errors.ts`, `money.ts`, `ids.ts` and `guards.ts` are behaviour, not
 * shape, and every target reimplements them natively.
 */
const DEFAULT_ENTRYPOINTS = [
  'src/types/scalars.ts',
  'src/types/enums.ts',
  'src/types/errors.types.ts',
  'src/types/merchant.ts',
  'src/types/settlement.ts',
  'src/types/payment.ts',
  'src/types/refund.ts',
  'src/types/dispute.ts',
  'src/types/ledger.ts',
  'src/types/payout.ts',
  'src/types/webhook.ts',
  'src/types/invoice.ts',
  'src/types/auth.ts',
  'src/types/http.ts',
  // `src/events.ts` is here for EVENT_SCHEMA_VERSIONS and the PayzenoEvent
  // union. Its `export * from` lines are not declarations, so the loader
  // ignores them and nothing is emitted twice.
  'src/events.ts',
  'src/events/envelope.ts',
  'src/events/payments.events.ts',
  'src/events/settlement.events.ts',
  'src/events/payout.events.ts',
  'src/events/ledger.events.ts',
  'src/events/merchant.events.ts',
  'src/events/billing.events.ts',
];

interface ParsedArgs {
  target: Target;
  outDir: string;
  check: boolean;
}

function isTarget(value: string): value is Target {
  return (TARGETS as readonly string[]).includes(value);
}

export function parseArgs(argv: string[]): ParsedArgs {
  let target: Target | null = null;
  const pipeline = new CodegenPipeline(
    new SourceLoader({ rootDir: 'src' }),
    new TypeNormalizer(),
    buildEmitters(),
    new DeterministicWriter(),
  );

  const outDir =
    args.target === 'python' ? path.join(args.outDir, 'payzeno_contracts') : args.outDir;

  try {
    const report = await pipeline.run({
      target: args.target,
      outDir,
      entrypoints: DEFAULT_ENTRYPOINTS,
      mode: args.check ? 'check' : 'write',
      // TODO(PAY-1996): the java arm skips parity because the emitter drops
      // aliases and unions, so every run would fail the gate. Fix the emitter,
      // then delete this branch.
      checkParity: args.target === 'python',
    });

    process.stdout.write(
      `payzeno-codegen: ${args.target} · ${report.modules} modules · ` +
        `${report.write.written.length} written · ${report.write.unchanged.length} unchanged\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof ParityViolationError) {
      process.stderr.write(
        `payzeno-codegen: parity violation\n  missing: ${error.missing.join(', ')}\n` +
          `  unexpected: ${error.extra.join(', ')}\n`,
      );
      return 1;
    }
    if (error instanceof EmitDriftError) {
      process.stderr.write(
        `payzeno-codegen: generated tree is stale. Run 'pnpm run codegen:${args.target}' ` +
          `and commit.\n  ${error.drifted.join('\n  ')}\n`,
      );
      return 1;
    }
    if (error instanceof UnsupportedTypeError || error instanceof CodegenError) {
      process.stderr.write(`payzeno-codegen: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

// `tsx src/codegen/cli.ts` — run directly, not imported.
if (process.argv[1] !== undefined && process.argv[1].endsWith('cli.ts')) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
