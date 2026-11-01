#!/usr/bin/env node
/**
 * scripts/check-site.mjs
 *
 * Checks the built VitePress site without a browser (no new dependencies):
 *   node scripts/check-site.mjs [distDir]                    links, anchors, files, sitemap.xml, llms.txt and SEO tags are correct
 *   node scripts/check-site.mjs [distDir] --baseline <file>  the above, and no page got worse than the baseline
 *   node scripts/check-site.mjs [distDir] --write-baseline <file>
 *
 * Runs in `make test-e2e`; the baseline comparison runs in `make site-gate`.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const SITE_ORIGIN = "https://ledvanoff.github.io";
const BASE = "/l1dder/";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { baseline: { type: "string" }, "write-baseline": { type: "string" } },
});
const args = { baseline: values.baseline, writeBaseline: values["write-baseline"] };
const dist = resolve(positionals[0] ?? join(repoRoot, "site", ".vitepress", "dist"));

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
  return candidates.map((candidate) => join(dist, candidate)).find((candidate) => statSync(candidate, { throwIfNoEntry: false })?.isFile());
}

function decodeAnchor(anchor) {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor; // a malformed escape cannot match an id and is reported as a broken anchor
  }
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

function readBaseline(file) {
  const { pages } = JSON.parse(readFileSync(file, "utf-8"));
  const valid = (page) =>
    typeof page.path === "string" &&
    Number.isFinite(page.textLength) &&
    Number.isFinite(page.mermaidCount) &&
    Array.isArray(page.navLinks);
  if (!Array.isArray(pages) || !pages.every(valid)) {
    console.error(`✗ ${file} is not a valid baseline. Rewrite it with --write-baseline.`);
    process.exit(1);
  }
  return pages;
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
    const ogValue = metaProperty(html, `og:${name}`);
    if (ogValue !== value) errors.push(`${file}: og:${name} is ${ogValue}`);
  }
  const ogImage = metaProperty(html, "og:image");
  const imageFile = ogImage?.startsWith(SITE_ORIGIN + BASE) ? resolveFile(new URL(ogImage).pathname) : undefined;
  if (imageFile === undefined) {
    errors.push(`${file}: og:image not found: ${ogImage}`);
  } else {
    const png = readFileSync(imageFile);
    if (png.length < 24 || png.toString("latin1", 0, 8) !== "\x89PNG\r\n\x1a\n") {
      errors.push(`${file}: og:image is not a PNG`);
    } else {
      const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
      if (size !== "1200x630") errors.push(`${file}: og:image is ${size}, expected 1200x630`);
    }
  }
  if (!html.includes('<meta name="twitter:card" content="summary_large_image"')) errors.push(`${file}: no twitter:card`);
  const ogUrl = metaProperty(html, "og:url");
  if (ogUrl !== SITE_ORIGIN + pagePath(file)) errors.push(`${file}: og:url is ${ogUrl}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (canonical !== SITE_ORIGIN + pagePath(file)) errors.push(`${file}: canonical is ${canonical}`);
  const ruPath = pagePath(file.replace(/^en\//, ""));
  const enPath = pagePath(`en/${file.replace(/^en\//, "")}`);
  for (const [lang, path] of [["ru", ruPath], ["en", enPath], ["x-default", enPath]]) {
    const href = html.match(new RegExp(`<link rel="alternate" hreflang="${lang}" href="([^"]*)"`))?.[1];
    if (href === undefined) errors.push(`${file}: no hreflang ${lang}`);
    else if (href !== SITE_ORIGIN + path) errors.push(`${file}: hreflang ${lang} is ${href}, expected ${SITE_ORIGIN + path}`);
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
    else if (url.hash.length > 1 && !idsOf(target).has(decodeAnchor(url.hash.slice(1)))) errors.push(`${file}: broken anchor: ${href}`);
  }
}
for (const [name, listedUrls] of [
  ["sitemap.xml", (text) => [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])],
  ["llms.txt", (text) => [...text.matchAll(/\]\((https?:[^)]+)\)/g)].map((match) => match[1])],
]) {
  const listing = join(dist, name);
  if (!existsSync(listing)) {
    errors.push(`${name} is missing`);
    continue;
  }
  const text = readFileSync(listing, "utf-8");
  const urls = listedUrls(text);
  if (name === "sitemap.xml") {
    for (const url of urls) {
      if (!url.startsWith(SITE_ORIGIN)) errors.push(`${url}: outside the site in ${name}`);
    }
  }
  const ownPaths = urls.filter((url) => url.startsWith(SITE_ORIGIN)).map((url) => new URL(url).pathname);
  for (const path of new Set(ownPaths.filter((path, i) => ownPaths.indexOf(path) !== i))) {
    errors.push(`${path}: listed twice in ${name}`);
  }
  const listed = new Set(ownPaths);
  for (const page of pages) {
    if (!listed.has(page.path)) errors.push(`${page.path}: not in ${name}`);
    else if (name === "llms.txt" && !text.includes(`](${SITE_ORIGIN + page.path}): `)) errors.push(`${page.path}: no description in ${name}`);
    listed.delete(page.path);
  }
  for (const path of listed) errors.push(`${path}: in ${name} but not a page`);
}
if (args.baseline) {
  const baselinePages = readBaseline(args.baseline);
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
