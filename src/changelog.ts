import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveAssetsDir } from "./assets.js";
import type { Language } from "./types.js";

export interface LocalizedText {
  readonly ru: string;
  readonly en: string;
}

export interface LocalizedList {
  readonly ru: readonly string[];
  readonly en: readonly string[];
}

export interface ReleaseEntry {
  readonly version: string;
  readonly date: string;
  readonly summary: LocalizedText;
  readonly changes: LocalizedList;
  readonly breaking: LocalizedList;
}

export interface ReleasesCatalog {
  readonly releases: readonly ReleaseEntry[];
}

/**
 * Load the structured release changelog from `assets/releases.json`.
 */
export function loadReleasesCatalog(): readonly ReleaseEntry[] {
  const filePath = join(resolveAssetsDir(), "releases.json");
  if (!existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as Partial<ReleasesCatalog>;
    return Array.isArray(parsed.releases) ? parsed.releases : [];
  } catch {
    return [];
  }
}

/**
 * Compare two semver strings (`major.minor.patch`).
 * Returns `-1` if `a < b`, `0` if `a === b`, `1` if `a > b`.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string): [number, number, number] => {
    const clean = v.replace(/^v/iu, "").split("-")[0] ?? "0.0.0";
    const parts = clean.split(".").map((n) => Number.parseInt(n, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);

  if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
  if (aMin !== bMin) return aMin < bMin ? -1 : 1;
  if (aPat !== bPat) return aPat < bPat ? -1 : 1;
  return 0;
}

/**
 * Detect the currently installed version of L1DDER in a project:
 * 1. `<rootDir>/config.json` -> `version`
 * 2. Legacy `0.2.0` if `<rootDir>/.framework/` or `.l1dder/` exists
 * 3. `null` if not installed
 */
export function detectInstalledVersion(projectDir: string, rootDir = "l1dder"): string | null {
  const configPath = join(projectDir, rootDir, "config.json");
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf-8")) as { version?: unknown };
      if (typeof raw.version === "string" && raw.version.trim().length > 0) {
        return raw.version.trim();
      }
    } catch {
      // fall through
    }
  }
  if (
    existsSync(join(projectDir, rootDir, ".framework")) ||
    existsSync(join(projectDir, ".l1dder"))
  ) {
    return "0.2.0";
  }
  return null;
}

/**
 * Return all release entries strictly newer than `fromVersion` and up to `toVersion`
 * (`fromVersion < release.version <= toVersion`), sorted from oldest to newest.
 */
export function getPendingReleases(
  fromVersion: string,
  toVersion: string,
  catalog: readonly ReleaseEntry[] = loadReleasesCatalog(),
): readonly ReleaseEntry[] {
  return [...catalog]
    .filter(
      (entry) =>
        compareSemver(entry.version, fromVersion) > 0 &&
        compareSemver(entry.version, toVersion) <= 0,
    )
    .sort((left, right) => compareSemver(left.version, right.version));
}

export interface BreakingChangeItem {
  readonly version: string;
  readonly date: string;
  readonly items: readonly string[];
}

/**
 * Extract all breaking changes from a list of pending releases in the requested language.
 */
export function collectBreakingChanges(
  pendingReleases: readonly ReleaseEntry[],
  lang: Language,
): readonly BreakingChangeItem[] {
  const result: BreakingChangeItem[] = [];
  for (const rel of pendingReleases) {
    const list = rel.breaking[lang] ?? rel.breaking.ru ?? [];
    if (list.length > 0) {
      result.push({
        version: rel.version,
        date: rel.date,
        items: list,
      });
    }
  }
  return result;
}

/**
 * Format human-readable changelog and breaking-change warning before updating.
 */
export function formatUpdateChangelogReport(options: {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly pendingReleases: readonly ReleaseEntry[];
  readonly lang: Language;
}): string {
  const { fromVersion, toVersion, pendingReleases, lang } = options;
  const isRu = lang === "ru";
  const lines: string[] = [];

  lines.push(
    isRu
      ? `\n📋 Чейнджлог обновления L1DDER: v${fromVersion} → v${toVersion}`
      : `\n📋 L1DDER Update Changelog: v${fromVersion} → v${toVersion}`,
  );

  for (const rel of pendingReleases) {
    lines.push(`\n  [v${rel.version}] (${rel.date}) — ${rel.summary[lang]}`);
    for (const item of rel.changes[lang]) {
      lines.push(`    • ${item}`);
    }
  }

  const breaking = collectBreakingChanges(pendingReleases, lang);
  if (breaking.length > 0) {
    lines.push(
      "",
      isRu
        ? "⚠️  ВНИМАНИЕ: НАЙДЕНЫ ЛОМАЮЩИЕ ИЗМЕНЕНИЯ (BREAKING CHANGES):"
        : "⚠️  WARNING: BREAKING CHANGES DETECTED:",
    );
    for (const group of breaking) {
      lines.push(isRu ? `  Версия v${group.version}:` : `  Version v${group.version}:`);
      for (const item of group.items) {
        lines.push(`    ❗ ${item}`);
      }
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

/**
 * Check if a user's confirmation answer is affirmative (`да`, `д`, `ок`, `yes`, `y`, `ok`).
 */
export function isAffirmativeAnswer(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return (
    normalized === "да" ||
    normalized === "д" ||
    normalized === "ок" ||
    normalized === "окей" ||
    normalized === "y" ||
    normalized === "yes" ||
    normalized === "ok"
  );
}
