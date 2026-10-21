#!/usr/bin/env node
/**
 * scripts/release.mjs
 *
 * Automated one-command release script (`make release` / `npm run release`):
 *   1. Reads the target version from the top entry of `assets/releases.json`.
 *   2. Verifies that git tag `v<version>` does NOT exist yet (fails fast if you forgot to add a new entry to `assets/releases.json`).
 *   3. Runs `make ci` (which syncs `package.json`, `CHANGELOG.md`, `l1dder/`, `site/`, and runs all tests).
 *   4. Commits any updated release metadata on `dev` if needed.
 *   5. Merges `dev -> main`, creates annotated tag `v<version>`, pushes `main`, `dev`, and `--tags`, and returns to `dev`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releasesPath = join(repoRoot, "assets", "releases.json");

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf-8",
    stdio: options.stdio ?? "pipe",
  }).trim();
}

const catalog = JSON.parse(readFileSync(releasesPath, "utf-8"));
const version = catalog.releases?.[0]?.version;
if (!version) {
  console.error("✗ Could not read latest version from assets/releases.json");
  process.exit(1);
}

const tag = `v${version}`;

// 1. Check that the tag does not already exist
try {
  git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
  console.error(
    `✗ Tag ${tag} already exists!\n` +
      `  To publish a new version, add a new release object at the top of assets/releases.json first, then run \`make release\`.`,
  );
  process.exit(1);
} catch {
  // Tag does not exist yet — good to proceed
}

// 2. Ensure we are on `dev` branch
const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (currentBranch !== "dev") {
  console.error(`✗ Releases must be initiated from the 'dev' branch (current: '${currentBranch}').`);
  process.exit(1);
}

// 3. Run full CI (includes sync-release-meta.mjs -> build -> test -> docs:build -> doctor)
console.log(`→ Running full CI for release ${tag}...`);
execFileSync("make", ["ci"], { cwd: repoRoot, stdio: "inherit" });

// 4. Commit any uncommitted changes on `dev`
const status = git(["status", "--porcelain"]);
if (status.length > 0) {
  git(["add", "-A"], { stdio: "inherit" });
  git(["commit", "-m", `chore(release): ${tag}`], { stdio: "inherit" });
}

// 5. Merge dev -> main, tag, push, and switch back to dev
console.log(`→ Merging dev -> main and tagging ${tag}...`);
git(["checkout", "main"], { stdio: "inherit" });
git(["merge", "dev", "--no-edit"], { stdio: "inherit" });
git(["tag", "-a", tag, "-m", `Release ${tag}`], { stdio: "inherit" });
git(["push", "origin", "main", "dev", "--tags"], { stdio: "inherit" });
git(["checkout", "dev"], { stdio: "inherit" });

console.log(`\n✓ Released ${tag}! GitHub Actions is now publishing to npm and deploying GitHub Pages.`);
