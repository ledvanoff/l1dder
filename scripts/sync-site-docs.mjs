#!/usr/bin/env node
/**
 * Syncs the canonical RU and EN user-guide, METHODOLOGY.md, and GLOSSARY.md
 * from `assets/i18n/{ru,en}/` into the VitePress `site/` pages, rewriting
 * internal markdown links so VitePress cleanUrls work seamlessly.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function transformLinks(md, prefix = "") {
  return md
    .replaceAll("(./README.md)", `(${prefix}/guide)`)
    .replaceAll("(./01-QUICKSTART.md)", `(${prefix}/quickstart)`)
    .replaceAll("(./02-FLOWS-IN-DETAIL.md)", `(${prefix}/flows)`)
    .replaceAll("(./03-CHEATSHEET.md)", `(${prefix}/cheatsheet)`)
    .replaceAll("(templates/", "(https://github.com/ledvanoff/l1dder/tree/main/l1dder/templates/")
    .replaceAll("(evolution/", "(https://github.com/ledvanoff/l1dder/tree/main/l1dder/evolution/");
}

function syncLang(lang, siteSubdir, prefix) {
  const srcRoot = join(repoRoot, "assets", "i18n", lang);
  const destRoot = siteSubdir ? join(repoRoot, "site", siteSubdir) : join(repoRoot, "site");
  mkdirSync(destRoot, { recursive: true });

  const mappings = [
    ["user-guide/README.md", "guide.md"],
    ["user-guide/01-QUICKSTART.md", "quickstart.md"],
    ["user-guide/02-FLOWS-IN-DETAIL.md", "flows.md"],
    ["user-guide/03-CHEATSHEET.md", "cheatsheet.md"],
    ["METHODOLOGY.md", "methodology.md"],
    ["GLOSSARY.md", "glossary.md"],
  ];

  for (const [srcRel, destRel] of mappings) {
    const raw = readFileSync(join(srcRoot, srcRel), "utf-8");
    const transformed = transformLinks(raw, prefix);
    writeFileSync(join(destRoot, destRel), transformed, "utf-8");
  }
}

syncLang("ru", "", "");
syncLang("en", "en", "/en");

console.log("✓ Synced RU and EN docs into site/");
