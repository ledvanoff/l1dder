import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import type { FileSystemPort } from '@l1dder/core';
import type { LanguageCode } from '@l1dder/schemas';

/**
 * Resolve the absolute path to a bundled asset file.
 *
 * Source assets live inside this package (`packages/cli/assets/`) and are
 * copied to `dist/assets/` at build time (sibling to the bundle) by
 * `scripts/copy-assets.mjs`. Uses `import.meta.url` for ESM-compatible path
 * resolution.
 */
export function resolveAssetPath(relativePath: string): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, 'assets', relativePath);
}

/** Root directory of bundled assets. */
export function resolveAssetsRoot(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, 'assets');
}

/**
 * Language-neutral asset dirs — LLM instructions copied as-is for every
 * language (`language.docs` does not affect them).
 */
const NEUTRAL_ASSET_DIRS = [
  'agents',
  'skills/built-in',
  'commands/built-in',
] as const;

/**
 * Localized asset dirs — sourced from `i18n/<docsLang>/<dir>` and copied to
 * `<targetDir>/<dir>` so the project tree layout stays language-agnostic.
 */
const LOCALIZED_ASSET_DIRS = [
  'templates/knowledge',
  'templates/specs',
  'standards/.base',
] as const;

/**
 * Optional install profiles → the asset source dirs they deliver.
 *
 * Profiles are opt-in (selected via `l1dder init --profile <name>`): their
 * source dirs are deliberately NOT part of `NEUTRAL_ASSET_DIRS`, so a default
 * init never copies them. The `engineering` profile delivers the curated
 * starter skills (`skills/starter/`) into the project's `skills/built-in/`.
 *
 * Minimal by design (no E12 manifests yet); when E12 lands, profiles move to
 * data-driven manifests without touching skill content.
 */
export const PROFILES: Readonly<Record<string, readonly string[]>> = {
  engineering: ['skills/starter'],
};

/** Destination dir (relative to the project) where profile assets are placed. */
const PROFILE_TARGET_DIR = 'skills/built-in';

/**
 * Copy a single source directory's files into a destination directory.
 *
 * Skips non-files and missing source dirs. Returns relative paths under
 * `relDir` for each file copied.
 */
async function copyDirFiles(
  srcDir: string,
  destDir: string,
  relDir: string,
  fs: FileSystemPort,
): Promise<string[]> {
  let entries: readonly string[];
  try {
    entries = await fs.readDir(srcDir);
  } catch {
    return [];
  }

  await fs.mkdir(destDir);
  const copied: string[] = [];

  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    try {
      const stat = await fs.stat(srcPath);
      if (!stat.isFile) continue;
    } catch {
      continue;
    }

    const content = await fs.readFile(srcPath);
    await fs.writeFile(join(destDir, entry), content);
    copied.push(join(relDir, entry));
  }

  return copied;
}

/**
 * Copy all bundled assets to a target project directory.
 *
 * Language-neutral dirs (agents, skills, commands) are copied verbatim.
 * Localized dirs (templates, base standards) are taken from `i18n/<docsLang>/`
 * and written to the project's canonical layout. When an optional `profile` is
 * given, the profile's source dirs are additionally copied into the project's
 * `skills/built-in/` (opt-in engineering content). Returns relative paths copied.
 *
 * @param targetDir - project root to copy assets into
 * @param fs - file system port
 * @param docsLang - language for localized assets
 * @param profile - optional install profile key (see {@link PROFILES})
 */
export async function copyAssets(
  targetDir: string,
  fs: FileSystemPort,
  docsLang: LanguageCode = 'en',
  profile?: string,
): Promise<string[]> {
  const assetsRoot = resolveAssetsRoot();
  const copied: string[] = [];

  for (const dir of NEUTRAL_ASSET_DIRS) {
    copied.push(...(await copyDirFiles(join(assetsRoot, dir), join(targetDir, dir), dir, fs)));
  }

  for (const dir of LOCALIZED_ASSET_DIRS) {
    const srcDir = join(assetsRoot, 'i18n', docsLang, dir);
    copied.push(...(await copyDirFiles(srcDir, join(targetDir, dir), dir, fs)));
  }

  if (profile !== undefined) {
    const profileDirs = PROFILES[profile];
    if (profileDirs) {
      for (const srcRelDir of profileDirs) {
        copied.push(
          ...(await copyDirFiles(
            join(assetsRoot, srcRelDir),
            join(targetDir, PROFILE_TARGET_DIR),
            PROFILE_TARGET_DIR,
            fs,
          )),
        );
      }
    }
  }

  return copied;
}
