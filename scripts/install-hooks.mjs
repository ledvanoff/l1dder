#!/usr/bin/env node
/**
 * scripts/install-hooks.mjs
 *
 * Runs on `npm install` (`prepare`) and adds the release guard to `.git/hooks`.
 * It only adds: an existing hook and the git config stay as they are.
 * `--force` (`make hooks-update`) replaces pre-push and keeps the old file as pre-push.bak.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A comment-only difference is not worth a warning on every install.
function code(path) {
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
}

const source = fileURLToPath(new URL("./hooks/pre-push", import.meta.url));
const force = process.argv.includes("--force");

function git(...args) {
  return execFileSync("git", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function configuredHooksPath() {
  try {
    return git("config", "--get", "core.hooksPath");
  } catch {
    return ""; // git exits non-zero when the setting is absent
  }
}

const hooksPath = configuredHooksPath();
if (hooksPath) {
  console.error(`! core.hooksPath is set to ${hooksPath}, so the release guard was not installed. Add scripts/hooks/pre-push there yourself.`);
  process.exit(force ? 1 : 0);
}

let hooksDir;
try {
  hooksDir = git("rev-parse", "--path-format=absolute", "--git-path", "hooks");
} catch {
  process.exit(0); // not a git checkout: nothing to guard, and npm install must not fail
}
const target = join(hooksDir, "pre-push");

if (force && existsSync(target)) {
  copyFileSync(target, `${target}.bak`);
} else if (existsSync(target)) {
  if (code(target) === code(source)) process.exit(0);
  console.error("! .git/hooks/pre-push differs from scripts/hooks/pre-push. It stays as it is; to replace it, run: make hooks-update");
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
chmodSync(target, 0o755);
console.log("✓ Installed the release guard: .git/hooks/pre-push");
