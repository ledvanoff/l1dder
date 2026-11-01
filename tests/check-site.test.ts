import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/check-site.mjs", import.meta.url));
const tempDirs: string[] = [];

const SITE_ORIGIN = "https://ledvanoff.github.io";

interface PageOptions {
  readonly path?: string;
  readonly h1?: string;
  readonly nav?: string;
  readonly body?: string;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly canonical?: string | null;
  readonly hreflangs?: readonly string[];
}

function page({
  path = "/l1dder/guide",
  h1 = "Guide",
  nav = '<a href="/l1dder/">Home</a><a href="/l1dder/guide">Guide</a>',
  body = "Some useful text",
  title = `Title of ${path}`,
  description = `Description of ${path}`,
  canonical = SITE_ORIGIN + path,
  hreflangs = ["ru", "en", "x-default"],
}: PageOptions = {}): string {
  const head = [
    title === null ? "" : `<title>${title}</title>`,
    description === null ? "" : `<meta name="description" content="${description}">`,
    canonical === null ? "" : `<link rel="canonical" href="${canonical}">`,
    ...hreflangs.map((lang) => `<link rel="alternate" hreflang="${lang}" href="${SITE_ORIGIN + path}">`),
  ].join("");
  return `<!DOCTYPE html><html><head>${head}<link rel="stylesheet" href="/l1dder/style.css"></head><body>
<header class="VPNav">${nav}</header>
<aside class="VPSidebar"><a href="/l1dder/guide">Guide</a></aside>
<h1 id="guide">${h1} <a class="header-anchor" href="#guide" aria-label="Permalink">&#8203;</a></h1>
<p id="details">${body}</p></body></html>`;
}

function sitemap(...paths: string[]): string {
  return `<urlset>${paths.map((path) => `<url><loc>${SITE_ORIGIN + path}</loc></url>`).join("")}</urlset>`;
}

function validPages(): Record<string, string> {
  return {
    "index.html": page({ path: "/l1dder/", h1: "Home" }),
    "guide.html": page(),
    "style.css": "",
    "sitemap.xml": sitemap("/l1dder/", "/l1dder/guide"),
    "404.html": "<html><body>Not found</body></html>",
  };
}

function makeSite(pages: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), "l1dder-site-"));
  tempDirs.push(dir);
  for (const [path, html] of Object.entries(pages)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), html, "utf-8");
  }
  return dir;
}

function run(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf-8" });
}

afterEach(() => {
  for (const path of tempDirs.splice(0, tempDirs.length)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("check-site: built site structure", () => {
  it("passes a valid site", () => {
    const { status, stderr } = run(makeSite(validPages()));

    expect(stderr).toBe("");
    expect(status).toBe(0);
  });

  it.each([
    ["a link to a missing page", '<a href="/l1dder/missing">x</a>', "/l1dder/missing"],
    ["a missing asset", '<img src="/l1dder/logo.png">', "/l1dder/logo.png"],
    ["a missing anchor on another page", '<a href="/l1dder/guide#nope">x</a>', "/l1dder/guide#nope"],
    ["a missing anchor on the same page", '<a href="#nope">x</a>', "#nope"],
    ["a link without the base path", '<a href="/guide">x</a>', "outside /l1dder/: /guide"],
    ["a broken absolute link to the site", '<a href="https://ledvanoff.github.io/l1dder/missing">x</a>', "/l1dder/missing"],
  ])("fails on %s and names it", (_name, snippet, expected) => {
    const { status, stderr } = run(makeSite({ ...validPages(), "guide.html": page({ body: snippet }) }));

    expect(status).toBe(1);
    expect(stderr).toContain("guide.html");
    expect(stderr).toContain(expected);
  });

  it("accepts encoded anchors, section folders and external links", () => {
    const body =
      '<a href="/l1dder/en/#%D0%BE%D0%B1%D0%B7%D0%BE%D1%80">x</a><a href="https://example.com/a">y</a><a href="mailto:a@b.c">z</a>';
    const site = makeSite({
      ...validPages(),
      "guide.html": page({ body }),
      "en/index.html": page({ path: "/l1dder/en/", h1: "English", body: '<span id="обзор">Overview</span>' }),
      "sitemap.xml": sitemap("/l1dder/", "/l1dder/en/", "/l1dder/guide"),
    });

    const { status, stderr } = run(site);

    expect(stderr).toBe("");
    expect(status).toBe(0);
  });

  it("fails on a page without H1", () => {
    const { status, stderr } = run(makeSite({ ...validPages(), "guide.html": "<html><body>text</body></html>" }));

    expect(status).toBe(1);
    expect(stderr).toContain("guide.html: no H1");
  });

  it("fails on a site without pages", () => {
    const { status, stderr } = run(makeSite({}));

    expect(status).toBe(1);
    expect(stderr).toContain("No pages");
  });
});

describe("check-site: sitemap.xml and page tags", () => {
  it.each<[string, Record<string, string>, string]>([
    ["a page missing from sitemap.xml", { "sitemap.xml": sitemap("/l1dder/") }, "/l1dder/guide: not in sitemap.xml"],
    [
      "an unknown address in sitemap.xml",
      { "sitemap.xml": sitemap("/l1dder/", "/l1dder/guide", "/l1dder/old") },
      "/l1dder/old: in sitemap.xml but not a page",
    ],
    ["a page without a title", { "guide.html": page({ title: null }) }, "guide.html: no title"],
    ["a repeated title", { "guide.html": page({ title: "Title of /l1dder/" }) }, "index.html: same title as guide.html"],
    ["a page without a description", { "guide.html": page({ description: null }) }, "guide.html: no description"],
    [
      "a repeated description",
      { "guide.html": page({ description: "Description of /l1dder/" }) },
      "index.html: same description as guide.html",
    ],
    [
      "a canonical address of another page",
      { "guide.html": page({ canonical: "https://ledvanoff.github.io/l1dder/" }) },
      "guide.html: canonical is https://ledvanoff.github.io/l1dder/",
    ],
    ["a page without a canonical address", { "guide.html": page({ canonical: null }) }, "guide.html: canonical is undefined"],
    ["a missing language link", { "guide.html": page({ hreflangs: ["ru", "x-default"] }) }, "guide.html: no hreflang en"],
  ])("fails on %s", (_name, changes, expected) => {
    const { status, stderr } = run(makeSite({ ...validPages(), ...changes }));

    expect(status).toBe(1);
    expect(stderr).toContain(expected);
  });

  it("fails without sitemap.xml", () => {
    const { "sitemap.xml": _removed, ...pages } = validPages();

    const { status, stderr } = run(makeSite(pages));

    expect(status).toBe(1);
    expect(stderr).toContain("sitemap.xml is missing");
  });
});

describe("check-site: comparison with the baseline", () => {
  function writeBaseline(site: string): string {
    const baseline = join(site, "baseline.json");
    expect(run(site, "--write-baseline", baseline).status).toBe(0);
    return baseline;
  }

  it("records the address of every page except 404", () => {
    const site = makeSite({ ...validPages(), "en/index.html": page({ path: "/l1dder/en/", h1: "English" }) });

    const { pages } = JSON.parse(readFileSync(writeBaseline(site), "utf-8"));

    expect(pages.map((entry: { path: string }) => entry.path)).toEqual(["/l1dder/", "/l1dder/en/", "/l1dder/guide"]);
  });

  it("passes when nothing got worse, including more text and new menu links", () => {
    const site = makeSite(validPages());
    const baseline = writeBaseline(site);
    const nav = '<a href="/l1dder/">Home</a><a href="/l1dder/guide">Guide</a><a href="/l1dder/guide#details">New</a>';
    writeFileSync(join(site, "guide.html"), page({ nav, body: "Some useful text and even more of it" }));

    const { status, stderr } = run(site, "--baseline", baseline);

    expect(stderr).toBe("");
    expect(status).toBe(0);
  });

  it("fails on fewer diagrams", () => {
    const site = makeSite({ ...validPages(), "guide.html": page({ body: 'Text<div class="mermaid"></div>' }) });
    const baseline = writeBaseline(site);
    writeFileSync(join(site, "guide.html"), page({ body: "Text" }));

    const { status, stderr } = run(site, "--baseline", baseline);

    expect(status).toBe(1);
    expect(stderr).toContain("fewer diagrams: 1 -> 0");
  });

  it.each([
    ["a removed page", (site: string) => rmSync(join(site, "guide.html")), "/l1dder/guide: page disappeared"],
    [
      "a new page",
      (site: string) => writeFileSync(join(site, "extra.html"), page({ path: "/l1dder/extra", h1: "Extra" })),
      "/l1dder/extra: page is not in the baseline",
    ],
    ["a changed H1", (site: string) => writeFileSync(join(site, "guide.html"), page({ h1: "Other" })), 'H1 changed: "Guide" -> "Other"'],
    ["less text", (site: string) => writeFileSync(join(site, "guide.html"), page({ body: "Text" })), "text shrank"],
    [
      "a lost menu link",
      (site: string) => writeFileSync(join(site, "guide.html"), page({ nav: '<a href="/l1dder/guide">Guide</a>' })),
      "menu lost a link: /l1dder/",
    ],
  ])("fails on %s", (_name, change, expected) => {
    const site = makeSite(validPages());
    const baseline = writeBaseline(site);
    change(site);

    const { status, stderr } = run(site, "--baseline", baseline);

    expect(status).toBe(1);
    expect(stderr).toContain(expected);
  });
});
