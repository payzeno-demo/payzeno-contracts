/**
 * payzeno-contracts — src/version.ts
 *
 * The single version string four repos reference.
 *
 * `CONTRACTS_VERSION` MUST equal, byte for byte:
 *   - `package.json`            .version
 *   - `python/pyproject.toml`   [project] version
 *   - `java/pom.xml`            <version> of payzeno-contracts-java
 *
 * `src/version.test.ts` asserts all four, and the `version-consistency`
