import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const skill = (language: string) =>
  readFileSync(fileURLToPath(new URL(`../assets/i18n/${language}/skills/l1-chore/SKILL.md`, import.meta.url)), "utf-8");

const phrases = {
  ru: {
    purpose: "## Для чего эта команда",
    step: "## ШАГ",
    noEdits: "не меняй ни одного файла",
    logHeading: "## 4. Журнал служебных правок (`CHORE-NNN`)",
    logColumns: "| ID правки | Дата | Что и зачем | Сообщение коммита |",
    atTheEnd: "в конец `docs/backlog.md`",
  },
  en: {
    purpose: "## What this command is for",
    step: "## STEP",
    noEdits: "do not change any file",
    logHeading: "## 4. Chore Log (`CHORE-NNN`)",
    logColumns: "| Chore ID | Date | What and why | Commit message |",
    atTheEnd: "to the end of `docs/backlog.md`",
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
