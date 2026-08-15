/**
 * Lightweight TypeScript public-symbol indexer (no TypeScript compiler API).
 *
 * Approach: convention-based regex parser over ESM named exports / barrels.
 * Why not compiler API: `typescript` is ~9 MB and would inflate `dist/cli.js`
 * (~495 KB baseline) by roughly 20×. Measured `packages/cli/dist/cli.js` after
 * HARD-4 registry CLI wiring (T-11): 494741 → 581924 bytes (+87183, ~17.6%);
 * still far below a compiler-API dependency.
 *
 * @packageDocumentation
 */

import type {
  CodeSymbol,
  DiscoveredSymbolKind,
  FileSystemPort,
  SymbolIndexerPort,
} from '@l1dder/core';
import { join } from 'node:path';

import {
  collectPackageTsFiles,
  listPackageDirs,
  toPosixRelative,
} from './package-ts-walk.js';

/** Dependencies for {@link TypeScriptSymbolIndexer}. */
export interface TypeScriptSymbolIndexerDeps {
  readonly fs: FileSystemPort;
}

/** Local export discovered inside a single source file. */
interface LocalExport {
  readonly name: string;
  readonly kind: DiscoveredSymbolKind;
}

/** One named re-export edge from a barrel (or intermediate) module. */
interface ReexportEdge {
  readonly localName: string;
  readonly exportedName: string;
  readonly fromModule: string;
  readonly star: boolean;
}

/**
 * Indexes exported TypeScript declarations via a light convention parser.
 *
 * Scans package `src` trees for `.ts` files, skips `*.test.ts` / `*.spec.ts`,
 * resolves package `exports` map keys to barrel sources, and marks
 * `exportPath` only for symbols re-exported through those barrels.
 */
export class TypeScriptSymbolIndexer implements SymbolIndexerPort {
  private readonly fs: FileSystemPort;

  constructor(deps: TypeScriptSymbolIndexerDeps) {
    this.fs = deps.fs;
  }

  /**
   * Scan packages under `projectRoot` and return discovered exported symbols.
   *
   * @param projectRoot - Absolute project root
   * @returns Discovered symbols (feature/usecase/model ids left empty)
   */
  async index(projectRoot: string): Promise<readonly CodeSymbol[]> {
    const packagesRoot = join(projectRoot, 'packages');
    const packageDirs = await listPackageDirs(this.fs, packagesRoot);
    const symbols: CodeSymbol[] = [];

    for (const packageDir of packageDirs) {
      const packageSymbols = await this.indexPackage(projectRoot, packageDir);
      symbols.push(...packageSymbols);
    }

    return symbols;
  }

  /**
   * Index one workspace package directory.
   *
   * @param projectRoot - Absolute project root
   * @param packageDir - Absolute package directory (`…/packages/<name>`)
   * @returns Symbols discovered in that package
   */
  private async indexPackage(
    projectRoot: string,
    packageDir: string,
  ): Promise<readonly CodeSymbol[]> {
    const packageJsonPath = join(packageDir, 'package.json');
    if (!(await this.fs.exists(packageJsonPath))) {
      return [];
    }

    let packageName: string | undefined;
    let exportBarrels = new Map<string, string>();
    try {
      const raw = await this.fs.readFile(packageJsonPath);
      const parsed = JSON.parse(raw) as PackageJsonShape;
      packageName = typeof parsed.name === 'string' ? parsed.name : undefined;
      exportBarrels = resolveExportBarrels(parsed.exports);
    } catch {
      return [];
    }

    const srcRoot = join(packageDir, 'src');
    if (!(await this.fs.exists(srcRoot))) {
      return [];
    }

    const sourceFiles = await collectPackageTsFiles(this.fs, srcRoot, 'source');
    const localExports = new Map<string, LocalExport[]>();
    const reexports = new Map<string, ReexportEdge[]>();

    for (const absFile of sourceFiles) {
      let content: string;
      try {
        content = await this.fs.readFile(absFile);
      } catch {
        continue;
      }
      const stripped = stripComments(content);
      const relFile = toPosixRelative(projectRoot, absFile);
      localExports.set(relFile, parseLocalExports(stripped));
      reexports.set(relFile, parseReexports(stripped, relFile));
    }

    const publicExports = resolvePublicExports(
      exportBarrels,
      localExports,
      reexports,
      toPosixRelative(projectRoot, packageDir),
    );

    const symbols: CodeSymbol[] = [];
    for (const [relFile, exports] of localExports) {
      for (const local of exports) {
        const exportPath = publicExports.get(publicKey(local.name, relFile));
        symbols.push({
          name: local.name,
          kind: local.kind,
          file: relFile,
          ...(packageName !== undefined ? { package: packageName } : {}),
          ...(exportPath !== undefined ? { exportPath } : {}),
          featureIds: [],
          usecaseIds: [],
          modelIds: [],
        });
      }
    }

    return symbols;
  }
}

/** Minimal `package.json` fields used by the indexer. */
interface PackageJsonShape {
  readonly name?: unknown;
  readonly exports?: unknown;
}

/**
 * Map package `exports` keys to barrel source paths relative to the package.
 *
 * @param exportsField - `package.json` `exports` value
 * @returns Map of export path (`.` / `./testing`) → package-relative `src/….ts`
 */
function resolveExportBarrels(
  exportsField: unknown,
): Map<string, string> {
  const result = new Map<string, string>();
  if (exportsField === undefined || exportsField === null) {
    // Convention fallback used by all L1DDER packages.
    result.set('.', 'src/index.ts');
    return result;
  }

  if (typeof exportsField === 'string') {
    const barrel = distPathToSrc(exportsField);
    if (barrel !== undefined) {
      result.set('.', barrel);
    }
    return result;
  }

  if (typeof exportsField !== 'object' || Array.isArray(exportsField)) {
    return result;
  }

  for (const [key, value] of Object.entries(
    exportsField as Record<string, unknown>,
  )) {
    const target = resolveExportTarget(value);
    if (target === undefined) continue;
    const barrel = distPathToSrc(target);
    if (barrel === undefined) continue;
    result.set(key, barrel);
  }

  return result;
}

/**
 * Pick a resolvable target string from an exports map entry.
 *
 * @param value - String target or conditional object
 * @returns Relative path like `./dist/index.js`, if any
 */
function resolveExportTarget(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const field of ['import', 'default', 'types'] as const) {
    const candidate = record[field];
    if (typeof candidate === 'string') return candidate;
  }
  return undefined;
}

/**
 * Convert a `dist/*.js` / `dist/*.d.ts` export target to `src/*.ts`.
 *
 * @param target - Path from package.json exports
 * @returns Package-relative source barrel path, or undefined when unmapped
 */
function distPathToSrc(target: string): string | undefined {
  const normalized = target.replace(/^\.\//u, '');
  if (normalized.startsWith('src/') && normalized.endsWith('.ts')) {
    return normalized;
  }
  const distMatch = /^(?:\.\/)?dist\/(.+)\.(?:js|d\.ts|mjs|cjs)$/u.exec(
    target,
  );
  if (distMatch?.[1] !== undefined) {
    return `src/${distMatch[1]}.ts`;
  }
  return undefined;
}

/**
 * Strip line and block comments without disturbing string contents naïvely.
 *
 * Good enough for L1DDER sources (no exotic comment/string edge cases in
 * export declarations). Strings are preserved roughly so `//` inside them
 * is less likely to truncate code.
 *
 * @param source - Raw TypeScript source
 * @returns Source with comments replaced by whitespace
 */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < source.length) {
        const c = source[i] ?? '';
        out += c;
        if (c === '\\') {
          i += 1;
          if (i < source.length) {
            out += source[i] ?? '';
          }
          i += 1;
          continue;
        }
        if (c === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      out += '  ';
      i += 2;
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          out += '  ';
          i += 2;
          break;
        }
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      continue;
    }

    out += ch ?? '';
    i += 1;
  }
  return out;
}

/**
 * Parse directly exported declarations from a source file.
 *
 * @param source - Comment-stripped TypeScript
 * @returns Local exports (name + kind)
 */
function parseLocalExports(source: string): LocalExport[] {
  const results: LocalExport[] = [];
  const seen = new Set<string>();

  const declRe =
    /\bexport\s+(?:async\s+)?(?:declare\s+)?(?:abstract\s+)?(class|interface|enum|function|const|type)\s+([A-Za-z_$][\w$]*)/gu;

  for (const match of source.matchAll(declRe)) {
    const kindRaw = match[1];
    const name = match[2];
    if (kindRaw === undefined || name === undefined) continue;
    if (seen.has(name)) continue;

    const kind = resolveDiscoveredKind(
      kindRaw,
      source,
      match.index,
      name,
    );
    if (kind === undefined) continue;

    seen.add(name);
    results.push({ name, kind });
  }

  return results;
}

/**
 * Map a matched declaration keyword onto {@link DiscoveredSymbolKind}.
 *
 * @param kindRaw - Keyword captured by the export regex
 * @param source - Comment-stripped source
 * @param exportIndex - Index of the `export` match
 * @param name - Binding name (needed for Zod const detection)
 * @returns Discovered kind, or `undefined` when the keyword is unexpected
 */
function resolveDiscoveredKind(
  kindRaw: string,
  source: string,
  exportIndex: number,
  name: string,
): DiscoveredSymbolKind | undefined {
  switch (kindRaw) {
    case 'class':
    case 'interface':
    case 'enum':
    case 'function':
    case 'type':
      return kindRaw;
    case 'const':
      return isZodSchemaConst(source, exportIndex, name) ? 'schema' : 'const';
    default:
      return undefined;
  }
}

/**
 * Whether an `export const Name = …` initializer is a Zod schema (`z.…`).
 *
 * @param source - Comment-stripped source
 * @param exportIndex - Index of the `export` match
 * @param name - Const binding name
 * @returns `true` when the initializer starts with a `z.` call
 */
function isZodSchemaConst(
  source: string,
  exportIndex: number,
  name: string,
): boolean {
  const slice = source.slice(exportIndex, exportIndex + 400);
  const assignRe = new RegExp(
    `export\\s+const\\s+${escapeRegExp(name)}\\s*=\\s*([\\s\\S]+)$`,
    'u',
  );
  const assign = assignRe.exec(slice);
  const rhs = assign?.[1];
  if (rhs === undefined) return false;
  const trimmed = rhs.trimStart();
  return /^z\./u.test(trimmed);
}

/**
 * Parse barrel re-export statements.
 *
 * Supports `export { A, B as C } from './x.js'`, `export type { … } from`,
 * and `export * from './x.js'`.
 *
 * @param source - Comment-stripped source
 * @param filePath - Repo-relative path of the current file (POSIX)
 * @returns Re-export edges
 */
function parseReexports(source: string, filePath: string): ReexportEdge[] {
  const edges: ReexportEdge[] = [];
  const dir = posixDirname(filePath);

  const starRe = /\bexport\s+(?:type\s+)?\*\s+from\s+['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(starRe)) {
    const spec = match[1];
    if (spec === undefined) continue;
    const fromModule = resolveTsSpecifier(dir, spec);
    if (fromModule === undefined) continue;
    edges.push({
      localName: '*',
      exportedName: '*',
      fromModule,
      star: true,
    });
  }

  const namedRe =
    /\bexport\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(namedRe)) {
    const body = match[1];
    const spec = match[2];
    if (body === undefined || spec === undefined) continue;
    const fromModule = resolveTsSpecifier(dir, spec);
    if (fromModule === undefined) continue;
    for (const part of body.split(',')) {
      const trimmed = part.trim();
      if (trimmed.length === 0) continue;
      const asMatch =
        /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/u.exec(trimmed);
      if (asMatch?.[1] !== undefined && asMatch[2] !== undefined) {
        edges.push({
          localName: asMatch[1],
          exportedName: asMatch[2],
          fromModule,
          star: false,
        });
        continue;
      }
      const nameMatch = /^([A-Za-z_$][\w$]*)$/u.exec(trimmed);
      if (nameMatch?.[1] !== undefined) {
        edges.push({
          localName: nameMatch[1],
          exportedName: nameMatch[1],
          fromModule,
          star: false,
        });
      }
    }
  }

  return edges;
}

/**
 * Resolve which local declarations are publicly re-exported by package barrels.
 *
 * @param exportBarrels - Export path → package-relative barrel (`src/index.ts`)
 * @param localExports - Repo-relative file → local exports
 * @param reexports - Repo-relative file → re-export edges
 * @param packageRel - Repo-relative package directory (`packages/foo`)
 * @returns Map keyed by `name\0file` → export path (`.` / `./testing`)
 */
function resolvePublicExports(
  exportBarrels: ReadonlyMap<string, string>,
  localExports: ReadonlyMap<string, readonly LocalExport[]>,
  reexports: ReadonlyMap<string, readonly ReexportEdge[]>,
  packageRel: string,
): Map<string, string> {
  const publicMap = new Map<string, string>();

  const sortedBarrels = [...exportBarrels.entries()].sort((a, b) => {
    if (a[0] === b[0]) return 0;
    return a[0] < b[0] ? -1 : 1;
  });

  for (const [exportPath, barrelPkgRel] of sortedBarrels) {
    const barrelRel = toPosixJoin(packageRel, barrelPkgRel);
    const reachable = collectReachableExports(
      barrelRel,
      localExports,
      reexports,
      new Set(),
    );
    for (const hit of reachable) {
      const key = publicKey(hit.exportedName, hit.file);
      if (!publicMap.has(key)) {
        publicMap.set(key, exportPath);
      }
    }
  }

  return publicMap;
}

/** One public name resolved to its defining file. */
interface ReachableExport {
  readonly exportedName: string;
  readonly file: string;
}

/**
 * Collect symbols reachable from a barrel via re-export edges (transitive).
 *
 * @param file - Repo-relative module being inspected
 * @param localExports - Local declarations by file
 * @param reexports - Re-export edges by file
 * @param visiting - Cycle guard
 * @returns Reachable public names with defining files
 */
function collectReachableExports(
  file: string,
  localExports: ReadonlyMap<string, readonly LocalExport[]>,
  reexports: ReadonlyMap<string, readonly ReexportEdge[]>,
  visiting: Set<string>,
): ReachableExport[] {
  if (visiting.has(file)) return [];
  visiting.add(file);

  const out: ReachableExport[] = [];
  const locals = localExports.get(file) ?? [];
  for (const local of locals) {
    out.push({ exportedName: local.name, file });
  }

  const edges = reexports.get(file) ?? [];
  for (const edge of edges) {
    if (edge.star) {
      const nested = collectReachableExports(
        edge.fromModule,
        localExports,
        reexports,
        visiting,
      );
      for (const hit of nested) {
        out.push({ exportedName: hit.exportedName, file: hit.file });
      }
      continue;
    }

    const targetLocals = localExports.get(edge.fromModule) ?? [];
    const direct = targetLocals.find((item) => item.name === edge.localName);
    if (direct !== undefined) {
      out.push({ exportedName: edge.exportedName, file: edge.fromModule });
      continue;
    }

    // Re-export chain: localName may itself be a re-export from fromModule.
    const nested = collectReachableExports(
      edge.fromModule,
      localExports,
      reexports,
      visiting,
    );
    for (const hit of nested) {
      if (hit.exportedName === edge.localName) {
        out.push({ exportedName: edge.exportedName, file: hit.file });
      }
    }
  }

  visiting.delete(file);
  return out;
}

/**
 * @param name - Symbol name
 * @param file - Defining file
 * @returns Stable map key
 */
function publicKey(name: string, file: string): string {
  return `${name}\0${file}`;
}

/**
 * Resolve a TS ESM import specifier to a repo-relative `.ts` path.
 *
 * @param fromDir - Directory of the importing file (POSIX, repo-relative)
 * @param specifier - Specifier like `./foo.js` or `../bar.js`
 * @returns Repo-relative `.ts` path, or undefined for non-relative specs
 */
function resolveTsSpecifier(
  fromDir: string,
  specifier: string,
): string | undefined {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return undefined;
  }
  let cleaned = specifier;
  if (cleaned.endsWith('.js') || cleaned.endsWith('.mjs')) {
    cleaned = cleaned.replace(/\.(?:mjs|js)$/u, '.ts');
  } else if (!cleaned.endsWith('.ts')) {
    cleaned = `${cleaned}.ts`;
  }
  return posixNormalize(`${fromDir}/${cleaned}`);
}

/**
 * @param filePath - POSIX path
 * @returns Parent directory, or `.` for bare filenames
 */
function posixDirname(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  if (idx <= 0) return '.';
  return filePath.slice(0, idx);
}

/**
 * Join POSIX path segments without using host separators.
 *
 * @param parts - Path parts
 * @returns Joined path
 */
function toPosixJoin(...parts: string[]): string {
  return posixNormalize(parts.filter((p) => p.length > 0).join('/'));
}

/**
 * Normalize `.` / `..` segments in a POSIX path.
 *
 * @param path - POSIX path
 * @returns Normalized path
 */
function posixNormalize(path: string): string {
  const absolute = path.startsWith('/');
  const parts = path.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') {
        stack.pop();
      } else if (!absolute) {
        stack.push('..');
      }
      continue;
    }
    stack.push(part);
  }
  const joined = stack.join('/');
  if (absolute) return `/${joined}`;
  return joined.length > 0 ? joined : '.';
}

/**
 * Escape a literal for safe use inside `RegExp`.
 *
 * @param value - Raw string
 * @returns Escaped pattern
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
