import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildEntryPointSummary } from "../src/agents.js";

const asset = (language: string, path: string) =>
  readFileSync(fileURLToPath(new URL(`../assets/i18n/${language}/${path}`, import.meta.url)), "utf-8");

// RU keeps a full section per chain, EN keeps a one-line summary per flow.
const chainZero = {
  ru: (rules: string) => rules.slice(rules.indexOf("### ЦЕПОЧКА 0"), rules.indexOf("### ЦЕПОЧКА 1")),
  en: (rules: string) => rules.split("\n").find((line) => line.startsWith("- **Flow 0")) ?? "",
};

describe.each([
  ["ru", "концепт", ["Фаза концепта", "Этап концепта", "Разбор ответа"]],
  ["en", "concept", ["Concept phase", "Concept stage", "Answer review"]],
] as const)("onboarding docs (%s)", (language, concept, terms) => {
  it("workflow rule describes the concept before the stack", () => {
    const chain = chainZero[language](asset(language, "rules/20-workflow.mdc"));
    expect(chain).toContain("idea.md");
    expect(chain.indexOf("idea.md")).toBeLessThan(chain.indexOf("30-tech-stack.mdc"));
  });

  it("CLAUDE.md and AGENTS.md describe /l1-onboard as concept first, stack after", () => {
    const line = buildEntryPointSummary(language, "l1dder").split("\n").find((entry) => entry.startsWith("- `/l1-onboard`")) ?? "";
    expect(line).toContain(concept);
    expect(line.indexOf(concept)).toBeLessThan(line.indexOf("30-tech-stack.mdc"));
  });

  it("glossary defines the onboarding terms", () => {
    const glossary = asset(language, "GLOSSARY.md");
    for (const term of terms) expect(glossary).toContain(`**${term}**`);
  });
});
