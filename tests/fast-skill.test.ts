import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const asset = (language: string, path: string) =>
  readFileSync(fileURLToPath(new URL(`../assets/i18n/${language}/${path}`, import.meta.url)), "utf-8");
const skill = (language: string) => asset(language, "skills/l1-fast/SKILL.md");

const phrases = {
  ru: {
    purpose: "## Для чего эта команда",
    step: "## ШАГ",
    noEdits: "не меняй ни одного файла",
    resume: "продолжить эту фичу с Шага 5",
    sizeSigns: ["больше 3 задач", "одного спринта", "модель данных", "внешняя интеграция", "ADR", "ломающие изменения", "отдельный разбор требований"],
    normalPath: "/l1-idea",
    stops: ["⛔ СТОП №1", "⛔ СТОП №2"],
    inProgress: "🚧 реализация",
    mode: "режим: `/l1-fast`",
    reassess: "оцени масштаб заново",
    rerunAll: "весь список Шага 6 заново",
    modeRow: "| **Режим** | `/l1-fast` |",
    planAfter: "записан после реализации",
    completed: "Завершённые спринты",
  },
  en: {
    purpose: "## What this command is for",
    step: "## STEP",
    noEdits: "do not change any file",
    resume: "continue this feature from Step 5",
    sizeSigns: ["more than 3 tasks", "one sprint", "data model", "external integration", "ADR", "breaking changes", "separate requirements review"],
    normalPath: "/l1-idea",
    stops: ["⛔ STOP #1", "⛔ STOP #2"],
    inProgress: "🚧 in-progress",
    mode: "mode: `/l1-fast`",
    reassess: "assess the size again",
    rerunAll: "the whole Step 6 list again",
    modeRow: "| **Mode** | `/l1-fast` |",
    planAfter: "written after the build",
    completed: "Completed Sprints",
  },
};

// Text of step N: from its heading to the next step heading.
const step = (language: "ru" | "en", n: number) => {
  const text = skill(language);
  const start = text.indexOf(`${phrases[language].step} ${n}:`);
  const end = text.indexOf(`${phrases[language].step} ${n + 1}:`);
  return start === -1 ? "" : text.slice(start, end === -1 ? undefined : end);
};

describe.each(["ru", "en"] as const)("/l1-fast skill (%s)", (language) => {
  it("explains in plain words what the command is for before the first step", () => {
    const text = skill(language);
    const purpose = text.indexOf(phrases[language].purpose);
    const firstStep = text.indexOf(`${phrases[language].step} 1:`);
    expect(purpose).toBeGreaterThan(-1);
    expect(firstStep).toBeGreaterThan(purpose);
  });

  it("refuses without editing files while a sprint sits at 1 (CURRENT) and names both ways out", () => {
    const roadmap = step(language, 1);
    expect(roadmap).toContain("1 (CURRENT)");
    expect(roadmap).toContain(phrases[language].noEdits);
    expect(roadmap).toContain("/l1-task");
    expect(roadmap).toContain("/l1-planning");
  });

  it("offers to continue its own interrupted /l1-fast reservation from Step 5 or reject it", () => {
    const roadmap = step(language, 1);
    expect(roadmap).toContain(phrases[language].resume);
    expect(roadmap).toContain(phrases[language].mode);
  });

  it("sends a bug to /l1-hotfix and a change to the project itself to /l1-chore", () => {
    const roadmap = step(language, 1);
    expect(roadmap).toContain("/l1-hotfix");
    expect(roadmap).toContain("/l1-chore");
  });

  it("checks all four signs of a large feature and offers the usual path when one fires", () => {
    const size = step(language, 2);
    for (const sign of phrases[language].sizeSigns) expect(size).toContain(sign);
    expect(size).toContain(phrases[language].normalPath);
  });

  it("has exactly two stops: one before any edit and one after every check", () => {
    const [first, second] = phrases[language].stops;
    const text = skill(language);
    expect(text.split("⛔").length - 1).toBe(2);
    expect(step(language, 3)).toContain(first);
    expect(step(language, 6)).toContain(second);
  });

  it("reserves the IDs at 1 (CURRENT) in the roadmap after the first ok and before any code", () => {
    const reserve = step(language, 4);
    for (const id of ["IDEA-NNN", "FEAT-NNN", "SPRINT-NN", "Delivery Queue", "1 (CURRENT)"]) expect(reserve).toContain(id);
    expect(reserve).toContain(phrases[language].inProgress);
    expect(reserve).toContain(phrases[language].mode);
  });

  it("builds test-first and stops to reassess the size when the work grows", () => {
    const build = step(language, 5);
    expect(build).toContain("tdd");
    expect(build).toContain(phrases[language].reassess);
  });

  it("runs every check of a usual task and its Doctor Checklist before the second stop", () => {
    const checks = step(language, 6);
    for (const check of [
      "make ci",
      "ponytail-review",
      "code-review",
      "Standards",
      "Spec",
      "ponytail-audit",
      "ponytail-debt",
      "make test-e2e",
      "diagnosing-bugs",
      "docs/concept/",
      "retro",
      "Ponytail skipped",
    ]) expect(checks).toContain(check);
  });

  it("reruns the whole list after a remark from manual testing and stops again", () => {
    expect(step(language, 6)).toContain(phrases[language].rerunAll);
  });

  it("fills every registry after the second ok, marks each document with the mode and closes the sprint", () => {
    const record = step(language, 7);
    for (const place of [
      "docs/ideas.md",
      "docs/backlog.md",
      "docs/specs/FEAT-NNN-<slug>/",
      "docs/sprints/SPRINT-NN-<slug>/",
      "plan.md",
      "summary.md",
      "TASK-NN.99",
      "docs/roadmap.md",
      "make ci",
      "doctor",
    ]) expect(record).toContain(place);
    expect(record).toContain(phrases[language].modeRow);
    expect(record).toContain(phrases[language].planAfter);
    expect(record).toContain(phrases[language].completed);
  });
});

describe("/l1-fast skill in both languages", () => {
  it("has the same steps, stops, numbered items and code blocks in RU and EN", () => {
    const shape = (text: string, stepHeading: string) => [
      text.split(stepHeading).length,
      text.split("⛔").length,
      text.split("```").length,
      text.split("\n").filter((line) => /^\s*(\d+\.|-) /.test(line)).length,
    ];
    expect(shape(skill("en"), "## STEP")).toEqual(shape(skill("ru"), "## ШАГ"));
  });
});
