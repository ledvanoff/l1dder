#!/usr/bin/env node
/**
 * scripts/render-release-notes.mjs
 *
 * Renders GitHub Release notes (English, then Russian) for one version from `assets/releases.json`.
 * Usage: node scripts/render-release-notes.mjs v1.2.3 [path/to/releases.json]
 *
 * `publish.yml` runs this before `npm publish`, so a tag without a complete RU + EN entry stops the release.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_URL = "https://github.com/ledvanoff/l1dder";
const DOCS_URL = "https://ledvanoff.github.io/l1dder/";
const NPM_URL = "https://www.npmjs.com/package/l1dder/v";

const LANGUAGES = [
  { id: "en", heading: "🇬🇧 English", breaking: "⚠️ Breaking changes", changes: "✨ What's changed" },
  { id: "ru", heading: "🇷🇺 Русский", breaking: "⚠️ Ломающие изменения", changes: "✨ Что изменилось" },
];

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.argv[2];
const catalogPath = process.argv[3] ?? join(repoRoot, "assets", "releases.json");
if (!tag) {
  fail("Usage: node scripts/render-release-notes.mjs v1.2.3 [path/to/releases.json]");
}

const { releases } = JSON.parse(readFileSync(catalogPath, "utf-8"));
const version = tag.replace(/^v/, "");
const index = releases.findIndex((release) => release.version === version);
if (index === -1) {
  fail(`No entry for ${tag} in ${catalogPath}.`);
}
const release = releases[index];

for (const { id } of LANGUAGES) {
  if (!release.summary?.[id]?.trim()) {
    fail(`Release ${version} has no "${id}" summary.`);
  }
}
for (const field of ["breaking", "changes"]) {
  if ((release[field]?.ru ?? []).length !== (release[field]?.en ?? []).length) {
    fail(`Release ${version}: "${field}" must have the same number of items in "ru" and "en".`);
  }
}

const lines = [];
for (const { id, heading, breaking, changes } of LANGUAGES) {
  lines.push(`## ${heading}`, "", release.summary[id], "");
  for (const [title, items] of [
    [breaking, release.breaking?.[id] ?? []],
    [changes, release.changes?.[id] ?? []],
  ]) {
    if (items.length > 0) {
      lines.push(`### ${title}`, "", ...items.map((item) => `- ${item}`), "");
    }
  }
}

const links = [`[📚 Docs / Документация](${DOCS_URL})`, `[npm](${NPM_URL}/${version})`];
const previousVersion = releases[index + 1]?.version;
if (previousVersion) {
  links.push(`[Full diff](${REPO_URL}/compare/v${previousVersion}...v${version})`);
}
lines.push(
  "---",
  "",
  "### 📦 Update / Обновление",
  "",
  "```bash",
  "npx l1dder@latest update",
  "```",
  "",
  links.join(" · "),
);

console.log(lines.join("\n"));
