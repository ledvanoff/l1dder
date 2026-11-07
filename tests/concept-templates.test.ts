import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const template = (language: string, name: string) =>
  readFileSync(fileURLToPath(new URL(`../assets/i18n/${language}/templates/concept/${name}-template.md`, import.meta.url)), "utf-8");
const skill = (language: string) =>
  readFileSync(fileURLToPath(new URL(`../assets/i18n/${language}/skills/l1-onboard/SKILL.md`, import.meta.url)), "utf-8");
const prose = (text: string) => text.replace(/^```[\s\S]*?^```/gm, "");

describe.each([
  ["ru", "Язык и рантайм", "Технологии", "этап 5"],
  ["en", "Language & Runtime", "Technologies", "stage 5"],
] as const)("concept templates (%s)", (language, techRow, techColumn, stageFive) => {
  it("keeps vision.md to the product vision: four sections, no diagram, no tech table", () => {
    const vision = template(language, "vision");
    expect(vision.match(/^## /gm)).toHaveLength(4);
    expect(vision).not.toContain("```mermaid");
    expect(vision).not.toContain(techRow);
  });

  it("leaves the technologies column of architecture.md to the stack stage", () => {
    const architecture = prose(template(language, "architecture"));
    const header = architecture.split("\n").find((line) => line.startsWith("|") && line.includes(techColumn)) ?? "";
    expect(header).toContain(stageFive);
    expect(skill(language)).toMatch(new RegExp(`architecture\\.md[^\\n]*${techColumn}|${techColumn}[^\\n]*architecture\\.md`));
  });
});

describe("concept templates in both languages", () => {
  const headingLevels = (text: string) => [...prose(text).matchAll(/^(#+) /gm)].map((match) => match[1]?.length);
  it.each(["idea", "vision", "architecture", "data-model", "integrations", "api-contracts"])(
    "%s has the same headings in RU and EN",
    (name) => {
      expect(headingLevels(template("en", name))).toEqual(headingLevels(template("ru", name)));
    },
  );
});
