import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const asset = (language: string, path: string) =>
  readFileSync(fileURLToPath(new URL(`../assets/i18n/${language}/${path}`, import.meta.url)), "utf-8");
const skill = (language: string) => asset(language, "skills/l1-planning/SKILL.md");

const phrases = {
  ru: {
    branch: "## ВЕТКА: Отклонить текущий спринт",
    firstStep: "## ШАГ 1:",
    step: "### О",
    rejected: "❌ отклонена",
    backToBacklog: "📋 в бэклоге",
    conflict: "конфликт",
    ideaBack: "📋 нереализована",
    history: "История изменений Роадмапа",
    uncommittedByChoice: "только так, как выбрал пользователь",
  },
  en: {
    branch: "## BRANCH: Reject the current sprint",
    firstStep: "## STEP 1:",
    step: "### R",
    rejected: "❌ rejected",
    backToBacklog: "📋 in-backlog",
    conflict: "conflict",
    ideaBack: "📋 unrealized",
    history: "Roadmap Changelog",
    uncommittedByChoice: "only the way the user chose",
  },
};

// The reject branch: from its heading to the end of the skill.
const branch = (language: "ru" | "en") => {
  const text = skill(language);
  const start = text.indexOf(phrases[language].branch);
  return start === -1 ? "" : text.slice(start);
};

// Step N of the reject branch: from its heading to the next one.
const step = (language: "ru" | "en", n: number) => {
  const text = branch(language);
  const start = text.indexOf(`${phrases[language].step}${n}:`);
  const end = text.indexOf(`${phrases[language].step}${n + 1}:`);
  return start === -1 ? "" : text.slice(start, end === -1 ? undefined : end);
};

describe.each(["ru", "en"] as const)("/l1-planning reject branch (%s)", (language) => {
  it("finds the sprint start in the roadmap history, leaves hotfixes and chores out and shows uncommitted changes", () => {
    const scope = step(language, 1);
    for (const part of ["git log -S", "docs/roadmap.md", "HOTFIX-NNN", "CHORE-NNN", "git status"]) expect(scope).toContain(part);
  });

  it("stops for an ok before any revert, with the feature's fate as a choice on the card", () => {
    const card = step(language, 2);
    expect(card).toContain("⛔");
    expect(card).toContain(phrases[language].rejected);
    expect(card).toContain(phrases[language].backToBacklog);
    expect(branch(language).indexOf("⛔")).toBeLessThan(branch(language).indexOf("git revert"));
  });

  it("reverts the sprint code without rewriting history, keeps the documents and stops on a conflict", () => {
    const rollback = step(language, 3);
    for (const part of ["git revert --no-commit", "git diff --cached --name-only -- docs/", "reset --hard", "make ci"]) expect(rollback).toContain(part);
    expect(rollback).toContain(phrases[language].conflict);
    expect(rollback).toContain(phrases[language].uncommittedByChoice);
  });

  it("marks the sprint and all its tasks rejected, frees 1 (CURRENT) and returns an idea left without work", () => {
    const records = step(language, 4);
    for (const part of ["SPRINT-NN", "TASK-NN.MM", "Delivery Queue", "1 (CURRENT)", "IDEA-NNN"]) expect(records).toContain(part);
    for (const status of [phrases[language].rejected, phrases[language].ideaBack]) expect(records).toContain(status);
    expect(records).toContain(phrases[language].history);
  });

  it("commits the rollback and the registries once, staging only its own files by path", () => {
    const commit = step(language, 5);
    expect(commit).toContain("revert(<scope>): reject SPRINT-NN");
    expect(commit).toContain("git add <");
  });

  it("routes a request to reject the current sprint to its own branch before the usual steps", () => {
    const text = skill(language);
    const firstStep = text.indexOf(phrases[language].firstStep);
    expect(text.slice(0, firstStep)).toContain(phrases[language].branch.replace("## ", ""));
    expect(branch(language)).not.toBe("");
  });
});

describe.each(["ru", "en"] as const)("rejected status for sprints and tasks (%s)", (language) => {
  it("lists the rejected status for SPRINT-NN and TASK-NN.MM in 20-workflow and in the sprint template", () => {
    const statusRows = asset(language, "rules/20-workflow.mdc")
      .split("\n")
      .filter((line) => line.startsWith("| **`SPRINT-NN`**") || line.startsWith("| **`TASK-NN.MM`**"));
    expect(statusRows).toHaveLength(2);
    for (const row of statusRows) expect(row).toContain(phrases[language].rejected);
    const sprintStatus = asset(language, "templates/sprints/sprint-template.md")
      .split("\n")
      .find((line) => /\*\*(Статус спринта|Sprint Status)\*\*/.test(line));
    expect(sprintStatus).toContain(phrases[language].rejected);
  });
});

describe("/l1-planning skill in both languages", () => {
  it("has the same steps, branch steps, stops, numbered items and code blocks in RU and EN", () => {
    const shape = (text: string, stepHeading: string, branchStep: string) => [
      text.split(stepHeading).length,
      text.split(branchStep).length,
      text.split("⛔").length,
      text.split("```").length,
      text.split("\n").filter((line) => /^\s*(\d+\.|-) /.test(line)).length,
    ];
    expect(shape(skill("en"), "## STEP", "### R")).toEqual(shape(skill("ru"), "## ШАГ", "### О"));
  });
});
