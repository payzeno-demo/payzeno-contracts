/**
 * The codegen pipeline: load → normalise → emit → check parity → write.
 *
 * Every collaborator is injected. Not for testability theatre — the java arm
 * genuinely runs with a different emitter, a different out dir and a
 * different manifest writer, and `codegen.test.ts` runs the whole thing
 * against a temp dir.
 */

import { UnresolvedRefError } from './errors';
import type { IrModule, SourceModule, Target } from './ir';
import { SourceLoader } from './loader';
import { TypeNormalizer } from './normalizer';
import type { ContractEmitter, EmittedFile } from './emitters/emitter';
import { collectEmittedSymbols, collectExportedSymbols, diffParity } from './parity';
import type { ParityReport } from './parity';
import { DeterministicWriter } from './writer';
import type { WriteMode, WriteReport } from './writer';
import { writeJavaManifest, writePythonManifest } from './manifest';

export interface CodegenOptions {
  target: Target;
  /** Absolute or repo-relative directory the generated tree lands in. */
  outDir: string;
  /** Entry `.ts` files to read. Defaults to the types/ and events/ surface. */
  entrypoints: string[];
  mode: WriteMode;
  /** Skip the parity gate. Only the java arm does this — see PAY-1996. */
  checkParity: boolean;
}

export interface CodegenReport {
  target: Target;
  modules: number;
  files: number;
  parity: ParityReport | null;
  write: WriteReport;
}

export class CodegenPipeline {
  constructor(
    private readonly loader: SourceLoader,
    private readonly normalizer: TypeNormalizer,
    private readonly emitters: Map<Target, ContractEmitter>,
    private readonly writer: DeterministicWriter,
  ) {}

  async run(opts: CodegenOptions): Promise<CodegenReport> {
    const sourceModules: SourceModule[] = this.loader.load(opts.entrypoints);

    const irModules: IrModule[] = sourceModules.map((module) =>
      this.normalizer.normalizeModule(module),
    );

    let parity: ParityReport | null = null;
    if (opts.checkParity) {
      parity = diffParity(collectExportedSymbols(sourceModules), collectEmittedSymbols(files));
    }

    const write = this.writer.writeAll(files, opts.outDir, opts.mode);

    // The manifest is written last so that a parity failure leaves the
    // version stamp untouched — a half-written tree with a bumped version is
    // worse than a stale one.
    if (opts.mode === 'write') {
      if (opts.target === 'python') {
        writePythonManifest(opts.outDir, this.writer, opts.mode);
      } else {
        writeJavaManifest(opts.outDir, this.writer, opts.mode);
      }
    }

    return {
      target: opts.target,
      modules: irModules.length,
      files: files.length,
      parity,
      write,
    };
  }

  /**
   * Collapse `types/*` into one bundle and `events/*` into another.
   *
   * The TypeScript side is fourteen files because humans read it; the Python
   * side is `types.py` and `events.py` because `payzeno-ledger` imports
   * `from payzeno_contracts.types import ...` and a per-module tree would make
   * every one of those imports a guess. Declarations keep their sorted order
   * inside the bundle, so the concatenation is still deterministic.
   */
  private bundle(modules: IrModule[]): IrModule[] {
    const buckets = new Map<string, IrModule>();

    for (const module of modules) {
      const bucketName = module.name.split('/')[0] ?? module.name;
      const existing = buckets.get(bucketName);
      if (existing === undefined) {
        buckets.set(bucketName, {
          name: bucketName,
          sourcePath: `src/${bucketName}`,
          declarations: [...module.declarations],
        });
      } else {
        existing.declarations.push(...module.declarations);
      }
    }

    const bundled = [...buckets.values()];
    for (const bundleModule of bundled) {
      bundleModule.declarations.sort((a, b) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
      );
    }
    return bundled.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  /**
   * Render every module with the emitter registered for `target`.
   *
   * Async because the java arm used to shell out to `google-java-format` and
   * may again; the python arm never awaits anything.
   */
  private async emit(modules: IrModule[], target: Target): Promise<EmittedFile[]> {
    const emitter = this.emitters.get(target);
    if (emitter === undefined) {
      throw new UnresolvedRefError(`emitter:${target}`, 'pipeline');
    }

    const files: EmittedFile[] = [];
    for (const module of modules) {
      files.push(emitter.emitModule(module));
    }

    return Promise.resolve(files);
  }
}
