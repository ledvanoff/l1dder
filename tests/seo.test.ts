import { readdirSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildPageSeo, renderLlmsTxt, SEO_PAGES } from "../site/.vitepress/seo.mjs";

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

  it("repeats the title, description and address in Open Graph", () => {
    const { head } = buildPageSeo("en/guide.md");

    expect(head).toContainEqual(["meta", { property: "og:title", content: "How L1DDER Works: Overview and Visual Map" }]);
    expect(head).toContainEqual([
      "meta",
      {
        property: "og:description",
        content:
          "A plain-language guide to L1DDER: how work moves from an idea to a finished product and why your AI agent keeps its context between tasks.",
      },
    ]);
    expect(head).toContainEqual(["meta", { property: "og:url", content: "https://ledvanoff.github.io/l1dder/en/guide" }]);
  });

  it("describes the site and its preview image", () => {
    const { head } = buildPageSeo("guide.md");

    for (const [property, content] of [
      ["og:type", "website"],
      ["og:site_name", "L1DDER"],
      ["og:image", "https://ledvanoff.github.io/l1dder/og-card.png"],
      ["og:image:width", "1200"],
      ["og:image:height", "630"],
      ["og:image:alt", "L1DDER: Spec-Driven Development with AI Agents"],
    ]) {
      expect(head).toContainEqual(["meta", { property, content }]);
    }
  });

  it.each([
    ["guide.md", "ru_RU", "en_US"],
    ["en/guide.md", "en_US", "ru_RU"],
  ])("sets the Open Graph locale of %s", (relativePath, locale, alternate) => {
    const { head } = buildPageSeo(relativePath);

    expect(head).toContainEqual(["meta", { property: "og:locale", content: locale }]);
    expect(head).toContainEqual(["meta", { property: "og:locale:alternate", content: alternate }]);
  });

  it("asks for a large Twitter card", () => {
    expect(buildPageSeo("guide.md").head).toContainEqual(["meta", { name: "twitter:card", content: "summary_large_image" }]);
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

describe("renderLlmsTxt", () => {
  it("starts with the project name and a short summary", () => {
    expect(renderLlmsTxt()).toMatch(/^# L1DDER\n\n> L1DDER is a spec-driven development framework for AI coding agents/);
  });

  it("links the project on GitHub and npm", () => {
    const text = renderLlmsTxt();

    expect(text).toContain("## Project");
    expect(text).toContain("- [GitHub](https://github.com/ledvanoff/l1dder)");
    expect(text).toContain("- [npm](https://www.npmjs.com/package/l1dder)");
  });

  it("lists every page of the table once", () => {
    const text = renderLlmsTxt();

    for (const [relativePath, { title, description }] of Object.entries(SEO_PAGES)) {
      const url = buildPageSeo(relativePath).head.find(([, attrs]) => attrs.rel === "canonical")?.[1].href;
      expect(text.split(`- [${title}](${url}): ${description}`)).toHaveLength(2);
    }
  });

  it("lists pages under a section of their language", () => {
    const text = renderLlmsTxt();
    const russian = text.indexOf("## Документация на русском");
    const english = text.indexOf("## English documentation");
    const russianPage = text.indexOf(
      "- [Как работать с L1DDER: обзор и главная схема](https://ledvanoff.github.io/l1dder/guide): Путеводитель по L1DDER",
    );
    const englishPage = text.indexOf(
      "- [How L1DDER Works: Overview and Visual Map](https://ledvanoff.github.io/l1dder/en/guide): A plain-language guide",
    );

    expect(russian).toBeGreaterThan(-1);
    expect(russianPage).toBeGreaterThan(russian);
    expect(english).toBeGreaterThan(russianPage);
    expect(englishPage).toBeGreaterThan(english);
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
