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
    parallel: "работают параллельно",
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
    ownFiles: "только свои файлы",
    codeCommitted: "Код уже закоммичен в Шаге 5",
    emptyCurrent: "пуста",
    humanOnly: "строго только человек",
    agentForbidden: "запрещено",
    workflowChain: "### ЦЕПОЧКА 7: `/l1-fast`",
    planningChain: "### ЦЕПОЧКА 3: `/l1-planning`",
    rejected: "❌ отклонена",
    routerFastRow:
      "| Быстро сделать небольшую фичу продукта, когда нет активного спринта (**вызывает строго человек, агенту по своей инициативе запрещено**): две остановки «ок», полная проверка до приёмки, все документы с пометкой `режим: /l1-fast` после кода | `/l1-fast` | `l1dder/skills/l1-fast/SKILL.md` |",
    routerPlanningSuffix: ", или отклонить текущий спринт с откатом его изменений | `/l1-planning` |",
    routerHowToUse: "в `/l1-task`, `/l1-fast`, `/l1-hotfix` или `/l1-chore`",
    glossaryArticle: "## Быстрый режим (`/l1-fast`)",
    twoApprovalsHeading: "## Правило двух согласований",
  },
  en: {
    purpose: "## What this command is for",
    step: "## STEP",
    noEdits: "do not change any file",
    resume: "continue this feature from Step 5",
    parallel: "work in parallel",
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
    ownFiles: "only your own files",
    codeCommitted: "The code is already committed in Step 5",
    emptyCurrent: "empty",
    humanOnly: "strictly human-invoked",
    agentForbidden: "forbidden",
    workflowChain: "- **Flow 7 (`/l1-fast`):**",
    planningChain: "- **Flow 3 (`/l1-planning`):**",
    rejected: "❌ rejected",
    routerFastRow:
      '| Quickly build a small product feature when no sprint is active (**strictly human-invoked, forbidden for the agent on its own**): two "ok" stops, full verification before acceptance, every document marked `mode: /l1-fast` after the code | `/l1-fast` | `l1dder/skills/l1-fast/SKILL.md` |',
    routerPlanningSuffix: ", or reject the current sprint and roll back its changes | `/l1-planning` |",
    routerHowToUse: "in `/l1-task`, `/l1-fast`, `/l1-hotfix` or `/l1-chore`",
    glossaryArticle: "## Fast Mode (`/l1-fast`)",
    twoApprovalsHeading: "## Task (`TASK-NN.MM` ↔ `FEAT-NNN.MM`) & Two-Approval Rule",
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
  it("explains in plain words what the command is for before the first step and forbids agent self-invocation", () => {
    const text = skill(language);
    const purpose = text.indexOf(phrases[language].purpose);
    const firstStep = text.indexOf(`${phrases[language].step} 1:`);
    expect(purpose).toBeGreaterThan(-1);
    expect(firstStep).toBeGreaterThan(purpose);
    const intro = text.slice(0, firstStep);
    expect(intro).toContain("Human-invoked only");
    expect(intro).toContain(phrases[language].humanOnly);
    expect(intro).toContain(phrases[language].agentForbidden);
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

  it("blocks only a second fast feature and lets idea, spec and planning work in parallel", () => {
    const roadmap = step(language, 1);
    expect(roadmap).toContain(phrases[language].parallel);
    for (const command of ["/l1-idea", "/l1-feature"]) expect(roadmap).toContain(command);
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

  it("commits the reservation on its own, so a rejection knows where the sprint starts", () => {
    expect(step(language, 4)).toContain("chore(roadmap): reserve SPRINT-NN for /l1-fast");
  });

  it("builds test-first and stops to reassess the size when the work grows", () => {
    const build = step(language, 5);
    expect(build).toContain("tdd");
    expect(build).toContain(phrases[language].reassess);
  });

  it("commits each finished task with green tests by path, so git keeps the log of the work", () => {
    const build = step(language, 5);
    expect(build).toContain("TASK-NN.MM");
    expect(build).toContain("git add <");
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

  it("makes the final commit with the registries only, since the code is already committed in Step 5", () => {
    const record = step(language, 7);
    expect(record).toContain("docs(<scope>): record FEAT-NNN built in /l1-fast");
    expect(record).toContain(phrases[language].codeCommitted);
  });

  it("commits only its own files by path, so a parallel tab's work stays out of the commit", () => {
    const record = step(language, 7);
    expect(record).toContain(phrases[language].ownFiles);
    expect(record).toContain("git add <");
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

describe.each(["ru", "en"] as const)("/l1-fast in rules 00, 20 and 40 (%s)", (language) => {
  it("lists /l1-fast and sprint rejection in the command table of 00-methodology", () => {
    const rows = asset(language, "rules/00-methodology.mdc").split("\n").filter((line) => line.startsWith("| "));
    const fastRow = rows.find((row) => row.includes("**`/l1-fast`**") && row.includes("l1dder/skills/l1-fast/SKILL.md"));
    expect(fastRow).toBeDefined();
    expect(fastRow).toContain(phrases[language].humanOnly);
    expect(fastRow).toContain(phrases[language].agentForbidden);
    expect(rows.some((row) => row.includes("**`/l1-planning`**") && /(отклон|reject)/i.test(row))).toBe(true);
  });

  it("names /l1-fast as a Roadmap Gate exception only when 1 (CURRENT) is empty and describes its flow in 20-workflow", () => {
    const workflow = asset(language, "rules/20-workflow.mdc");
    const guardrails = workflow.slice(0, workflow.indexOf("## 2."));
    expect(guardrails).toContain("/l1-fast");
    expect(guardrails).toContain("1 (CURRENT)");
    expect(guardrails).toContain(phrases[language].emptyCurrent);
    expect(guardrails).toContain(phrases[language].humanOnly);
    expect(guardrails).toContain(phrases[language].agentForbidden);

    const start = workflow.indexOf(phrases[language].workflowChain);
    expect(start).toBeGreaterThan(-1);
    const chain = workflow.slice(start);
    for (const part of ["1 (CURRENT)", "⛔", "make ci", "/l1-fast", phrases[language].humanOnly, phrases[language].agentForbidden]) {
      expect(chain).toContain(part);
    }

    const planningStart = workflow.indexOf(phrases[language].planningChain);
    const planningEnd = workflow.indexOf(language === "ru" ? "### ЦЕПОЧКА 4:" : "- **Flow 4", planningStart);
    const planningFlow = workflow.slice(planningStart, planningEnd);
    expect(planningFlow).toContain("git revert");
    expect(planningFlow).toContain(phrases[language].rejected);
  });

  it("routes to /l1-fast and sprint rejection in 40-skills-router with the exact strings from design.md", () => {
    const router = asset(language, "rules/40-skills-router.mdc");
    expect(router).toContain(phrases[language].routerFastRow);
    expect(router).toContain(phrases[language].routerPlanningSuffix);
    expect(router).toContain(phrases[language].routerHowToUse);
  });
});

describe.each(["ru", "en"] as const)("/l1-fast in glossary, roadmap template and sibling skills (%s)", (language) => {
  it.each([
    "GLOSSARY.md",
    "templates/roadmap/roadmap-template.md",
    "skills/l1-task/SKILL.md",
    "skills/l1-hotfix/SKILL.md",
  ])("names /l1-fast alongside /l1-hotfix and /l1-chore with the empty 1 (CURRENT) and human-only condition in %s", (path) => {
    const text = asset(language, path);
    for (const part of [
      "/l1-fast",
      "/l1-hotfix",
      "/l1-chore",
      "1 (CURRENT)",
      phrases[language].emptyCurrent,
      phrases[language].humanOnly,
      phrases[language].agentForbidden,
    ]) {
      expect(text).toContain(part);
    }
  });

  it("explains /l1-fast, two chat stops and sprint rejection in the glossary", () => {
    const glossary = asset(language, "GLOSSARY.md");
    const start = glossary.indexOf(phrases[language].glossaryArticle);
    expect(start).toBeGreaterThan(-1);
    const article = glossary.slice(start, glossary.indexOf("\n## ", start + 1));
    for (const part of ["1 (CURRENT)", "make ci", "TASK-NN.99", "/l1-fast"]) expect(article).toContain(part);

    const twoStopsStart = glossary.indexOf(phrases[language].twoApprovalsHeading);
    const twoStopsSection = glossary.slice(twoStopsStart, glossary.indexOf("\n## ", twoStopsStart + 1));
    expect(twoStopsSection).toContain("/l1-fast");
    expect(twoStopsSection).toContain("plan.md");

    expect(glossary).toContain("git revert");
    expect(glossary).toContain(phrases[language].rejected);
  });
});

describe.each(["ru", "en"] as const)("/l1-fast and sprint rejection in the human guide (%s)", (language) => {
  it.each([
    "user-guide/README.md",
    "user-guide/01-QUICKSTART.md",
    "user-guide/02-FLOWS-IN-DETAIL.md",
    "user-guide/03-CHEATSHEET.md",
  ])("mentions /l1-fast in %s", (path) => {
    expect(asset(language, path)).toContain("/l1-fast");
  });

  it("gives /l1-fast its own section in 02-FLOWS-IN-DETAIL with the human-only rule and covers sprint rejection", () => {
    const guide = asset(language, "user-guide/02-FLOWS-IN-DETAIL.md");
    const start = guide.search(/^## .*`\/l1-fast`/m);
    expect(start).toBeGreaterThan(-1);
    const end = guide.indexOf("\n## ", start + 1);
    const section = guide.slice(start, end === -1 ? undefined : end);
    for (const part of ["1 (CURRENT)", "/l1-fast", phrases[language].humanOnly, phrases[language].agentForbidden]) {
      expect(section).toContain(part);
    }
    expect(guide).toContain("git revert");
    expect(guide).toContain(phrases[language].rejected);
  });

  it("lists /l1-fast, sprint rejection and the rejected status in 03-CHEATSHEET", () => {
    const sheet = asset(language, "user-guide/03-CHEATSHEET.md");
    expect(sheet).toContain("/l1-fast");
    expect(sheet).toContain(phrases[language].humanOnly);
    expect(sheet).toContain("git revert");
    expect(sheet).toContain(phrases[language].rejected);
  });

  it.each(["README.md", "onboarding/continue-project.md"])(
    "mentions /l1-fast and the human-only rule in %s",
    (path) => {
      const text = asset(language, path);
      expect(text).toContain("/l1-fast");
      expect(text).toContain(phrases[language].humanOnly);
    },
  );

  it("describes the /l1-fast flow (human-only) and sprint rejection in METHODOLOGY.md", () => {
    const methodology = asset(language, "METHODOLOGY.md");
    const start = methodology.search(/^### .*`\/l1-fast`/m);
    expect(start).toBeGreaterThan(-1);
    const end = methodology.indexOf("\n### ", start + 1);
    const flow = methodology.slice(start, end === -1 ? undefined : end);
    for (const part of ["1 (CURRENT)", "/l1-fast", phrases[language].humanOnly, phrases[language].agentForbidden]) {
      expect(flow).toContain(part);
    }
    expect(methodology).toContain("git revert");
    expect(methodology).toContain(phrases[language].rejected);
  });
});

describe("/l1-fast in root README and site files", () => {
  it.each([
    "README.md",
    "site/agents-cli.md",
    "site/en/agents-cli.md",
    "site/.vitepress/seo.mts",
  ])("includes /l1-fast in %s", (path) => {
    const text = readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf-8");
    expect(text).toContain("/l1-fast");
  });
});
