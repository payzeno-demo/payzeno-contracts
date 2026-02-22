/**
 * Package manifests for the generated trees.
 *
 * These are the files that make the cross-repo dependency real:
 * `python/pyproject.toml` is what `payzeno-ledger` resolves
 * `payzeno-contracts==3.4.0` against, and `java/pom.xml` is what
 * `payzeno-billing-legacy` resolves `com.payzeno:payzeno-contracts-java:3.4.0`
 * against. Both interpolate `CONTRACTS_VERSION`; neither is hand-edited.
 */

import { CONTRACTS_VERSION } from '../version';
import type { EmittedFile } from './emitters/emitter';
import { DeterministicWriter } from './writer';
import type { WriteMode, WriteReport } from './writer';

const PYPI_DESCRIPTION =
  'Generated Pydantic models for the Payzeno shared contracts. ' +
  'Source of truth is @payzeno/contracts (TypeScript).';

const MAVEN_DESCRIPTION =
  'Generated Java records for the Payzeno shared contracts. ' +
  'Source of truth is @payzeno/contracts (TypeScript).';

export function pythonManifest(writer: DeterministicWriter): EmittedFile {
  const contents = [
    writer.banner('#', 'manifest.ts (writePythonManifest)'),
    '',
    '[build-system]',
    'requires = ["hatchling>=1.24"]',
    'build-backend = "hatchling.build"',
    '',
    '[project]',
    'name = "payzeno-contracts"',
    `version = "${CONTRACTS_VERSION}"`,
    `description = "${PYPI_DESCRIPTION}"`,
    'readme = "README.md"',
    'requires-python = ">=3.11"',
    'license = { text = "UNLICENSED" }',
    'authors = [{ name = "Payzeno Platform", email = "platform@payzeno.com" }]',
    'dependencies = [',
    '  "pydantic>=2.7,<3",',
    ']',
    '',
    '[project.urls]',
    'Source = "https://github.com/payzeno/payzeno-contracts"',
    '',
    '[tool.hatch.build.targets.wheel]',
    'packages = ["payzeno_contracts"]',
    '',
    '[tool.hatch.build.targets.sdist]',
    'include = ["payzeno_contracts", "pyproject.toml"]',
    '',
  ].join('\n');

  return { path: 'pyproject.toml', contents, symbols: [] };
}

export function javaManifest(writer: DeterministicWriter): EmittedFile {
  const contents = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!--',
    writer.banner(' ', 'manifest.ts (writeJavaManifest)'),
    '-->',
    '<project xmlns="http://maven.apache.org/POM/4.0.0"',
    '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 ' +
      'http://maven.apache.org/xsd/maven-4.0.0.xsd">',
    '  <modelVersion>4.0.0</modelVersion>',
    '',
    '  <groupId>com.payzeno</groupId>',
    '  <artifactId>payzeno-contracts-java</artifactId>',
    `  <version>${CONTRACTS_VERSION}</version>`,
    '  <packaging>jar</packaging>',
    '',
    '  <name>payzeno-contracts-java</name>',
    `  <description>${MAVEN_DESCRIPTION}</description>`,
    '',
    '  <properties>',
    '    <maven.compiler.release>17</maven.compiler.release>',
    '    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>',
    '    <jackson.version>2.15.4</jackson.version>',
    '  </properties>',
    '</project>',
    '',
  ].join('\n');

  return { path: 'pom.xml', contents, symbols: [] };
}

/** Write `python/pyproject.toml`. */
export function writePythonManifest(
  outDir: string,
  writer: DeterministicWriter = new DeterministicWriter(),
  mode: WriteMode = 'write',
): WriteReport {
  return writer.writeAll([pythonManifest(writer)], outDir, mode);
}

/**
 * Write `java/pom.xml`.
 *
 * Only ever called by `pnpm run codegen:java`, which only ever runs when a
 * human remembers. See PAY-1996.
 */
export function writeJavaManifest(
  outDir: string,
  writer: DeterministicWriter = new DeterministicWriter(),
  mode: WriteMode = 'write',
): WriteReport {
  return writer.writeAll([javaManifest(writer)], outDir, mode);
}
