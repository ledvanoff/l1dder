#!/usr/bin/env node
/**
 * scripts/sync-release-meta.mjs
 *
 * Makes `assets/releases.json` the Single Source of Truth for versioning and changelogs:
 *   1. Reads the top release entry (`releases[0]`) from `assets/releases.json`.
 *   2. Synchronizes `"version"` in `package.json` to `releases[0].version`.
 *   3. Auto-generates `CHANGELOG.md` (with `### ⚠️ BREAKING CHANGES` and RU/EN changes).
 *
 * Invoked automatically at the start of `npm run build`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releasesPath = join(repoRoot, "assets", "releases.json");
const pkgPath = join(repoRoot, "package.json");
const changelogPath = join(repoRoot, "CHANGELOG.md");

const catalog = JSON.parse(readFileSync(releasesPath, "utf-8"));
if (!Array.isArray(catalog.releases) || catalog.releases.length === 0) {
  throw new Error("assets/releases.json must contain a non-empty `releases` array.");
}

const latestRelease = catalog.releases[0];
const targetVersion = latestRelease.version;
if (typeof targetVersion !== "string" || targetVersion.trim() === "") {
  throw new Error("Top entry in assets/releases.json is missing a valid `version` string.");
}

// 1. Sync package.json version if needed
const pkgRaw = readFileSync(pkgPath, "utf-8");
const pkg = JSON.parse(pkgRaw);
if (pkg.version !== targetVersion) {
  pkg.version = targetVersion;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  console.log(`✓ Synced package.json version -> ${targetVersion}`);
}

// 2. Render CHANGELOG.md from assets/releases.json
const lines = [
  "# Changelog",
  "",
  "> **Автогенерируемый файл:** этот файл автоматически собирается из единого источника истины [`assets/releases.json`](assets/releases.json) при вызове `npm run build`.",
  "> При подготовке нового релиза добавляй запись только в `assets/releases.json`.",
];

for (const rel of catalog.releases) {
  lines.push("", "---", "", `## [${rel.version}] — ${rel.date}`, "");
  lines.push(`**RU:** ${rel.summary.ru}`);
  lines.push("");
  lines.push(`**EN:** ${rel.summary.en}`);

  const breakingRu = rel.breaking?.ru ?? [];
  const breakingEn = rel.breaking?.en ?? [];
  if (breakingRu.length > 0 || breakingEn.length > 0) {
    lines.push("", "### ⚠️ BREAKING CHANGES (Ломающие изменения)", "");
    for (const item of breakingRu) {
      lines.push(`- **[RU]** ${item}`);
    }
    for (const item of breakingEn) {
      lines.push(`- **[EN]** ${item}`);
    }
  }

  const changesRu = rel.changes?.ru ?? [];
  const changesEn = rel.changes?.en ?? [];
  if (changesRu.length > 0 || changesEn.length > 0) {
    lines.push("", "### Changes (Изменения)", "");
    for (const item of changesRu) {
      lines.push(`- **[RU]** ${item}`);
    }
    for (const item of changesEn) {
      lines.push(`- **[EN]** ${item}`);
    }
  }
}

const renderedChangelog = `${lines.join("\n")}\n`;
const currentChangelog = readFileSync(changelogPath, "utf-8");
if (currentChangelog !== renderedChangelog) {
  writeFileSync(changelogPath, renderedChangelog, "utf-8");
  console.log(`✓ Regenerated CHANGELOG.md from assets/releases.json (latest: v${targetVersion})`);
}
