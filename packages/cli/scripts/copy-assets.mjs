/**
 * Build-time script: copies content assets into dist/assets/ for bundling.
 *
 * Called via the tsup `onSuccess` hook after each build.
 * Source is local to this package (`packages/cli/assets/`); copies the whole
 * tree into `packages/cli/dist/assets/` preserving structure:
 * - language-neutral: agents/, skills/built-in/, commands/built-in/
 * - localized (en/ru): i18n/<lang>/templates/knowledge/,
 *   i18n/<lang>/templates/specs/, i18n/<lang>/standards/.base/
 *
 * The recursive copy preserves the full `i18n/` subtree; `copyAssets()`
 * (src/cli/assets.ts) picks the localized set by `language.docs` at init time.
 */

import { cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'assets');
const DEST = resolve(__dirname, '..', 'dist', 'assets');

mkdirSync(DEST, { recursive: true });

// Recursive copy of the entire assets/ tree (dotfiles like standards/.base
// are preserved by cpSync).
cpSync(SRC, DEST, { recursive: true });

console.log(`  ✓ assets/ → dist/assets/`);
console.log('Assets copied successfully.');
