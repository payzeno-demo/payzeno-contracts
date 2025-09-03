/**
 * The only thing in this package that touches the filesystem.
 *
 * `mode: 'check'` is what makes CI's `git diff --exit-code` meaningful: it
 * compares byte-for-byte against what is on disk and throws `EmitDriftError`
 * rather than writing, so `codegen:check` can run on a read-only checkout.
 *
 * Determinism rules, all of them load-bearing:
 *   - files are sorted by path before writing
 *   - line endings are LF, always, including on Windows
 *   - exactly one trailing newline
 *   - the banner is stamped with CONTRACTS_VERSION and nothing else — no
 *     timestamp, no hostname, no git sha. Any of those would make every run
 *     produce a diff and the gate would be turned off within a week.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { CONTRACTS_VERSION } from '../version';
import { EmitDriftError } from './errors';
import type { EmittedFile } from './emitters/emitter';

export type WriteMode = 'write' | 'check';

export interface WriteReport {
  written: string[];
  unchanged: string[];
  drifted: string[];
  outDir: string;
}

export class DeterministicWriter {
  writeAll(files: EmittedFile[], outDir: string, mode: WriteMode): WriteReport {
    const report: WriteReport = { written: [], unchanged: [], drifted: [], outDir };

    const existing = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null;

    if (existing === normalized) {
      report.unchanged.push(file.path);
      return;
    }

    if (mode === 'check') {
      report.drifted.push(file.path);
      return;
    }

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, normalized, 'utf8');
    report.written.push(file.path);
  }

  /** CRLF → LF, strip trailing whitespace, exactly one final newline. */
  private normalize(contents: string): string {
  }
}
