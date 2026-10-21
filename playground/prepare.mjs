#!/usr/bin/env node
/**
 * playground/prepare.mjs
 *
 * Prepares two clean, isolated sandboxes for automated multi-model E2E testing:
 *   - playground/sandboxes/composer
 *   - playground/sandboxes/grok
 *
 * In each sandbox:
 *   1. Creates a minimal starter Node.js project (`package.json`, `src/slugify.js`, `tests/slugify.test.js`, `Makefile`).
 *   2. Runs `dist/cli.js init --lang ru --agents codex --yes` so `l1dder/` and `.agents/skills/` are installed.
 *   3. Pre-creates `docs/concept/idea.md` and `docs/concept/vision.md` so the model can immediately run
 *      the full L1DDER chain: `/l1-idea` -> `/l1-feature` -> `/l1-planning` -> `/l1-task`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const cliDist = join(repoRoot, "dist", "cli.js");
const sandboxesRoot = join(__dirname, "sandboxes");

if (!existsSync(cliDist)) {
  console.error("✗ dist/cli.js not found. Run `npm run build` first.");
  process.exit(1);
}

const MODELS = ["composer", "grok"];

for (const modelName of MODELS) {
  const boxDir = join(sandboxesRoot, modelName);
  rmSync(boxDir, { recursive: true, force: true });
  mkdirSync(join(boxDir, "src"), { recursive: true });
  mkdirSync(join(boxDir, "tests"), { recursive: true });
  mkdirSync(join(boxDir, "docs", "concept"), { recursive: true });

  writeFileSync(
    join(boxDir, "package.json"),
    JSON.stringify(
      {
        name: `l1dder-playground-${modelName}`,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          test: "node --test tests/*.test.js",
          lint: "node --check src/slugify.js",
          typecheck: "node --check src/slugify.js",
          build: "node --check src/slugify.js",
        },
      },
      null,
      2,
    ) + "\n",
    "utf-8",
  );

  writeFileSync(
    join(boxDir, "Makefile"),
    [
      ".PHONY: dev build lint format typecheck test test-e2e ci",
      "dev:",
      "\t@node -v",
      "build:",
      "\tnpm run build",
      "lint:",
      "\tnpm run lint",
      "format:",
      "\t@echo ok",
      "typecheck:",
      "\tnpm run typecheck",
      "test:",
      "\tnpm test",
      "test-e2e:",
      "\tnpm test",
      "ci: lint typecheck test build",
      "",
    ].join("\n"),
    "utf-8",
  );

  writeFileSync(
    join(boxDir, "src", "slugify.js"),
    [
      "/**",
      " * Convert a title string into a URL-safe lowercase slug.",
      " * Currently a placeholder stub — to be implemented in TASK-01.01.",
      " */",
      "export function slugify(input) {",
      "  return String(input ?? '');",
      "}",
      "",
    ].join("\n"),
    "utf-8",
  );

  writeFileSync(
    join(boxDir, "tests", "slugify.test.js"),
    [
      'import { test } from "node:test";',
      'import assert from "node:assert/strict";',
      'import { slugify } from "../src/slugify.js";',
      "",
      'test("baseline import works", () => {',
      '  assert.equal(typeof slugify, "function");',
      "});",
      "",
    ].join("\n"),
    "utf-8",
  );

  writeFileSync(
    join(boxDir, "docs", "concept", "idea.md"),
    [
      "# Утилита генерации URL-слагов (Slugify)",
      "",
      "## Суть продукта",
      "Лёгкая библиотека для преобразования заголовков статей в чистые URL-слаги в нижнем регистре через дефис.",
      "",
      "## Для кого",
      "- **Разработчики** — используют функцию `slugify(text)` для генерации ЧПУ-ссылок.",
      "",
      "## Что в первой очереди (MVP)",
      "- Приведение к нижнему регистру, замена пробелов и спецсимволов на одиночный дефис `-`, обрезка крайних дефисов.",
      "",
    ].join("\n"),
    "utf-8",
  );

  writeFileSync(
    join(boxDir, "docs", "concept", "vision.md"),
    [
      "# Техническое видение",
      "",
      "## 1. Система в целом",
      "Модуль `src/slugify.js` на чистом Node.js ESM со встроенным тест-раннером `node --test`.",
      "",
      "## 2. Технологии",
      "- Node.js 22 ESM, `node:test`, `node:assert/strict`, `Makefile` (`make ci`).",
      "",
    ].join("\n"),
    "utf-8",
  );

  // Simulate pre-existing duplicate folders before init/sync to test pruning in playground too
  mkdirSync(join(boxDir, ".claude", "commands"), { recursive: true });
  writeFileSync(join(boxDir, ".claude", "commands", "l1-task.md"), "duplicate", "utf-8");

  execFileSync(
    process.execPath,
    [cliDist, "init", "--cwd", boxDir, "--lang", "ru", "--agents", "cursor,claude,codex", "--yes"],
    { stdio: "pipe" },
  );

  console.log(`✓ Prepared playground sandbox: playground/sandboxes/${modelName}`);
}
