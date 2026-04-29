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
 * CI job asserts it again without Node's help. Two gates, because a
 * version skew here is invisible until a consumer deserialises a payload
 * that no longer has the shape its pinned typings promised.
 *
 * Bump rule (docs/adr/0002): additive is a MINOR. Removing an exported
 * symbol, narrowing a type, or making an optional field required is a
 * MAJOR — including the cases that "obviously" nobody depends on. Three
 * services deserialise these and two of them deploy on their own
 * schedule, so "obviously nobody" is not a fact anyone here can check.
 *
 * `API_VERSION` is a DIFFERENT axis. It is the public, date-stamped
