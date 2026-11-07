import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const asset = (language: string, path: string) =>
  readFileSync(fileURLToPath(new URL(`../assets/i18n/${language}/${path}`, import.meta.url)), "utf-8");
const skill = (language: string) => asset(language, "skills/l1-chore/SKILL.md");

const phrases = {
  ru: {
    purpose: "## Для чего эта команда",
    step: "## ШАГ",
    noEdits: "не меняй ни одного файла",
    logHeading: "## 4. Журнал служебных правок (`CHORE-NNN`)",
    logColumns: "| ID правки | Дата | Что и зачем | Сообщение коммита |",
    atTheEnd: "в конец `docs/backlog.md`",
    glossaryArticle: "## Служебная правка (`CHORE-NNN` и `/l1-chore`)",
    glossaryBacklogItem: "4. **Журнал служебных правок (`CHORE-NNN`)**",
    workflowChain: "### ЦЕПОЧКА 6: `/l1-chore`",
  },
  en: {
    purpose: "## What this command is for",
    step: "## STEP",
    noEdits: "do not change any file",
    logHeading: "## 4. Chore Log (`CHORE-NNN`)",
    logColumns: "| Chore ID | Date | What and why | Commit message |",
    atTheEnd: "to the end of `docs/backlog.md`",
    glossaryArticle: "## Chore (`CHORE-NNN` & `/l1-chore`)",
    glossaryBacklogItem: "4. **Chore Log (`CHORE-NNN`)**",
    workflowChain: "- **Flow 6 (`/l1-chore`):**",
  },
};

// Text of step N: from its heading to the next step heading.
const step = (language: "ru" | "en", n: number) => {
  const text = skill(language);
  const start = text.indexOf(`${phrases[language].step} ${n}:`);
  const end = text.indexOf(`${phrases[language].step} ${n + 1}:`);
  return start === -1 ? "" : text.slice(start, end === -1 ? undefined : end);
};

describe.each(["ru", "en"] as const)("/l1-chore skill (%s)", (language) => {
  it("explains in plain words, with a git example, what the command is for before the first step", () => {
    const text = skill(language);
    const purpose = text.indexOf(phrases[language].purpose);
    const firstStep = text.indexOf(`${phrases[language].step} 1:`);
    expect(purpose).toBeGreaterThan(-1);
    expect(firstStep).toBeGreaterThan(purpose);
    expect(text.slice(purpose, firstStep)).toContain("git");
  });

  it("stops before any edit when the change alters the product, and points to /l1-task or /l1-hotfix", () => {
    const boundary = step(language, 1);
    expect(boundary).toContain(phrases[language].noEdits);
    expect(boundary).toContain("/l1-task");
    expect(boundary).toContain("/l1-hotfix");
  });

  it("waits for a single ok and runs make ci after the change", () => {
    const text = skill(language);
    expect(text.split("⛔").length - 1).toBe(1);
    expect(text).toContain("make ci");
  });

  it("adds the 4-column chore log to the end of docs/backlog.md when an older project has none", () => {
    const record = step(language, 5);
    expect(record).toContain(phrases[language].atTheEnd);
    expect(record).toContain(phrases[language].logHeading);
    expect(record).toContain(phrases[language].logColumns);
  });
});

describe("/l1-chore skill in both languages", () => {
  it("has the same steps, stops and code blocks in RU and EN", () => {
    const shape = (text: string, stepHeading: string) => [
      text.split(stepHeading).length,
      text.split("⛔").length,
      text.split("```").length,
    ];
    expect(shape(skill("en"), "## STEP")).toEqual(shape(skill("ru"), "## ШАГ"));
  });
});

describe.each(["ru", "en"] as const)("CHORE-NNN in templates, rules and glossary (%s)", (language) => {
  it("ships the backlog template with the same chore log section the skill writes", () => {
    const template = asset(language, "templates/backlog/backlog-template.md");
    const log = template.slice(template.indexOf(phrases[language].logHeading));
    expect(template).toContain(phrases[language].logHeading);
    expect(log).toContain(phrases[language].logColumns);
    expect(log).toContain("/l1-chore");
  });

  it.each([
    "rules/20-workflow.mdc",
    "GLOSSARY.md",
    "templates/roadmap/roadmap-template.md",
    "skills/l1-hotfix/SKILL.md",
  ])("names /l1-chore as a Roadmap Gate exception and drops 'the only exception' in %s", (path) => {
    const text = asset(language, path);
    expect(text).toContain("/l1-chore");
    expect(text).not.toMatch(/единственное исключение|единственное легитимное исключение|only exception/i);
  });

  it("lists CHORE-001 in the ID table and /l1-chore in the command table of 00-methodology", () => {
    const rows = asset(language, "rules/00-methodology.mdc").split("\n").filter((line) => line.startsWith("| "));
    expect(rows.some((row) => row.includes("`CHORE-001`") && row.includes("docs/backlog.md"))).toBe(true);
    expect(rows.some((row) => row.includes("**`/l1-chore`**") && row.includes("l1dder/skills/l1-chore/SKILL.md"))).toBe(true);
  });

  it("routes to /l1-chore in 40-skills-router", () => {
    const rows = asset(language, "rules/40-skills-router.mdc").split("\n").filter((line) => line.startsWith("| "));
    expect(rows.some((row) => row.includes("`/l1-chore`") && row.includes("`l1dder/skills/l1-chore/SKILL.md`"))).toBe(true);
  });

  it("explains chores in the glossary in plain words and lists the chore log as the 4th backlog section", () => {
    const glossary = asset(language, "GLOSSARY.md");
    const start = glossary.indexOf(phrases[language].glossaryArticle);
    expect(start).toBeGreaterThan(-1);
    const article = glossary.slice(start, glossary.indexOf("\n## ", start + 1));
    expect(article).toContain("git");
    expect(glossary).toContain(phrases[language].glossaryBacklogItem);
  });

  it("describes the /l1-chore flow in 20-workflow", () => {
    const workflow = asset(language, "rules/20-workflow.mdc");
    const start = workflow.indexOf(phrases[language].workflowChain);
    expect(start).toBeGreaterThan(-1);
    const chain = workflow.slice(start);
    expect(chain).toContain("CHORE-NNN");
    expect(chain).toContain("⛔");
    expect(chain).toContain("make ci");
  });
});
