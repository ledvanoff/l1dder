import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { parseFrontmatter, renderAgentFilesMap } from "../src/agents.js";
import { parseArgv, runCli } from "../src/cli.js";
import type { AgentId } from "../src/types.js";
import {
  DEFAULT_AGENTS,
  detectExistingAgents,
  parseAgentsFlag,
  runProjectDoctor,
  runProjectSync,
} from "../src/installer.js";
import {
  addStackSkillToManifest,
  installSkillsFromManifest,
  listDeclaredSkills,
  readSkillsManifest,
} from "../src/skills-manager.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "l1dder-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("L1DDER CLI — Cursor, Claude Code & OpenAI Codex Installation", () => {
  it("defaults to Cursor, Claude Code, and Codex when no agents are specified, and supports shorthand flags", () => {
    const dir = makeTempDir();
    expect(DEFAULT_AGENTS).toEqual(["cursor", "claude", "codex"]);
    expect(parseAgentsFlag(undefined)).toEqual(["cursor", "claude", "codex"]);
    expect(detectExistingAgents(dir)).toEqual(["cursor", "claude", "codex"]);

    const f1 = parseArgv(["node", "l1dder", "init", "--claude"]);
    expect(f1.agents).toBe("claude");

    const f2 = parseArgv(["node", "l1dder", "init", "--cursor", "--codex"]);
    expect(f2.agents).toBe("cursor,codex");
  });

  it("renders complete, valid configurations for Cursor, Claude Code, and Codex (RU & EN)", () => {
    const dir = makeTempDir();
    // Initialize l1dder/ directory first
    runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["codex"],
      force: false,
      updateGitignore: true,
    });

    // 1. Cursor standalone verification
    const cursorOnly = renderAgentFilesMap({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["cursor"],
    });
    expect(cursorOnly.has("AGENTS.md")).toBe(true);
    expect(cursorOnly.has(".cursor/rules/l1dder/00-methodology.mdc")).toBe(true);
    expect(cursorOnly.has(".cursor/rules/l1dder/10-conventions.mdc")).toBe(true);
    expect(cursorOnly.has(".cursor/rules/l1dder/20-workflow.mdc")).toBe(true);
    expect(cursorOnly.has(".cursor/rules/l1dder/30-tech-stack.mdc")).toBe(true);
    expect(cursorOnly.has(".cursor/rules/l1dder/40-skills-router.mdc")).toBe(true);
    expect(cursorOnly.get(".cursor/rules/l1dder/00-methodology.mdc")).toContain("alwaysApply: true");
    expect(cursorOnly.has(".cursor/skills/l1-onboard/SKILL.md")).toBe(true);
    expect(cursorOnly.has(".cursor/skills/l1-task/SKILL.md")).toBe(true);
    expect(cursorOnly.has(".cursor/skills/ponytail/SKILL.md")).toBe(true);
    expect(cursorOnly.has(".cursor/skills/grilling/SKILL.md")).toBe(true);
    expect(cursorOnly.has(".cursor/skills/codebase-design/DEEPENING.md")).toBe(true);
    expect(cursorOnly.has(".cursor/skills/tdd/tests.md")).toBe(true);

    // 2. Claude Code standalone verification (no duplicate .claude/commands)
    const claudeOnly = renderAgentFilesMap({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["claude"],
    });
    expect(claudeOnly.has("CLAUDE.md")).toBe(true);
    expect(claudeOnly.get("CLAUDE.md")).toContain("/l1-onboard");
    expect(claudeOnly.has(".claude/rules/l1dder/00-methodology.md")).toBe(true);
    expect(claudeOnly.has(".claude/rules/l1dder/30-tech-stack.md")).toBe(true);
    expect(claudeOnly.has(".claude/skills/l1-onboard/SKILL.md")).toBe(true);
    expect(claudeOnly.has(".claude/skills/codebase-design/DEEPENING.md")).toBe(true);
    expect(claudeOnly.has(".claude/commands/l1-onboard.md")).toBe(false);

    const ponytailSkill = claudeOnly.get(".claude/skills/ponytail/SKILL.md") ?? "";
    const parsedPonytail = parseFrontmatter(ponytailSkill);
    expect(parsedPonytail.data["description"]?.length).toBeGreaterThan(20);

    // 3. Combined Cursor + Claude + Codex verification (.agents/skills for Codex, .claude/skills for Claude Code)
    const rendered = renderAgentFilesMap({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["cursor", "claude", "codex"],
    });
    expect(rendered.get("AGENTS.md")).toContain("$l1-onboard");
    expect(rendered.has(".cursor/rules/l1dder/00-methodology.mdc")).toBe(true);
    expect(rendered.has(".claude/rules/l1dder/00-methodology.md")).toBe(true);
    expect(rendered.has(".agents/skills/l1-onboard/SKILL.md")).toBe(true);
    expect(rendered.has(".agents/skills/l1-task/SKILL.md")).toBe(true);
    expect(rendered.has(".agents/skills/grilling/SKILL.md")).toBe(true);
    expect(rendered.has(".agents/skills/codebase-design/SKILL.md")).toBe(true);
    expect(rendered.has(".agents/skills/codebase-design/DESIGN-IT-TWICE.md")).toBe(true);
    expect(rendered.has(".agents/skills/domain-modeling/GLOSSARY-FORMAT.md")).toBe(true);
    expect(rendered.has(".claude/skills/l1-onboard/SKILL.md")).toBe(true);
    // Cursor reads both folders, so .cursor/skills must not add a third entry
    expect(rendered.has(".cursor/skills/l1-onboard/SKILL.md")).toBe(false);
  });

  it("installs RU methodology into l1dder/, bundles all 20 skills (including mattpocock/skills + companions), and configures agents", async () => {
    const dir = makeTempDir();
    const code = await runCli([
      "node",
      "l1dder",
      "init",
      "--cwd",
      dir,
      "--lang",
      "ru",
      "--agents",
      "codex,windsurf,opencode,cline",
      "--yes",
    ]);

    expect(code).toBe(0);
    expect(existsSync(join(dir, "l1dder/METHODOLOGY.md"))).toBe(true);
    expect(existsSync(join(dir, "l1dder/skills.json"))).toBe(true);
    expect(existsSync(join(dir, "l1dder/skills/l1-onboard/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, "l1dder/skills/grilling/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, "l1dder/skills/codebase-design/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, "l1dder/skills/codebase-design/DEEPENING.md"))).toBe(true);
    expect(existsSync(join(dir, "l1dder/skills/tdd/tests.md"))).toBe(true);
    expect(existsSync(join(dir, "l1dder/skills/prototype/UI.md"))).toBe(true);

    expect(existsSync(join(dir, ".agents/skills/l1-task/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".agents/skills/codebase-design/DEEPENING.md"))).toBe(true);
    expect(existsSync(join(dir, ".windsurf/rules/l1dder.md"))).toBe(true);
    expect(existsSync(join(dir, ".windsurf/workflows/l1-onboard.md"))).toBe(true);
    expect(existsSync(join(dir, ".opencode/commands/l1-planning.md"))).toBe(false);
    expect(existsSync(join(dir, ".clinerules/l1dder.md"))).toBe(true);
    expect(existsSync(join(dir, ".roo/rules/l1dder.md"))).toBe(true);

    const declared = listDeclaredSkills(dir);
    expect(declared.length).toBe(20);
    expect(declared.every((row) => row.installed)).toBe(true);
  });

  it("manages stack skills via skills.json and installs them into l1dder/skills/ and agent folders", async () => {
    const dir = makeTempDir();
    runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "en",
      agents: ["codex", "windsurf"],
      force: false,
      updateGitignore: true,
    });

    addStackSkillToManifest({
      projectDir: dir,
      rootDir: "l1dder",
      repo: "vercel-labs/agent-skills",
      skills: ["vercel-react-best-practices"],
    });

    const manifest = readSkillsManifest(dir);
    expect(manifest.stack).toEqual([
      {
        repo: "vercel-labs/agent-skills",
        skills: ["vercel-react-best-practices"],
      },
    ]);

    const fakeFetch: typeof fetch = async () =>
      new Response(
        "---\nname: vercel-react-best-practices\ndescription: React 19 Best Practices\n---\n\n# React Best Practices\n",
        { status: 200 },
      );

    const installRes = await installSkillsFromManifest({
      projectDir: dir,
      rootDir: "l1dder",
      updateCore: false,
      fetcher: fakeFetch,
    });

    expect(installRes.downloaded).toEqual([
      "vercel-labs/agent-skills:vercel-react-best-practices",
    ]);
    expect(existsSync(join(dir, "l1dder/skills/vercel-react-best-practices/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".agents/skills/vercel-react-best-practices/SKILL.md"))).toBe(true);

    const syncOutcome = runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "en",
      agents: ["codex", "windsurf"],
      force: false,
      updateGitignore: false,
    });
    expect(syncOutcome.preservedStack).toContain("l1dder/skills.json");
    expect(readSkillsManifest(dir).stack.length).toBe(1);
  });

  it("preserves user-modified 30-tech-stack.mdc during sync unless --force is passed", () => {
    const allAgents = parseAgentsFlag("all");
    expect(allAgents).toEqual([
      "cursor",
      "claude",
      "codex",
      "windsurf",
      "copilot",
      "opencode",
      "cline",
    ]);

    const dir = makeTempDir();
    runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["windsurf"],
      force: false,
      updateGitignore: true,
    });

    const stackPath = join(dir, "l1dder/rules/30-tech-stack.mdc");
    const customStack =
      "---\ndescription: Custom Python Stack\nalwaysApply: true\n---\n# Custom Python FastAPI Stack\n";
    writeFileSync(stackPath, customStack, "utf-8");

    const syncOutcome = runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["windsurf"],
      force: false,
      updateGitignore: false,
    });

    expect(syncOutcome.preservedStack).toContain("l1dder/rules/30-tech-stack.mdc");
    expect(readFileSync(stackPath, "utf-8")).toBe(customStack);
    expect(readFileSync(join(dir, ".windsurf/rules/l1dder.md"), "utf-8")).toContain(
      "Custom Python FastAPI Stack",
    );

    runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["windsurf"],
      force: true,
      updateGitignore: false,
    });

    expect(readFileSync(stackPath, "utf-8")).not.toBe(customStack);
  });

  it("runs doctor check and verifies structure", () => {
    const dir = makeTempDir();
    const beforeInit = runProjectDoctor(dir);
    expect(beforeInit.ok).toBe(false);

    runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["codex"],
      force: false,
      updateGitignore: true,
    });

    const afterInit = runProjectDoctor(dir);
    expect(afterInit.ok).toBe(true);

    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs/ideas.md"), "# Ideas\n", "utf-8");
    writeFileSync(join(dir, "docs/backlog.md"), "# Backlog\n", "utf-8");
    writeFileSync(join(dir, "docs/roadmap.md"), "# Roadmap\n", "utf-8");

    const withDocs = runProjectDoctor(dir);
    expect(withDocs.ok).toBe(true);
    expect(withDocs.checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("supports updating ONLY skills (update --skills) vs updating the ENTIRE framework (update)", async () => {
    const dir = makeTempDir();
    await runCli([
      "node",
      "l1dder",
      "init",
      "--cwd",
      dir,
      "--lang",
      "ru",
      "--agents",
      "codex,windsurf",
      "--yes",
    ]);

    const coreRulePath = join(dir, "l1dder/rules/00-methodology.mdc");
    const stackRulePath = join(dir, "l1dder/rules/30-tech-stack.mdc");
    const skillPath = join(dir, "l1dder/skills/l1-task/SKILL.md");

    // Simulate an older version of a core rule, a customized stack rule, and an older skill
    writeFileSync(coreRulePath, "# Old Core Rule v0.9\n", "utf-8");
    writeFileSync(stackRulePath, "# My Custom Go Stack\n", "utf-8");
    writeFileSync(skillPath, "# Old l1-task skill v0.9\n", "utf-8");

    // 1. Run "l1dder update --skills": must update the skill, but NOT touch the core rule!
    const codeSkillsOnly = await runCli([
      "node",
      "l1dder",
      "update",
      "--skills",
      "--cwd",
      dir,
    ]);
    expect(codeSkillsOnly).toBe(0);
    expect(readFileSync(skillPath, "utf-8")).not.toBe("# Old l1-task skill v0.9\n");
    expect(readFileSync(join(dir, ".agents/skills/l1-task/SKILL.md"), "utf-8")).not.toBe(
      "# Old l1-task skill v0.9\n",
    );
    // Core rule was NOT touched because --skills was passed
    expect(readFileSync(coreRulePath, "utf-8")).toBe("# Old Core Rule v0.9\n");

    // 2. Run "l1dder update": must update the core rule AND skills, while preserving 30-tech-stack.mdc!
    const codeFullUpdate = await runCli(["node", "l1dder", "update", "--cwd", dir]);
    expect(codeFullUpdate).toBe(0);
    expect(readFileSync(coreRulePath, "utf-8")).not.toBe("# Old Core Rule v0.9\n");
    expect(readFileSync(stackRulePath, "utf-8")).toBe("# My Custom Go Stack\n");
  });

  it("warns about BREAKING CHANGES on update and aborts if user says no, or updates if user says да/yes", async () => {
    const dir = makeTempDir();
    await runCli([
      "node",
      "l1dder",
      "init",
      "--cwd",
      dir,
      "--lang",
      "ru",
      "--agents",
      "codex",
      "--yes",
    ]);

    const coreRulePath = join(dir, "l1dder/rules/00-methodology.mdc");
    writeFileSync(coreRulePath, "# Old Core Rule v1.0.0\n", "utf-8");

    const fakeCatalog = [
      {
        version: "2.0.0",
        date: "2026-11-01",
        summary: {
          ru: "Крупный релиз 2.0",
          en: "Major release 2.0",
        },
        changes: {
          ru: ["Улучшен роутер скиллов"],
          en: ["Improved skills router"],
        },
        breaking: {
          ru: ["Переименовано поле X в паспорте задачи"],
          en: ["Renamed field X in task passport"],
        },
      },
    ];

    // 1. User answers "нет" -> update must abort and NOT touch coreRulePath
    let askedQuestion = "";
    const codeDeclined = await runCli(["node", "l1dder", "update", "--cwd", dir], {
      targetVersion: "2.0.0",
      releasesCatalog: fakeCatalog,
      confirmPrompt: async (q) => {
        askedQuestion = q;
        return "нет";
      },
    });

    expect(codeDeclined).toBe(1);
    expect(askedQuestion).toContain("BREAKING CHANGES");
    expect(readFileSync(coreRulePath, "utf-8")).toBe("# Old Core Rule v1.0.0\n");

    // 2. User answers "да" -> update proceeds and updates coreRulePath
    const codeApproved = await runCli(["node", "l1dder", "update", "--cwd", dir], {
      targetVersion: "2.0.0",
      releasesCatalog: fakeCatalog,
      confirmPrompt: async () => "да",
    });

    expect(codeApproved).toBe(0);
    expect(readFileSync(coreRulePath, "utf-8")).not.toBe("# Old Core Rule v1.0.0\n");
  });

  it("HOTFIX-001 regression: docs site and user-guide have clean wording (no state.yml or матрёшка) and include GitHub links to ponytail and mattpocock/skills", () => {
    const siteRu = readFileSync(join(process.cwd(), "site/index.md"), "utf-8");
    const siteEn = readFileSync(join(process.cwd(), "site/en/index.md"), "utf-8");
    const guideRu = readFileSync(
      join(process.cwd(), "assets/i18n/ru/user-guide/README.md"),
      "utf-8",
    );
    const guideEn = readFileSync(
      join(process.cwd(), "assets/i18n/en/user-guide/README.md"),
      "utf-8",
    );
    const rootReadme = readFileSync(join(process.cwd(), "README.md"), "utf-8");

    for (const content of [siteRu, siteEn, guideRu, guideEn, rootReadme]) {
      expect(content).not.toContain("state.yml");
      expect(content).not.toMatch(/матрёшк/iu);
      expect(content).not.toMatch(/Russian dolls/iu);
    }

    for (const content of [siteRu, siteEn, rootReadme]) {
      expect(content).toContain("https://github.com/DietrichGebert/ponytail");
      expect(content).toContain("https://github.com/mattpocock/skills");
    }
  });

  it("HOTFIX-002 regression: never generates duplicate skill/command folders across agents and prunes stale duplicate directories on sync", () => {
    const dir = makeTempDir();
    // Simulate legacy duplicate directories present in a project
    mkdirSync(join(dir, ".claude/commands"), { recursive: true });
    writeFileSync(join(dir, ".claude/commands/l1-task.md"), "legacy duplicate", "utf-8");
    mkdirSync(join(dir, ".opencode/commands"), { recursive: true });
    writeFileSync(join(dir, ".opencode/commands/l1-task.md"), "legacy duplicate", "utf-8");

    runProjectSync({
      projectDir: dir,
      rootDir: "l1dder",
      language: "ru",
      agents: ["codex", "opencode"],
      force: false,
      updateGitignore: true,
    });

    // Legacy duplicate command folders must be pruned
    expect(existsSync(join(dir, ".claude/commands"))).toBe(false);
    expect(existsSync(join(dir, ".opencode/commands"))).toBe(false);

    // Check rendered maps for cursor, claude, codex, cursor+codex, cursor+claude
    for (const combo of [
      ["cursor"],
      ["claude"],
      ["codex"],
      ["opencode"],
      ["cursor", "codex"],
    ] as const) {
      const map = renderAgentFilesMap({
        projectDir: dir,
        rootDir: "l1dder",
        language: "ru",
        agents: combo,
      });
      const l1TaskEntries = [...map.keys()].filter((k) => k.includes("l1-task"));
      expect(l1TaskEntries.length).toBe(1);
    }
  });

  describe("HOTFIX-003 regression: every selected agent gets skills in the folder it reads", () => {
    const CASES: ReadonlyArray<{
      readonly agents: readonly AgentId[];
      readonly present: readonly string[];
      readonly absent: readonly string[];
    }> = [
      { agents: ["cursor"], present: [".cursor/skills"], absent: [".claude/skills", ".agents/skills"] },
      { agents: ["claude"], present: [".claude/skills"], absent: [".cursor/skills", ".agents/skills"] },
      { agents: ["codex"], present: [".agents/skills"], absent: [".cursor/skills", ".claude/skills"] },
      { agents: ["opencode"], present: [".agents/skills"], absent: [".cursor/skills", ".claude/skills"] },
      // Cursor reads .claude/skills only with Third-Party Imports enabled, .agents/skills always
      { agents: ["cursor", "claude"], present: [".agents/skills", ".claude/skills"], absent: [".cursor/skills"] },
      { agents: ["cursor", "codex"], present: [".agents/skills"], absent: [".cursor/skills", ".claude/skills"] },
      { agents: ["claude", "codex"], present: [".agents/skills", ".claude/skills"], absent: [".cursor/skills"] },
      { agents: ["claude", "opencode"], present: [".agents/skills", ".claude/skills"], absent: [".cursor/skills"] },
      { agents: ["cursor", "claude", "codex"], present: [".agents/skills", ".claude/skills"], absent: [".cursor/skills"] },
    ];

    function syncProject(dir: string, agents: readonly AgentId[]): void {
      runProjectSync({
        projectDir: dir,
        rootDir: "l1dder",
        language: "ru",
        agents,
        force: false,
        updateGitignore: true,
      });
    }

    for (const { agents, present, absent } of CASES) {
      it(`${agents.join(",")} sees commands in ${present.join(" + ")} with no other copies`, () => {
        const dir = makeTempDir();
        syncProject(dir, agents);
        const source = readFileSync(join(dir, "l1dder/skills/l1-task/SKILL.md"), "utf-8");

        for (const skillDir of present) {
          const entry = join(dir, skillDir, "l1-task");
          // Plain copies only: symlinks break on Windows and in mixed Mac + Windows repositories
          expect(lstatSync(entry).isDirectory()).toBe(true);
          expect(readFileSync(join(entry, "SKILL.md"), "utf-8")).toBe(source);
          expect(existsSync(join(dir, skillDir, "codebase-design/DEEPENING.md"))).toBe(true);
        }
        for (const skillDir of absent) {
          expect(existsSync(join(dir, skillDir, "l1-task"))).toBe(false);
        }
      });
    }

    it("sync refreshes stale copies and keeps the user's own skills and files", () => {
      const dir = makeTempDir();
      const agents: readonly AgentId[] = ["claude", "codex"];
      syncProject(dir, agents);
      const source = readFileSync(join(dir, "l1dder/skills/l1-task/SKILL.md"), "utf-8");

      writeFileSync(join(dir, ".claude/skills/l1-task/SKILL.md"), "stale", "utf-8");
      writeFileSync(join(dir, ".claude/skills/l1-task/my-notes.md"), "notes", "utf-8");
      mkdirSync(join(dir, ".claude/skills/my-own-skill"), { recursive: true });
      writeFileSync(join(dir, ".claude/skills/my-own-skill/SKILL.md"), "mine", "utf-8");

      syncProject(dir, agents);

      expect(readFileSync(join(dir, ".claude/skills/l1-task/SKILL.md"), "utf-8")).toBe(source);
      expect(readFileSync(join(dir, ".claude/skills/l1-task/my-notes.md"), "utf-8")).toBe("notes");
      expect(readFileSync(join(dir, ".claude/skills/my-own-skill/SKILL.md"), "utf-8")).toBe("mine");
    });

    it("removing an agent removes its skill folder but keeps the source", () => {
      const dir = makeTempDir();
      syncProject(dir, ["cursor", "claude", "codex"]);
      syncProject(dir, ["cursor"]);

      expect(existsSync(join(dir, ".cursor/skills/l1-task/SKILL.md"))).toBe(true);
      expect(existsSync(join(dir, ".claude/skills"))).toBe(false);
      expect(existsSync(join(dir, ".agents/skills"))).toBe(false);
      expect(existsSync(join(dir, "l1dder/skills/l1-task/SKILL.md"))).toBe(true);
    });
  });
});

describe("HOTFIX-004 regression: GitHub release notes are bilingual and cover one version", () => {
  const script = fileURLToPath(new URL("../scripts/render-release-notes.mjs", import.meta.url));

  function renderNotes(...args: string[]) {
    return spawnSync(process.execPath, [script, ...args], { encoding: "utf-8" });
  }

  it("renders English, then Russian, for the requested version only", () => {
    const { status, stdout } = renderNotes("v1.0.1");

    expect(status).toBe(0);
    expect(stdout).toContain("## 🇬🇧 English");
    expect(stdout).toContain("## 🇷🇺 Русский");
    expect(stdout.indexOf("Skill deduplication hotfix")).toBeGreaterThan(-1);
    expect(stdout.indexOf("Skill deduplication hotfix")).toBeLessThan(stdout.indexOf("## 🇷🇺 Русский"));
    expect(stdout.indexOf("Хотфикс дедупликации")).toBeGreaterThan(stdout.indexOf("## 🇷🇺 Русский"));
    expect(stdout).toContain("- HOTFIX-001: Refined documentation site copy");
    expect(stdout).toContain("- HOTFIX-001: Обновлены формулировки");
    expect(stdout).toContain("compare/v1.0.0...v1.0.1");
    expect(stdout).not.toContain("Zero Hidden State");
    expect(stdout).not.toContain("⚠️");
    expect(stdout).not.toContain("[RU]");
  });

  it("puts breaking changes first in each language and omits the diff link for the oldest entry", () => {
    const { status, stdout } = renderNotes("v1.0.0");

    expect(status).toBe(0);
    expect(stdout.indexOf("### ⚠️ Breaking changes")).toBeGreaterThan(-1);
    expect(stdout.indexOf("### ⚠️ Breaking changes")).toBeLessThan(stdout.indexOf("### ✨ What's changed"));
    expect(stdout.indexOf("### ⚠️ Ломающие изменения")).toBeGreaterThan(-1);
    expect(stdout.indexOf("### ⚠️ Ломающие изменения")).toBeLessThan(stdout.indexOf("### ✨ Что изменилось"));
    expect(stdout).not.toContain("/compare/");
  });

  it("fails for a tag without an entry in the catalog", () => {
    const { status, stderr } = renderNotes("v9.9.9");

    expect(status).not.toBe(0);
    expect(stderr).toContain("v9.9.9");
  });

  it.each([
    ["a missing English summary", { summary: { ru: "Сводка" }, changes: { ru: ["а"], en: ["a"] } }],
    ["a change translated into one language only", { summary: { ru: "Сводка", en: "Summary" }, changes: { ru: ["а"], en: [] } }],
    ["a breaking change translated into one language only", { summary: { ru: "Сводка", en: "Summary" }, breaking: { ru: ["а"] } }],
  ])("fails for %s", (_name, entry) => {
    const catalog = join(makeTempDir(), "releases.json");
    writeFileSync(catalog, JSON.stringify({ releases: [{ version: "2.0.0", date: "2026-11-01", ...entry }] }), "utf-8");

    const { status, stderr } = renderNotes("v2.0.0", catalog);

    expect(status).not.toBe(0);
    expect(stderr).toContain("2.0.0");
  });
});

// shortcut: skipped on Windows because the script shells out to `make`; the release runs from macOS/Linux, revisit if that changes
describe.skipIf(process.platform === "win32")("HOTFIX-005 regression: make release runs to the end", () => {
  it("commits metadata, merges dev into main, and pushes both branches with the tag", () => {
    const base = makeTempDir();
    const remote = join(base, "remote.git");
    const repo = join(base, "repo");
    const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();

    mkdirSync(remote);
    git(remote, "init", "-q", "--bare");
    mkdirSync(join(repo, "scripts"), { recursive: true });
    mkdirSync(join(repo, "assets"));
    git(repo, "init", "-q", "-b", "dev");
    git(repo, "config", "user.name", "Test");
    git(repo, "config", "user.email", "test@example.com");
    git(repo, "config", "commit.gpgsign", "false");
    copyFileSync(fileURLToPath(new URL("../scripts/release.mjs", import.meta.url)), join(repo, "scripts/release.mjs"));
    writeFileSync(join(repo, "Makefile"), "ci:\n\t@true\n", "utf-8");
    writeFileSync(join(repo, "assets/releases.json"), JSON.stringify({ releases: [{ version: "9.9.9" }] }), "utf-8");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "init");
    git(repo, "branch", "main");
    git(repo, "remote", "add", "origin", remote);
    git(repo, "push", "-q", "origin", "main", "dev");
    writeFileSync(join(repo, "CHANGELOG.md"), "metadata from make ci\n", "utf-8");

    const { status, stderr } = spawnSync(process.execPath, ["scripts/release.mjs"], { cwd: repo, encoding: "utf-8" });

    expect(stderr).not.toContain("TypeError");
    expect(status).toBe(0);
    expect(git(remote, "tag", "--list", "v9.9.9")).toBe("v9.9.9");
    expect(git(remote, "log", "-1", "--format=%s", "main")).toBe("chore(release): v9.9.9");
    expect(git(remote, "log", "-1", "--format=%s", "dev")).toBe("chore(release): v9.9.9");
    expect(git(repo, "branch", "--show-current")).toBe("dev");
    expect(git(repo, "status", "--porcelain")).toBe("");
  });
});
