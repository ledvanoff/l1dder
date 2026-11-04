#!/usr/bin/env node
/**
 * scripts/check-site-ref.mjs
 *
 * Stops a site-only deploy when a ref holds product changes that are not released yet.
 * Usage: node scripts/check-site-ref.mjs [ref]
 */
import { execFileSync, spawnSync } from "node:child_process";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf-8" }).trim();
}

// Site pages are built from these files, see scripts/sync-site-docs.mjs.
const DOCS_PAGE_SOURCES = /^assets\/i18n\/(ru|en)\/(user-guide\/|METHODOLOGY\.md$|GLOSSARY\.md$)/;

const ref = process.argv[2] ?? "HEAD";
const latestTag = git("tag", "--list", "v*", "--sort=-v:refname").split("\n")[0];

if (!latestTag) {
  console.error("✗ No release tag v* found: fetch the tags first");
  process.exit(1);
}

if (spawnSync("git", ["merge-base", "--is-ancestor", ref, latestTag]).status === 0) {
  console.log(`✓ ${ref} is already released in ${latestTag}`);
  process.exit(0);
}

const changed = git("diff", "--name-only", latestTag, ref, "--", "src", "assets")
  .split("\n")
  .filter((file) => file && !DOCS_PAGE_SOURCES.test(file));

if (changed.length > 0) {
  console.error(`✗ ${ref} has product changes not released in ${latestTag}:\n${changed.join("\n")}`);
  process.exit(1);
}
console.log(`✓ ${ref} has only site and docs changes since ${latestTag}`);
