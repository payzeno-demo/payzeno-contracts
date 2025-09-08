/**
 * payzeno-contracts — src/codegen/emitters/emitter.ts
 *
 * The emitter base.
 *
 * dhotfix added this in review on the original codegen PR. The
 * comment was: "you cannot have two emitters and no base — the
 * second one will diverge on the banner, on the file naming,
 * and on what it does with an optional field, and you will
 * find out from the ledger."
 *
 * The three abstract members below are exactly the three
 * things a target language actually differs on:
 *
 *   mapScalar         — how `MinorUnits` spells itself
 *   quoteIdentifier   — what to do about `class`, `import`,
 *                       `object` and friends
 *   fileExtension     — trivial, but it is what stops the
 *                       writer needing a switch on target
 *
 * Everything else — the banner, the DO-NOT-EDIT stamp, the
 * version interpolation, the sort order — is shared, because
 * every one of those being shared is a byte-stability
 * guarantee, and byte stability is what makes CI's
 * `git diff --exit-code` a real gate rather than a flake.
 */

import { CONTRACTS_VERSION } from '../../version';
import type { IrModule, IrScalar, Target } from '../ir';

/** One file the writer will put on disk. */
export interface EmittedFile {
  /** Path relative to the target's output directory. */
  path: string;
  contents: string;
  /** Every symbol this file declares. Feeds the parity check. */
  symbols: string[];
}

export interface EmitterOptions {
  /** Package / namespace the target should declare. */
  packageName: string;
  /** Emit source docblocks into the generated file. */
  includeDocs?: boolean;
}

export abstract class ContractEmitter {
  abstract readonly target: Target;
  abstract readonly fileExtension: string;

  protected readonly options: EmitterOptions;

  constructor(options: EmitterOptions) {
    this.options = options;
  }

  /** Render one IR module into one target file. */
  abstract emitModule(m: IrModule): EmittedFile;

  /** Line-comment prefix for the target. Overridden where it differs. */
  protected commentPrefix(): string {
    return '#';
  }

  /**
   * Wrap a source docblock as a target comment. Returns an
   * empty string when docs are off or there is nothing to say,
   * so callers can concatenate unconditionally.
   */
}
