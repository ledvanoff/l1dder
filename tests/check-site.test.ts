import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/check-site.mjs", import.meta.url));
const tempDirs: string[] = [];

interface PageOptions {
  readonly h1?: string;
  readonly nav?: string;
  readonly body?: string;
}

function page({
  h1 = "Guide",
  nav = '<a href="/l1dder/">Home</a><a href="/l1dder/guide">Guide</a>',
  body = "Some useful text",
}: PageOptions = {}): string {
  return `<!DOCTYPE html><html><head><link rel="stylesheet" href="/l1dder/style.css"></head><body>
<header class="VPNav">${nav}</header>
<aside class="VPSidebar"><a href="/l1dder/guide">Guide</a></aside>
<h1 id="guide">${h1} <a class="header-anchor" href="#guide" aria-label="Permalink">&#8203;</a></h1>
<p id="details">${body}</p></body></html>`;
}

function makeSite(pages: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), "l1dder-site-"));
  tempDirs.push(dir);
  writeFileSync(join(dir, "style.css"), "");
  for (const [path, html] of Object.entries(pages)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), html, "utf-8");
  }
  return dir;
}

function validPages(): Record<string, string> {
  return { "index.html": page({ h1: "Home" }), "guide.html": page(), "404.html": "<html><body>Not found</body></html>" };
}

function run(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf-8" });
}

function writeBaseline(site: string): string {
  const baseline = join(site, "baseline.json");
  expect(run(site, "--write-baseline", baseline).status).toBe(0);
  return baseline;
}

afterEach(() => {
  for (const path of tempDirs.splice(0, tempDirs.length)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("check-site: built site structure", () => {
  it("passes a site whose links, anchors and files all exist", () => {
    const { status, stderr } = run(makeSite(validPages()));

    expect(stderr).toBe("");
    expect(status).toBe(0);
  });

  it.each([
    ["a missing page", '<a href="/l1dder/missing">x</a>', "/l1dder/missing"],
    ["a missing asset", '<img src="/l1dder/logo.png">', "/l1dder/logo.png"],
    ["a missing anchor on another page", '<a href="/l1dder/guide#nope">x</a>', "/l1dder/guide#nope"],
    ["a missing anchor on the same page", '<a href="#nope">x</a>', "#nope"],
    ["a link without the base path", '<a href="/guide">x</a>', "/guide"],
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
      "en/index.html": page({ h1: "English", body: '<span id="обзор">Overview</span>' }),
    });

    expect(run(site).stderr).toBe("");
  });

  it("fails on a site without pages", () => {
    const { status, stderr } = run(makeSite({}));

    expect(status).toBe(1);
    expect(stderr).toContain("No pages");
  });

  it("fails on a page without H1", () => {
    const { status, stderr } = run(makeSite({ ...validPages(), "guide.html": "<html><body>text</body></html>" }));

    expect(status).toBe(1);
    expect(stderr).toContain("guide.html");
    expect(stderr).toContain("H1");
  });
});

describe("check-site: comparison with the baseline", () => {
  it("records every page except 404 with its address, H1, text, diagrams and menu", () => {
    const site = makeSite({ ...validPages(), "en/index.html": page({ h1: "English", body: '<div class="mermaid"></div>' }) });

    const { pages } = JSON.parse(readFileSync(writeBaseline(site), "utf-8"));

    expect(pages.map((entry: { path: string }) => entry.path)).toEqual(["/l1dder/", "/l1dder/en/", "/l1dder/guide"]);
    expect(pages[1].h1).toBe("English");
    expect(pages[1].mermaidCount).toBe(1);
    expect(pages[2].navLinks).toEqual(["/l1dder/", "/l1dder/guide"]);
    expect(pages[2].textLength).toBeGreaterThan(0);
  });

  it("passes when nothing got worse, including more text and new menu links", () => {
    const site = makeSite(validPages());
    const baseline = writeBaseline(site);
    const nav = '<a href="/l1dder/">Home</a><a href="/l1dder/guide">Guide</a><a href="/l1dder/">New</a>';
    writeFileSync(join(site, "guide.html"), page({ nav, body: "Some useful text and even more of it" }));

    expect(run(site, "--baseline", baseline).status).toBe(0);
  });

  it.each([
    ["a removed page", (site: string) => rmSync(join(site, "guide.html")), "/l1dder/guide"],
    ["a new page", (site: string) => writeFileSync(join(site, "extra.html"), page({ h1: "Extra" })), "/l1dder/extra"],
    ["a changed H1", (site: string) => writeFileSync(join(site, "guide.html"), page({ h1: "Other" })), "H1"],
    ["less text", (site: string) => writeFileSync(join(site, "guide.html"), page({ body: "Text" })), "text"],
    [
      "a lost menu link",
      (site: string) => writeFileSync(join(site, "guide.html"), page({ nav: '<a href="/l1dder/guide">Guide</a>' })),
      "menu",
    ],
  ])("fails on %s", (_name, change, expected) => {
    const site = makeSite(validPages());
    const baseline = writeBaseline(site);
    change(site);

    const { status, stderr } = run(site, "--baseline", baseline);

    expect(status).toBe(1);
    expect(stderr).toContain(expected);
  });

  it("fails on fewer diagrams", () => {
    const site = makeSite({ ...validPages(), "guide.html": page({ body: 'Text<div class="mermaid"></div>' }) });
    const baseline = writeBaseline(site);
    writeFileSync(join(site, "guide.html"), page({ body: "Text" }));

    const { status, stderr } = run(site, "--baseline", baseline);

    expect(status).toBe(1);
    expect(stderr).toContain("diagrams");
  });
});
