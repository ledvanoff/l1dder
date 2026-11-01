import { readdirSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildPageSeo, SEO_PAGES } from "../site/.vitepress/seo.mjs";

describe("buildPageSeo", () => {
  it("returns the title and description of a page", () => {
    const seo = buildPageSeo("en/guide.md");

    expect(seo.title).toBe("How L1DDER Works: Overview and Visual Map");
    expect(seo.description).toContain("A plain-language guide to L1DDER");
  });

  it("adds the canonical address of the page", () => {
    expect(buildPageSeo("en/guide.md").head).toContainEqual([
      "link",
      { rel: "canonical", href: "https://ledvanoff.github.io/l1dder/en/guide" },
    ]);
  });

  it.each([
    ["index.md", "https://ledvanoff.github.io/l1dder/"],
    ["en/index.md", "https://ledvanoff.github.io/l1dder/en/"],
  ])("gives %s a clean home address", (relativePath, href) => {
    expect(buildPageSeo(relativePath).head).toContainEqual(["link", { rel: "canonical", href }]);
  });

  it("fails loudly for a page without an entry", () => {
    expect(() => buildPageSeo("new-page.md")).toThrow("new-page.md");
  });

  it("links both language versions, with x-default on English", () => {
    const { head } = buildPageSeo("en/guide.md");

    for (const [hreflang, href] of [
      ["ru", "https://ledvanoff.github.io/l1dder/guide"],
      ["en", "https://ledvanoff.github.io/l1dder/en/guide"],
      ["x-default", "https://ledvanoff.github.io/l1dder/en/guide"],
    ]) {
      expect(head).toContainEqual(["link", { rel: "alternate", hreflang, href }]);
    }
  });
});

describe("SEO table", () => {
  const siteDir = fileURLToPath(new URL("../site", import.meta.url));
  const entries = Object.entries(SEO_PAGES);

  it("has an entry for every page of the site and no extra ones", () => {
    const pages = readdirSync(siteDir, { recursive: true })
      .map((file) => String(file).split(sep).join("/"))
      .filter((file) => file.endsWith(".md") && !file.startsWith(".vitepress/"));

    expect(Object.keys(SEO_PAGES).sort()).toEqual(pages.sort());
    expect(pages).toHaveLength(18);
  });

  it("has unique titles and descriptions of a length that fits search results", () => {
    const titles = entries.map(([, page]) => page.title);
    const descriptions = entries.map(([, page]) => page.description);

    expect(new Set(titles).size).toBe(entries.length);
    expect(new Set(descriptions).size).toBe(entries.length);
    expect(entries.filter(([, page]) => page.title.length > 70)).toEqual([]);
    expect(entries.filter(([, page]) => page.description.length > 160)).toEqual([]);
  });
});
