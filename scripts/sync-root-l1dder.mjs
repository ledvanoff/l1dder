#!/usr/bin/env node
/**
 * Dogfooding sync script: runs the built CLI (`dist/cli.js sync --yes`) on the
 * repository root itself so `./l1dder/` and all agent folders (`.cursor/`,
 * `.claude/`, `.agents/`, `AGENTS.md`, `CLAUDE.md`) stay in sync with
 * `assets/i18n/ru/` while preserving `./l1dder/rules/30-tech-stack.mdc`.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliDist = join(repoRoot, "dist", "cli.js");

execFileSync(
  process.execPath,
  [cliDist, "sync", "--cwd", repoRoot, "--lang", "ru", "--agents", "cursor,claude,codex", "--yes"],
  { stdio: "inherit" },
);
