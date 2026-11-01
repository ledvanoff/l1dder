#!/usr/bin/env node
/**
 * scripts/check-site.mjs
 *
 * Checks the built VitePress site without a browser (no new dependencies):
 *   node scripts/check-site.mjs [distDir]                    links, anchors, files, sitemap.xml and SEO tags are correct
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
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readArgs(argv) {
  const args = { dist: join(repoRoot, "site", ".vitepress", "dist") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--baseline") args.baseline = argv[++i];
    else if (argv[i] === "--write-baseline") args.writeBaseline = argv[++i];
    else args.dist = resolve(argv[i]);
  }
  return args;
}

const args = readArgs(process.argv.slice(2));
const dist = args.dist;

const files = existsSync(dist)
  ? readdirSync(dist, { recursive: true })
      .map((file) => String(file).split(sep).join("/"))
      .filter((file) => file.endsWith(".html") && file !== "404.html")
      .sort()
  : [];
if (files.length === 0) {
  console.error(`✗ No pages in ${dist}. Run \`npm run docs:build\` first.`);
  process.exit(1);
}

function resolveFile(pathname) {
  const path = pathname.slice(BASE.length);
  const candidates = path === "" || path.endsWith("/") ? [`${path}index.html`] : [path, `${path}.html`];
  return candidates.map((candidate) => join(dist, candidate)).find((candidate) => existsSync(candidate));
}

function idsOf(file) {
  return new Set([...readFileSync(file, "utf-8").matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
}

function pagePath(file) {
  return BASE + file.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
}

function stripTags(html) {
  return html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function metaProperty(html, name) {
  return html.match(new RegExp(`<meta property="${name}" content="([^"]*)"`))?.[1];
}

function menuLink(href) {
  const url = new URL(href, SITE_ORIGIN);
  return url.origin === SITE_ORIGIN ? url.pathname : href;
}

function summarizePage(file) {
  const html = readFileSync(join(dist, file), "utf-8");
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

const pages = files.map(summarizePage).sort((a, b) => a.path.localeCompare(b.path));

if (args.writeBaseline) {
  writeFileSync(args.writeBaseline, `${JSON.stringify({ pages }, null, 2)}\n`, "utf-8");
  console.log(`✓ Wrote a baseline of ${pages.length} pages to ${args.writeBaseline}`);
  process.exit(0);
}

const errors = [];
const seen = { title: new Map(), description: new Map() };
for (const file of files) {
  const html = readFileSync(join(dist, file), "utf-8");
  if (summarizePage(file).h1 === null) errors.push(`${file}: no H1`);
  const tags = {
    title: html.match(/<title>([^<]*)<\/title>/)?.[1],
    description: html.match(/<meta name="description" content="([^"]*)"/)?.[1],
  };
  for (const name of ["title", "description"]) {
    const value = tags[name];
    if (!value) errors.push(`${file}: no ${name}`);
    else if (seen[name].has(value)) errors.push(`${file}: same ${name} as ${seen[name].get(value)}`);
    else seen[name].set(value, file);
  }
  for (const name of ["title", "description"]) {
    const value = metaProperty(html, `og:${name}`);
    if (value !== tags[name]) errors.push(`${file}: og:${name} is ${value}`);
  }
  const ogImage = metaProperty(html, "og:image");
  const imageFile = ogImage?.startsWith(SITE_ORIGIN + BASE) ? resolveFile(new URL(ogImage).pathname) : undefined;
  if (imageFile === undefined) {
    errors.push(`${file}: og:image not found: ${ogImage}`);
  } else {
    const png = readFileSync(imageFile);
    const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
    if (size !== "1200x630") errors.push(`${file}: og:image is ${size}, expected 1200x630`);
  }
  if (!html.includes('<meta name="twitter:card" content="summary_large_image"')) errors.push(`${file}: no twitter:card`);
  const ogUrl = metaProperty(html, "og:url");
  if (ogUrl !== SITE_ORIGIN + pagePath(file)) errors.push(`${file}: og:url is ${ogUrl}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (canonical !== SITE_ORIGIN + pagePath(file)) errors.push(`${file}: canonical is ${canonical}`);
  for (const lang of ["ru", "en", "x-default"]) {
    if (!html.includes(`<link rel="alternate" hreflang="${lang}"`)) errors.push(`${file}: no hreflang ${lang}`);
  }
  for (const [, href] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(href, SITE_ORIGIN + pagePath(file));
    if (url.origin !== SITE_ORIGIN) continue;
    if (!url.pathname.startsWith(BASE)) {
      errors.push(`${file}: link outside ${BASE}: ${href}`);
      continue;
    }
    const target = resolveFile(url.pathname);
    if (target === undefined) errors.push(`${file}: broken link: ${href}`);
    else if (url.hash.length > 1 && !idsOf(target).has(decodeURIComponent(url.hash.slice(1)))) errors.push(`${file}: broken anchor: ${href}`);
  }
}
const sitemapFile = join(dist, "sitemap.xml");
if (existsSync(sitemapFile)) {
  const listed = new Set([...readFileSync(sitemapFile, "utf-8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname));
  for (const page of pages) {
    if (!listed.has(page.path)) errors.push(`${page.path}: not in sitemap.xml`);
    listed.delete(page.path);
  }
  for (const path of listed) errors.push(`${path}: in sitemap.xml but not a page`);
} else {
  errors.push("sitemap.xml is missing");
}
if (args.baseline) {
  const baselinePages = JSON.parse(readFileSync(args.baseline, "utf-8")).pages;
  const known = new Set(baselinePages.map((page) => page.path));
  for (const page of pages) {
    if (!known.has(page.path)) errors.push(`${page.path}: page is not in the baseline`);
  }
  const current = new Map(pages.map((page) => [page.path, page]));
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
}
if (errors.length > 0) {
  console.error(errors.map((error) => `✗ ${error}`).join("\n"));
  process.exit(1);
}
console.log(`✓ Site check passed: ${files.length} pages${args.baseline ? ", no worse than the baseline" : ""}`);
