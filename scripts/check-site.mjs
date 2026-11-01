#!/usr/bin/env node
/**
 * scripts/check-site.mjs
 *
 * Checks the built VitePress site without a browser (no new dependencies):
 *   node scripts/check-site.mjs [distDir]                    every internal link, anchor and file exists
 *   node scripts/check-site.mjs [distDir] --baseline <file>  the above, and no page got worse than the baseline
 *   node scripts/check-site.mjs [distDir] --write-baseline <file>
 *
 * Runs in `make test-e2e`; the baseline comparison runs in `make site-gate`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://ledvanoff.github.io";
const BASE = "/l1dder/";

function readArgs(argv) {
  const args = { dist: join(dirname(fileURLToPath(import.meta.url)), "..", "site", ".vitepress", "dist") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--baseline") args.baseline = argv[++i];
    else if (argv[i] === "--write-baseline") args.writeBaseline = argv[++i];
    else args.dist = resolve(argv[i]);
  }
  return args;
}

function findPages(dist) {
  return readdirSync(dist, { recursive: true })
    .map((file) => String(file).split(sep).join("/"))
    .filter((file) => file.endsWith(".html") && file !== "404.html")
    .sort();
}

function pagePath(file) {
  return BASE + file.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
}

function stripTags(html) {
  return html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function menuLink(href) {
  const url = new URL(href, SITE_ORIGIN);
  return url.origin === SITE_ORIGIN ? url.pathname : href;
}

function summarizePage(file, html) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<a class="header-anchor"[\s\S]*?<\/a>/, "");
  const menu = (html.match(/<header\b[\s\S]*?<\/header>|<aside\b[\s\S]*?<\/aside>/g) ?? []).join("");
  const navLinks = [...menu.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => menuLink(match[1]));
  return {
    path: pagePath(file),
    h1: h1 === undefined ? null : stripTags(h1),
    textLength: stripTags(html.match(/<body\b[\s\S]*<\/body>/)?.[0] ?? "").length,
    mermaidCount: (html.match(/class="mermaid"/g) ?? []).length,
    navLinks: [...new Set(navLinks)].sort(),
  };
}

function resolveFile(dist, pathname) {
  const path = decodeURIComponent(pathname.slice(BASE.length));
  const candidates = path === "" || path.endsWith("/") ? [`${path}index.html`] : [path, `${path}.html`];
  return candidates.map((candidate) => join(dist, candidate)).find((candidate) => existsSync(candidate));
}

function checkStructure(dist, files) {
  const errors = [];
  const ids = new Map();
  const idsOf = (file) => {
    if (!ids.has(file)) {
      ids.set(file, new Set([...readFileSync(file, "utf-8").matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])));
    }
    return ids.get(file);
  };

  for (const file of files) {
    const html = readFileSync(join(dist, file), "utf-8");
    if (summarizePage(file, html).h1 === null) errors.push(`${file}: no H1`);

    for (const [, raw] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const href = raw.replaceAll("&amp;", "&");
      const url = new URL(href, SITE_ORIGIN + pagePath(file));
      if (url.origin !== SITE_ORIGIN) continue;
      if (!url.pathname.startsWith(BASE)) {
        errors.push(`${file}: link outside ${BASE}: ${href}`);
        continue;
      }
      const target = resolveFile(dist, url.pathname);
      if (target === undefined) {
        errors.push(`${file}: broken link: ${href}`);
      } else if (url.hash.length > 1 && !idsOf(target).has(decodeURIComponent(url.hash.slice(1)))) {
        errors.push(`${file}: broken anchor: ${href}`);
      }
    }
  }
  return errors;
}

function compareWithBaseline(baselinePages, currentPages) {
  const errors = [];
  const current = new Map(currentPages.map((page) => [page.path, page]));
  const known = new Set(baselinePages.map((page) => page.path));

  for (const page of currentPages) {
    if (!known.has(page.path)) errors.push(`${page.path}: page is not in the baseline`);
  }
  for (const before of baselinePages) {
    const after = current.get(before.path);
    if (after === undefined) {
      errors.push(`${before.path}: page disappeared`);
      continue;
    }
    if (after.h1 !== before.h1) errors.push(`${before.path}: H1 changed: "${before.h1}" -> "${after.h1}"`);
    if (after.textLength < before.textLength) errors.push(`${before.path}: text shrank: ${before.textLength} -> ${after.textLength}`);
    if (after.mermaidCount < before.mermaidCount) errors.push(`${before.path}: fewer diagrams: ${before.mermaidCount} -> ${after.mermaidCount}`);
    for (const link of before.navLinks) {
      if (!after.navLinks.includes(link)) errors.push(`${before.path}: menu lost a link: ${link}`);
    }
  }
  return errors;
}

const args = readArgs(process.argv.slice(2));
const files = existsSync(args.dist) ? findPages(args.dist) : [];
if (files.length === 0) {
  console.error(`✗ No pages in ${args.dist}. Run \`npm run docs:build\` first.`);
  process.exit(1);
}
const pages = files.map((file) => summarizePage(file, readFileSync(join(args.dist, file), "utf-8"))).sort((a, b) => a.path.localeCompare(b.path));

if (args.writeBaseline) {
  writeFileSync(args.writeBaseline, `${JSON.stringify({ pages }, null, 2)}\n`, "utf-8");
  console.log(`✓ Wrote a baseline of ${pages.length} pages to ${args.writeBaseline}`);
  process.exit(0);
}

const errors = checkStructure(args.dist, files);
if (args.baseline) {
  errors.push(...compareWithBaseline(JSON.parse(readFileSync(args.baseline, "utf-8")).pages, pages));
}
if (errors.length > 0) {
  console.error(errors.map((error) => `✗ ${error}`).join("\n"));
  process.exit(1);
}
console.log(`✓ Site check passed: ${pages.length} pages${args.baseline ? ", no worse than the baseline" : ""}`);
