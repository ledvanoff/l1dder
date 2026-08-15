/**
 * Registry symbol checks against a TypeScript index.
 *
 * Separated from path/orphan/cycle checks so filesystem graph validation and
 * code-index validation stay independently testable.
 */

import type { CodeSymbol, DiscoveredSymbolKind } from '@l1dder/core';
import type { ProjectRegistry } from '@l1dder/schemas';

/** Stable codes for symbol/index validation findings. */
export type RegistrySymbolIssueCode =
  | 'REGISTRY_SYMBOL_MISSING'
  | 'REGISTRY_SYMBOL_EXPORT_PATH'
  | 'REGISTRY_SYMBOL_DUPLICATE'
  | 'REGISTRY_SYMBOL_CROSS_PACKAGE'
  | 'REGISTRY_SYMBOL_SIMILAR';

/** Symbol-check finding (merged into {@link RegistryIssue} by the validator). */
export interface RegistrySymbolIssue {
  readonly code: RegistrySymbolIssueCode;
  readonly ref: string;
  readonly message: string;
  readonly path?: string;
  readonly severity: 'error' | 'warning';
}

/**
 * Compare the manifest `symbols` collection to an indexed code snapshot.
 *
 * Also flags same-package public-name collisions (error), cross-package name
 * reuse (warning), and similar public names (warning). Never throws.
 *
 * @param registry - Schema-valid project registry
 * @param indexed - Symbols discovered by {@link SymbolIndexerPort}
 * @returns Issues (may include warnings)
 */
export function collectSymbolIssues(
  registry: ProjectRegistry,
  indexed: readonly CodeSymbol[],
): RegistrySymbolIssue[] {
  const issues: RegistrySymbolIssue[] = [];

  const byNameAndFile = new Map<string, CodeSymbol>();
  for (const symbol of indexed) {
    byNameAndFile.set(`${symbol.name}\0${symbol.file}`, symbol);
  }

  for (const entry of registry.symbols) {
    const found = byNameAndFile.get(`${entry.name}\0${entry.file}`);
    if (found === undefined) {
      const fileExists = indexed.some((symbol) => symbol.file === entry.file);
      issues.push({
        code: 'REGISTRY_SYMBOL_MISSING',
        ref: entry.id,
        message: fileExists
          ? `Manifest symbol ${entry.id} (${entry.name}) is not an exported declaration in ${entry.file}`
          : `Manifest symbol ${entry.id} file does not exist or has no matching export: ${entry.file}`,
        path: entry.file,
        severity: 'error',
      });
      continue;
    }

    if (entry.export_path !== undefined) {
      if (found.exportPath !== entry.export_path) {
        issues.push({
          code: 'REGISTRY_SYMBOL_EXPORT_PATH',
          ref: entry.id,
          message:
            found.exportPath === undefined
              ? `Manifest symbol ${entry.id} declares export_path "${entry.export_path}" but ${entry.name} is not re-exported by that barrel`
              : `Manifest symbol ${entry.id} declares export_path "${entry.export_path}" but code exposes "${found.exportPath}"`,
          path: entry.file,
          severity: 'error',
        });
      }
    }
  }

  collectDuplicatePublicNameIssues(indexed, issues);
  collectCrossPackageNameIssues(indexed, issues);
  collectSimilarPublicNameIssues(indexed, issues);

  return issues;
}

/**
 * ERROR when the same public name is exported from two files in one package
 * barrel (`package` + `exportPath` identical).
 *
 * @param indexed - Indexed symbols
 * @param issues - Mutable accumulator
 */
function collectDuplicatePublicNameIssues(
  indexed: readonly CodeSymbol[],
  issues: RegistrySymbolIssue[],
): void {
  const groups = new Map<string, CodeSymbol[]>();

  for (const symbol of indexed) {
    if (symbol.exportPath === undefined) continue;
    const key = `${symbol.package ?? ''}\0${symbol.exportPath}\0${symbol.name}`;
    const list = groups.get(key) ?? [];
    list.push(symbol);
    groups.set(key, list);
  }

  const keys = [...groups.keys()].sort();
  for (const key of keys) {
    const locations = groups.get(key) ?? [];
    const uniqueFiles = uniqueSorted(locations.map((item) => item.file));
    if (uniqueFiles.length < 2) continue;

    const name = locations[0]?.name ?? key;
    const left = uniqueFiles[0] ?? '';
    const right = uniqueFiles[1] ?? '';
    issues.push({
      code: 'REGISTRY_SYMBOL_DUPLICATE',
      ref: name,
      message: `Duplicate public symbol "${name}" at ${left} and ${right}`,
      severity: 'error',
    });
  }
}

/**
 * WARNING when the same public name appears in two different packages.
 *
 * Registry-first signal for AI review; does not fail the check.
 *
 * @param indexed - Indexed symbols
 * @param issues - Mutable accumulator
 */
function collectCrossPackageNameIssues(
  indexed: readonly CodeSymbol[],
  issues: RegistrySymbolIssue[],
): void {
  const publicByName = new Map<string, CodeSymbol[]>();

  for (const symbol of indexed) {
    if (symbol.exportPath === undefined) continue;
    const list = publicByName.get(symbol.name) ?? [];
    list.push(symbol);
    publicByName.set(symbol.name, list);
  }

  const names = [...publicByName.keys()].sort();
  for (const name of names) {
    const locations = publicByName.get(name) ?? [];
    const byPackage = new Map<string, CodeSymbol[]>();
    for (const symbol of locations) {
      const pkg = symbol.package ?? '';
      const list = byPackage.get(pkg) ?? [];
      list.push(symbol);
      byPackage.set(pkg, list);
    }

    const packages = [...byPackage.keys()].sort();
    if (packages.length < 2) continue;

    const leftPkg = packages[0] ?? '';
    const rightPkg = packages[1] ?? '';
    const leftFile = uniqueSorted(
      (byPackage.get(leftPkg) ?? []).map((item) => item.file),
    )[0] ?? '';
    const rightFile = uniqueSorted(
      (byPackage.get(rightPkg) ?? []).map((item) => item.file),
    )[0] ?? '';

    issues.push({
      code: 'REGISTRY_SYMBOL_CROSS_PACKAGE',
      ref: name,
      message: `Public symbol "${name}" appears in different packages at ${leftFile} and ${rightFile}`,
      severity: 'warning',
    });
  }
}

/**
 * Warn when two public symbols have similar names (excluding project conventions).
 *
 * @param indexed - Indexed symbols
 * @param issues - Mutable accumulator
 */
function collectSimilarPublicNameIssues(
  indexed: readonly CodeSymbol[],
  issues: RegistrySymbolIssue[],
): void {
  const publicSymbols = indexed
    .filter((symbol) => symbol.exportPath !== undefined)
    .slice()
    .sort((a, b) => {
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      if (a.file === b.file) return 0;
      return a.file < b.file ? -1 : 1;
    });

  const reported = new Set<string>();

  for (let i = 0; i < publicSymbols.length; i++) {
    const left = publicSymbols[i];
    if (left === undefined) continue;
    for (let j = i + 1; j < publicSymbols.length; j++) {
      const right = publicSymbols[j];
      if (right === undefined) continue;
      if (left.name === right.name) continue; // exact name handled separately
      if (!areSimilarSymbols(left, right)) continue;

      const key = [left.name, right.name].sort().join('\0');
      if (reported.has(key)) continue;
      reported.add(key);

      issues.push({
        code: 'REGISTRY_SYMBOL_SIMILAR',
        ref: left.name,
        message: `Similar public symbol names "${left.name}" (${left.file}) and "${right.name}" (${right.file}) — review for accidental duplication`,
        severity: 'warning',
      });
    }
  }
}

/**
 * Similarity heuristic for AI-review warnings (not automatic fail).
 *
 * Excludes project conventions:
 * - `X` / `XSchema` when the Schema side has kind `schema`
 * - case-only pairs where one side is type/interface and the other is
 *   function/const (`Ok` / `ok`)
 *
 * @param left - First public symbol
 * @param right - Second public symbol
 * @returns `true` when names look confusingly similar
 */
function areSimilarSymbols(left: CodeSymbol, right: CodeSymbol): boolean {
  const a = left.name;
  const b = right.name;
  if (a === b) return false;

  if (isZodSchemaPair(left, right)) {
    return false;
  }

  if (a.toLowerCase() === b.toLowerCase()) {
    if (isTypeValueCasePair(left.kind, right.kind)) {
      return false;
    }
    return true;
  }

  return levenshtein(a, b) === 1;
}

/**
 * Whether the pair is the conventional Zod type + `*Schema` export.
 *
 * @param left - First symbol
 * @param right - Second symbol
 * @returns `true` when one name is the other plus `Schema` and that side is a schema
 */
function isZodSchemaPair(left: CodeSymbol, right: CodeSymbol): boolean {
  if (left.name === `${right.name}Schema` && left.kind === 'schema') {
    return true;
  }
  if (right.name === `${left.name}Schema` && right.kind === 'schema') {
    return true;
  }
  return false;
}

/**
 * Whether kinds match the `Ok` type + `ok` function/const convention.
 *
 * @param leftKind - First kind
 * @param rightKind - Second kind
 * @returns `true` when one is type-like and the other is value-like
 */
function isTypeValueCasePair(
  leftKind: DiscoveredSymbolKind,
  rightKind: DiscoveredSymbolKind,
): boolean {
  return (
    (isTypeLikeKind(leftKind) && isValueLikeKind(rightKind)) ||
    (isTypeLikeKind(rightKind) && isValueLikeKind(leftKind))
  );
}

/**
 * @param kind - Discovered kind
 * @returns `true` for type/interface declarations
 */
function isTypeLikeKind(kind: DiscoveredSymbolKind): boolean {
  return kind === 'type' || kind === 'interface';
}

/**
 * @param kind - Discovered kind
 * @returns `true` for function/const declarations
 */
function isValueLikeKind(kind: DiscoveredSymbolKind): boolean {
  return kind === 'function' || kind === 'const';
}

/**
 * Classic Levenshtein edit distance.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = (prev[j] ?? 0) + 1;
      const ins = (curr[j - 1] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(del, ins, sub);
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j] ?? 0;
    }
  }

  return prev[b.length] ?? 0;
}

/**
 * @param values - Paths or labels
 * @returns Deduplicated byte-sorted list
 */
function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
