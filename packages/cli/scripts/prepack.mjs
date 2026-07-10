#!/usr/bin/env node
/**
 * prepack — stage the repository-root README and LICENSE inside the published
 * package so npm bundles them into the tarball and renders the README on the
 * package page.
 *
 * The published unit is `packages/cli`, but the single source of truth for the
 * landing README and the license lives at the repo root (public-repo landing,
 * DEC-RL-3/9). npm runs this automatically before `npm pack` / `npm publish`.
 * The copied files are git-ignored inside the package.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageDir, "..", "..");

for (const file of ["README.md", "LICENSE"]) {
  const src = join(repoRoot, file);
  if (!existsSync(src)) {
    console.warn(`prepack: ${file} not found at repo root, skipping`);
    continue;
  }
  copyFileSync(src, join(packageDir, file));
  console.log(`prepack: staged ${file}`);
}
