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
    private readonly writer: DeterministicWriter,
  ) {}

  async run(opts: CodegenOptions): Promise<CodegenReport> {
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

  }
}
