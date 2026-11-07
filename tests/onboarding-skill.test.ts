import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";

const skillsDir = (language: string) => fileURLToPath(new URL(`../assets/i18n/${language}/skills`, import.meta.url));
const skill = (language: string) => readFileSync(`${skillsDir(language)}/l1-onboard/SKILL.md`, "utf-8");
const phrases = {
  ru: { round: "до 7 вопросов", choice: "Идём дальше или ещё раунд?", bearings: "Этап N из 6", code: "первоисточник фактов — код" },
  en: { round: "up to 7 questions", choice: "Move on or another round?", bearings: "Stage N of 6", code: "primary source of facts is the code" },
};
const stageRows = (text: string) => text.split("\n").filter((line) => /^\| [1-6]\. /.test(line));

describe.each(["ru", "en"] as const)("/l1-onboard skill (%s)", (language) => {
  it("works out the concept before the stack", () => {
    const stageFiles = ["idea.md", "vision.md", "architecture.md", "data-model.md", "30-tech-stack.mdc", "ideas.md"];
    const rows = stageRows(skill(language));
    expect(rows).toHaveLength(6);
    rows.forEach((row, index) => expect(row).toContain(stageFiles[index]));
  });

  it("asks up to 7 questions a round and ends each round with a choice", () => {
    expect(skill(language)).toContain(phrases[language].round);
    expect(skill(language)).toContain(phrases[language].choice);
  });

  it("shows the stage on every message and treats the code as the primary source", () => {
    expect(skill(language)).toContain(phrases[language].bearings);
    expect(skill(language)).toContain(phrases[language].code);
  });

  it("names only skills that ship with L1DDER", () => {
    const skillsColumn = stageRows(skill(language)).map((row) => row.split("|").at(-2) ?? "");
    const names = skillsColumn.flatMap((cell) => [...cell.matchAll(/`([a-z][a-z-]+)`/g)].map((match) => match[1] ?? ""));
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !existsSync(`${skillsDir(language)}/${name}/SKILL.md`))).toEqual([]);
  });
});

describe("/l1-onboard skill in both languages", () => {
  it("has the same steps and stops in RU and EN", () => {
    const shape = (text: string, step: string) => [text.split(`## ${step}`).length, text.split("⛔").length, stageRows(text).length];
    expect(shape(skill("en"), "STEP")).toEqual(shape(skill("ru"), "ШАГ"));
  });
});

describe.each([
  ["ru", "Этап 1 из 6"],
  ["en", "Stage 1 of 6"],
] as const)("hint after npx l1dder init (%s)", (language, firstStage) => {
  const tempDirs: string[] = [];
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it("sends the agent to the idea stage, not to the stack", async () => {
    const dir = mkdtempSync(join(tmpdir(), "l1dder-onboard-hint-"));
    tempDirs.push(dir);
    let output = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });
    expect(await runCli(["node", "l1dder", "init", "--cwd", dir, "--lang", language, "--agents", "claude", "--yes"])).toBe(0);
    expect(output).toContain(firstStage);
    expect(output).not.toContain("30-tech-stack");
  });
});
