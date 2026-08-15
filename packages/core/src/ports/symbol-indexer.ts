/**
 * Port for indexing exported TypeScript symbols in a monorepo.
 *
 * Implementations stay lightweight (convention-based parsers). The TypeScript
 * compiler API is intentionally out of scope for CLI bundle size reasons.
 *
 * Semantic FEAT/UC/MODEL links are NOT discovered from source — they come from
 * the registry manifest and are attached by a separate linking step.
 */

/**
 * Syntactic kind discovered from an exported declaration.
 *
 * Manifest-only semantic labels (`service` / `port` / `adapter`) are not
 * produced by the indexer.
 */
export type DiscoveredSymbolKind =
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'function'
  | 'const'
  | 'schema';

/**
 * One exported TypeScript declaration discovered under package `src` trees.
 *
 * `featureIds` / `usecaseIds` / `modelIds` are empty until linked from the
 * registry manifest. `exportPath` is set only when a package barrel re-exports
 * the symbol (`.` or `./testing`).
 */
export interface CodeSymbol {
  readonly name: string;
  readonly kind: DiscoveredSymbolKind;
  /** Repo-relative path with POSIX separators. */
  readonly file: string;
  readonly package?: string;
  /** Key from the package `exports` map when publicly re-exported. */
  readonly exportPath?: string;
  readonly featureIds: readonly string[];
  readonly usecaseIds: readonly string[];
  readonly modelIds: readonly string[];
}

/**
 * Indexes exported TypeScript declarations for registry symbol checks.
 */
export interface SymbolIndexerPort {
  /**
   * Scan workspace package `src` trees under `projectRoot` and return symbols.
   *
   * Never throws for ordinary missing/unreadable files — skip and continue.
   * Test/spec files (`*.test.ts`, `*.spec.ts`) are ignored. Non-exported
   * helpers never appear in the result.
   *
   * @param projectRoot - Absolute project root
   * @returns Discovered symbols (stable order is not required; consumers sort)
   */
  index(projectRoot: string): Promise<readonly CodeSymbol[]>;
}
