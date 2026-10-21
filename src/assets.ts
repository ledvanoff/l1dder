import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Language } from "./types.js";

/**
 * Stack files inside `<rootDir>/` that belong to the user's project stack
 * and must NEVER be overwritten by `l1dder sync` (unless `--force` is passed).
 */
export const STACK_PROTECTED_FILES: ReadonlySet<string> = new Set([
  "skills.json",
  "rules/30-tech-stack.mdc",
  "rules/40-skills-router.mdc",
  "ci/github-actions/default.yml.template",
  "ci/gitignore-additions.txt",
  "ci/git-conventions.md",
]);

export interface BundledAsset {
  /** POSIX path relative to `<rootDir>/` (e.g. `rules/00-methodology.mdc`). */
  readonly relativePath: string;
  readonly content: string;
  readonly isStackFile: boolean;
}

/**
 * Resolve the root `assets/` directory shipped with the npm package.
 */
export function resolveAssetsDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDir, "../assets"),
    resolve(currentDir, "assets"),
    resolve(currentDir, "../../assets"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Could not locate bundled L1DDER assets directory from ${currentDir}`);
}

/**
 * Load all shipped methodology files for the given language (`ru` or `en`),
 * replacing `l1dder/` references if the user chose a custom `--root` folder.
 */
export function loadLanguageAssets(lang: Language, rootDir = "l1dder"): readonly BundledAsset[] {
  const langRoot = join(resolveAssetsDir(), "i18n", lang);
  if (!existsSync(langRoot)) {
    throw new Error(`Language catalog not found: ${langRoot}`);
  }
  const files = walkDirectory(langRoot, "");
  return files.map((item) => ({
    relativePath: item.relativePath,
    content: replaceRootDir(item.content, rootDir),
    isStackFile: STACK_PROTECTED_FILES.has(item.relativePath),
  }));
}

function replaceRootDir(content: string, rootDir: string): string {
  if (rootDir === "l1dder") return content;
  return content.replaceAll("l1dder/", `${rootDir}/`);
}

function walkDirectory(
  absDir: string,
  relPrefix: string,
): Array<{ relativePath: string; content: string }> {
  const entries = readdirSync(absDir).sort();
  const out: Array<{ relativePath: string; content: string }> = [];

  for (const entry of entries) {
    if (entry === ".DS_Store") continue;
    const absPath = join(absDir, entry);
    const relPath = relPrefix === "" ? entry : `${relPrefix}/${entry}`;
    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      out.push(...walkDirectory(absPath, relPath));
    } else if (stat.isFile()) {
      out.push({
        relativePath: relPath,
        content: readFileSync(absPath, "utf-8"),
      });
    }
  }

  return out;
}
