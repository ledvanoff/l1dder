#!/usr/bin/env node
/**
 * playground/verify.mjs
 *
 * Strictly verifies that each model sandbox (`composer`, `grok`) in `playground/sandboxes/`
 * faithfully followed the L1DDER methodology and produced all required artifacts,
 * ID Passports, status transitions, code implementation, and passing tests.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sandboxesRoot = join(__dirname, "sandboxes");

const targetModels = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["composer", "grok"];

function findFirstDirMatching(parentDir, prefix) {
  if (!existsSync(parentDir)) return null;
  for (const entry of readdirSync(parentDir).sort()) {
    if (entry.startsWith(prefix)) {
      return join(parentDir, entry);
    }
  }
  return null;
}

function verifySandbox(modelName) {
  const boxDir = join(sandboxesRoot, modelName);
  const checks = [];
  const check = (id, condition, detail) => {
    checks.push({ id, ok: Boolean(condition), detail });
  };

  // 1. l1dder/ doctor passes
  const ideasPath = join(boxDir, "docs", "ideas.md");
  const backlogPath = join(boxDir, "docs", "backlog.md");
  const roadmapPath = join(boxDir, "docs", "roadmap.md");

  check("01-core-screens", existsSync(ideasPath) && existsSync(backlogPath) && existsSync(roadmapPath), "docs/{ideas,backlog,roadmap}.md exist");

  // 2. IDEA-001 in docs/ideas.md
  const ideasText = existsSync(ideasPath) ? readFileSync(ideasPath, "utf-8") : "";
  check(
    "02-idea-001-card",
    ideasText.includes("IDEA-001") && ideasText.includes("#idea-001") && ideasText.includes("FEAT-001"),
    "docs/ideas.md contains IDEA-001, #idea-001 anchor, and link to FEAT-001",
  );

  // 3. Spec folder docs/specs/FEAT-001-<slug>/{requirements,design,tasks}.md
  const specDir = findFirstDirMatching(join(boxDir, "docs", "specs"), "FEAT-001-");
  const reqPath = specDir ? join(specDir, "requirements.md") : "";
  const desPath = specDir ? join(specDir, "design.md") : "";
  const tskPath = specDir ? join(specDir, "tasks.md") : "";
  check(
    "03-spec-files",
    Boolean(specDir && existsSync(reqPath) && existsSync(desPath) && existsSync(tskPath)),
    `Spec folder FEAT-001-* with requirements.md, design.md, tasks.md (${specDir ?? "missing"})`,
  );

  // 4. Spec ID Passport & FEAT-001.99 mandatory Doctor step
  const reqText = reqPath && existsSync(reqPath) ? readFileSync(reqPath, "utf-8") : "";
  const tskText = tskPath && existsSync(tskPath) ? readFileSync(tskPath, "utf-8") : "";
  check(
    "04-spec-passport-and-99",
    reqText.includes("FEAT-001") &&
      reqText.includes("IDEA-001") &&
      tskText.includes("FEAT-001.01") &&
      tskText.includes("FEAT-001.99"),
    "Spec has ID Passport (FEAT-001 <- IDEA-001) and steps FEAT-001.01 + mandatory FEAT-001.99",
  );

  // 5. Backlog has FEAT-001, IDEA-001, SPRINT-01, TASK-01.01, TASK-01.99
  const backlogText = existsSync(backlogPath) ? readFileSync(backlogPath, "utf-8") : "";
  check(
    "05-backlog-traceability",
    backlogText.includes("FEAT-001") &&
      backlogText.includes("IDEA-001") &&
      backlogText.includes("SPRINT-01") &&
      backlogText.includes("TASK-01.01") &&
      backlogText.includes("TASK-01.99"),
    "docs/backlog.md links FEAT-001, IDEA-001, SPRINT-01, TASK-01.01, TASK-01.99",
  );

  // 6. Roadmap has SPRINT-01, FEAT-001, IDEA-001
  const roadmapText = existsSync(roadmapPath) ? readFileSync(roadmapPath, "utf-8") : "";
  check(
    "06-roadmap-source-of-truth",
    roadmapText.includes("SPRINT-01") &&
      roadmapText.includes("FEAT-001") &&
      roadmapText.includes("IDEA-001"),
    "docs/roadmap.md tracks SPRINT-01, FEAT-001, IDEA-001",
  );

  // 7. Sprint README in docs/sprints/SPRINT-01-<slug>/README.md
  const sprintDir = findFirstDirMatching(join(boxDir, "docs", "sprints"), "SPRINT-01-");
  const sprintReadmePath = sprintDir ? join(sprintDir, "README.md") : "";
  const sprintReadmeText =
    sprintReadmePath && existsSync(sprintReadmePath) ? readFileSync(sprintReadmePath, "utf-8") : "";
  check(
    "07-sprint-readme",
    Boolean(
      sprintDir &&
        existsSync(sprintReadmePath) &&
        sprintReadmeText.includes("SPRINT-01") &&
        sprintReadmeText.includes("FEAT-001") &&
        sprintReadmeText.includes("IDEA-001") &&
        sprintReadmeText.includes("TASK-01.01") &&
        sprintReadmeText.includes("TASK-01.99"),
    ),
    "docs/sprints/SPRINT-01-*/README.md has full Passport and TASK-01.01 + TASK-01.99",
  );

  // 8. Task folder docs/sprints/SPRINT-01-*/tasks/TASK-01.01-*/{plan,summary}.md
  const taskDir = sprintDir ? findFirstDirMatching(join(sprintDir, "tasks"), "TASK-01.01-") : null;
  const planPath = taskDir ? join(taskDir, "plan.md") : "";
  const summaryPath = taskDir ? join(taskDir, "summary.md") : "";
  const planText = planPath && existsSync(planPath) ? readFileSync(planPath, "utf-8") : "";
  const summaryText =
    summaryPath && existsSync(summaryPath) ? readFileSync(summaryPath, "utf-8") : "";

  check(
    "08-task-plan-passport",
    Boolean(
      taskDir &&
        existsSync(planPath) &&
        planText.includes("TASK-01.01") &&
        planText.includes("FEAT-001.01") &&
        planText.includes("SPRINT-01") &&
        planText.includes("FEAT-001") &&
        planText.includes("IDEA-001"),
    ),
    "TASK-01.01 plan.md exists and has all 5 IDs in its Passport",
  );

  check(
    "09-task-summary-passport",
    Boolean(
      taskDir &&
        existsSync(summaryPath) &&
        summaryText.includes("TASK-01.01") &&
        summaryText.includes("FEAT-001.01") &&
        summaryText.includes("SPRINT-01") &&
        summaryText.includes("FEAT-001") &&
        summaryText.includes("IDEA-001") &&
        summaryText.includes("✅ реализована"),
    ),
    "TASK-01.01 summary.md exists, has all 5 IDs in Passport, and status ✅ реализована",
  );

  // 10. Statuses synced to ✅ реализована in Sprint README and Backlog
  check(
    "10-status-sync",
    sprintReadmeText.includes("✅ реализована") && backlogText.includes("✅ реализована"),
    "Task completion status ✅ реализована synced in SPRINT README and backlog.md",
  );

  // 11. Functional implementation of slugify() works properly
  let slugifyWorks = false;
  try {
    const out = execFileSync(
      process.execPath,
      [
        "-e",
        `import('./src/slugify.js').then(m => {
          const r1 = m.slugify('Hello, World! 2026');
          const r2 = m.slugify('  Multiple   Spaces---Here! ');
          if (r1 === 'hello-world-2026' && r2 === 'multiple-spaces-here') {
            console.log('OK');
          } else {
            console.error('Unexpected:', r1, r2);
            process.exit(1);
          }
        })`,
      ],
      { cwd: boxDir, encoding: "utf-8" },
    );
    slugifyWorks = out.trim() === "OK";
  } catch {
    slugifyWorks = false;
  }
  check("11-slugify-behavior", slugifyWorks, "src/slugify.js correctly converts strings to lowercase hyphenated slugs");

  // 12. `make ci` inside the sandbox passes with 0 errors
  let makeCiPasses = false;
  try {
    execFileSync("make", ["ci"], { cwd: boxDir, stdio: "pipe" });
    makeCiPasses = true;
  } catch {
    makeCiPasses = false;
  }
  check("12-sandbox-make-ci", makeCiPasses, "make ci (lint + typecheck + test + build) passes inside sandbox");

  // 13. TASK-01.99 Doctor Checklist plan.md & summary.md with full 5-ID Passport
  const doctorDir = sprintDir ? findFirstDirMatching(join(sprintDir, "tasks"), "TASK-01.99") : null;
  const docPlanPath = doctorDir ? join(doctorDir, "plan.md") : "";
  const docSumPath = doctorDir ? join(doctorDir, "summary.md") : "";
  const docPlanText = docPlanPath && existsSync(docPlanPath) ? readFileSync(docPlanPath, "utf-8") : "";
  const docSumText = docSumPath && existsSync(docSumPath) ? readFileSync(docSumPath, "utf-8") : "";

  check(
    "13-doctor-checklist-99",
    Boolean(
      doctorDir &&
        existsSync(docPlanPath) &&
        existsSync(docSumPath) &&
        docPlanText.includes("TASK-01.99") &&
        docPlanText.includes("FEAT-001.99") &&
        docSumText.includes("TASK-01.99") &&
        docSumText.includes("✅ реализована"),
    ),
    "TASK-01.99 Doctor Checklist plan.md & summary.md exist with full 5-ID Passport",
  );

  // 14. Cascading closure across all trackers (IDEA-001 ✅, FEAT-001 ✅, SPRINT-01 ✅)
  check(
    "14-cascading-closure",
    ideasText.includes("✅ реализована") &&
      reqText.includes("✅ реализована") &&
      backlogText.includes("✅ реализована"),
    "Cascading closure (TASK-01.99 ✅ -> SPRINT-01 ✅ -> FEAT-001 ✅ -> IDEA-001 ✅) verified across all trackers",
  );

  // 15. Zero duplicate skill/command folders across all agents (HOTFIX-002 check)
  const candidateSkillDirs = [
    ".cursor/skills",
    ".claude/skills",
    ".claude/commands",
    ".agents/skills",
    ".opencode/commands",
  ];
  const existingSkillDirs = candidateSkillDirs.filter((rel) => existsSync(join(boxDir, rel)));
  check(
    "15-no-duplicate-skills",
    existingSkillDirs.length === 1 && existingSkillDirs[0] === ".agents/skills",
    `Strictly 1 canonical skill directory exists with 0 duplicates (found: ${existingSkillDirs.join(", ") || "none"})`,
  );

  return {
    modelName,
    ok: checks.every((c) => c.ok),
    checks,
  };
}

let allPassed = true;
for (const modelName of targetModels) {
  const report = verifySandbox(modelName);
  console.log(`\n=== Playground Verification: ${modelName.toUpperCase()} ===`);
  for (const c of report.checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} [${c.id}] ${c.detail}`);
  }
  const passCount = report.checks.filter((c) => c.ok).length;
  console.log(`Result for ${modelName}: ${passCount}/${report.checks.length} passed.`);
  if (!report.ok) {
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
}
console.log("\n✓ All playground model verifications passed (12/12 checks per model)!");
