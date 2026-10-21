import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { AgentId, Language } from "./types.js";

export const L1DDER_MARKER_BEGIN = "<!-- l1dder:begin -->";
export const L1DDER_MARKER_END = "<!-- l1dder:end -->";

export type AgentSyncScope = "all" | "skills-only";

/**
 * Skills that are explicitly invoked by the human via `/command` in chat
 * (used for `.claude/commands/`, `.windsurf/workflows/`, `.github/prompts/`, `.opencode/commands/`).
 * All 20+ skills (both user-invoked and model-invoked) are always installed into
 * `.cursor/skills/`, `.claude/skills/`, and `.agents/skills/`.
 */
const USER_INVOKED_COMMAND_SKILLS: ReadonlySet<string> = new Set([
  "l1-onboard",
  "l1-idea",
  "l1-feature",
  "l1-planning",
  "l1-task",
  "l1-hotfix",
  "l1-evo",
  "ponytail",
  "ponytail-review",
  "ponytail-audit",
  "ponytail-debt",
  "retro",
]);

export interface ParsedFrontmatter {
  readonly data: Readonly<Record<string, string>>;
  readonly body: string;
}

/**
 * Parse YAML frontmatter from a Markdown/MDC file (supports single-line scalars
 * as well as multi-line folded `>` or literal `|` blocks).
 */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!match?.[1]) return { data: {}, body: markdown };

  const data: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey: string | null = null;
  let blockLines: string[] = [];

  const flushBlock = (): void => {
    if (currentKey !== null && blockLines.length > 0) {
      data[currentKey] = blockLines.join(" ").replace(/\s+/gu, " ").trim();
    }
    currentKey = null;
    blockLines = [];
  };

  for (const line of lines) {
    if (/^\s+/u.test(line) && currentKey !== null) {
      blockLines.push(line.trim());
      continue;
    }

    flushBlock();

    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();

    if (value === ">" || value === ">-" || value === "|" || value === "|-") {
      currentKey = key;
      blockLines = [];
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (key.length > 0) data[key] = value;
  }

  flushBlock();

  return { data, body: markdown.slice(match[0].length) };
}

/**
 * Merge a managed marker block (`<!-- l1dder:begin --> ... <!-- l1dder:end -->`)
 * into an existing markdown file without destroying user-written content outside the markers.
 */
export function mergeMarkerBlock(existing: string | null, innerContent: string): string {
  const normalizedInner = innerContent.endsWith("\n") ? innerContent : `${innerContent}\n`;
  const block = `${L1DDER_MARKER_BEGIN}\n${normalizedInner}${L1DDER_MARKER_END}\n`;

  if (existing === null || existing.trim().length === 0) {
    return block;
  }

  const beginIdx = existing.indexOf(L1DDER_MARKER_BEGIN);
  const endIdx = existing.indexOf(L1DDER_MARKER_END);
  if (beginIdx !== -1 && endIdx > beginIdx) {
    const before = existing.slice(0, beginIdx);
    let after = existing.slice(endIdx + L1DDER_MARKER_END.length);
    if (after.startsWith("\r\n")) after = after.slice(2);
    else if (after.startsWith("\n")) after = after.slice(1);
    return `${before}${block}${after}`;
  }

  const trimmed = existing.endsWith("\n") ? existing : `${existing}\n`;
  return `${trimmed}\n${block}`;
}

interface RuleDoc {
  readonly fileName: string;
  readonly baseName: string;
  readonly rawContent: string;
  readonly description: string;
  readonly body: string;
}

interface SkillDoc {
  readonly name: string;
  readonly rawContent: string;
  readonly description: string;
  readonly argumentHint: string | undefined;
  readonly body: string;
  readonly companionFiles: ReadonlyArray<{ readonly fileName: string; readonly content: string }>;
}

function loadProjectRulesAndSkills(projectDir: string, rootDir: string): {
  rules: readonly RuleDoc[];
  skills: readonly SkillDoc[];
} {
  const rulesDir = join(projectDir, rootDir, "rules");
  const skillsDir = join(projectDir, rootDir, "skills");

  const rules: RuleDoc[] = [];
  if (existsSync(rulesDir)) {
    for (const entry of readdirSync(rulesDir).sort()) {
      if (!entry.endsWith(".mdc") && !entry.endsWith(".md")) continue;
      const rawContent = readFileSync(join(rulesDir, entry), "utf-8");
      const parsed = parseFrontmatter(rawContent);
      rules.push({
        fileName: entry,
        baseName: entry.replace(/\.(mdc|md)$/u, ""),
        rawContent,
        description: parsed.data["description"] ?? "L1DDER Rule",
        body: parsed.body.trimStart(),
      });
    }
  }

  const skills: SkillDoc[] = [];
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir).sort()) {
      const skillFolder = join(skillsDir, entry);
      if (!existsSync(skillFolder) || !statSync(skillFolder).isDirectory()) continue;
      const skillFile = join(skillFolder, "SKILL.md");
      if (!existsSync(skillFile) || !statSync(skillFile).isFile()) continue;

      const rawContent = readFileSync(skillFile, "utf-8");
      const parsed = parseFrontmatter(rawContent);

      const companionFiles: Array<{ fileName: string; content: string }> = [];
      for (const subEntry of readdirSync(skillFolder).sort()) {
        if (subEntry === "SKILL.md" || subEntry === ".DS_Store") continue;
        const subPath = join(skillFolder, subEntry);
        if (statSync(subPath).isFile()) {
          companionFiles.push({
            fileName: subEntry,
            content: readFileSync(subPath, "utf-8"),
          });
        }
      }

      skills.push({
        name: entry,
        rawContent,
        description: (parsed.data["description"] ?? `L1DDER skill ${entry}`).replace(/^>\s*/u, ""),
        argumentHint: parsed.data["argument-hint"],
        body: parsed.body.trimStart(),
        companionFiles,
      });
    }
  }

  return { rules, skills };
}

/**
 * Build concise entry-point summary for `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md`.
 */
export function buildEntryPointSummary(lang: Language, rootDir: string): string {
  if (lang === "ru") {
    return [
      `# Методология проекта: L1DDER (\`${rootDir}/\`)`,
      "",
      `Этот проект работает по Spec-Driven & Roadmap-Gated методологии **L1DDER**. Все правила, шаблоны, манифест скиллов (\`${rootDir}/skills.json\`) и скиллы находятся в папке \`${rootDir}/\`.`,
      "",
      "## Железные правила для любого ИИ-агента (Cursor, Claude Code, Codex и др.)",
      "1. **Roadmap Gate:** Запрещено брать в работу (`/l1-task`) фичу или задачу, которая не стоит на строке `1 (CURRENT)` в `docs/roadmap.md` (единственное исключение — `/l1-hotfix`).",
      "2. **Правило двух СТОПов:** На каждой задаче обязательно останавливайся дважды и жди явного слова **«ок»** от пользователя: после создания `plan.md` (`⛔ СТОП №1`) и после самопроверки DoD (`⛔ СТОП №2`).",
      "3. **Сквозная цепочка ID (`ID Passport`):** Каждый документ хранит все родительские ID: `IDEA-NNN` (`docs/ideas.md`) → `FEAT-NNN` (`docs/backlog.md` + `docs/specs/FEAT-NNN-<slug>/`) → `SPRINT-NN` (`docs/roadmap.md` + `docs/sprints/SPRINT-NN-<slug>/`) → `TASK-NN.MM` (и обязательный финал спринта `TASK-NN.99` Doctor Checklist).",
      "",
      "## Управляющие слэш-команды (при вызове `/l1-*` или `$l1-*` читай соответствующий `SKILL.md`)",
      `- \`/l1-onboard\` (\`$l1-onboard\`) → \`${rootDir}/skills/l1-onboard/SKILL.md\` (старт проекта, настройка \`30-tech-stack.mdc\` и \`${rootDir}/skills.json\`)`,
      `- \`/l1-idea\` (\`$l1-idea\`) → \`${rootDir}/skills/l1-idea/SKILL.md\` (брейншторм идеи и запись \`IDEA-NNN\` в \`docs/ideas.md\`)`,
      `- \`/l1-feature\` (\`$l1-feature\`) → \`${rootDir}/skills/l1-feature/SKILL.md\` (спека \`docs/specs/FEAT-NNN-<slug>/\` и нарезка в \`docs/backlog.md\`)`,
      `- \`/l1-planning\` (\`$l1-planning\`) → \`${rootDir}/skills/l1-planning/SKILL.md\` (планирование \`docs/roadmap.md\` и создание \`SPRINT-NN\`)`,
      `- \`/l1-task\` (\`$l1-task\`) → \`${rootDir}/skills/l1-task/SKILL.md\` (выполнение очередной задачи \`TASK-NN.MM\` и финального \`TASK-NN.99\` Doctor Checklist)`,
      `- \`/l1-hotfix\` (\`$l1-hotfix\`) → \`${rootDir}/skills/l1-hotfix/SKILL.md\` (срочный багфикс \`RED → GREEN\` и запись \`HOTFIX-NNN\`)`,
      `- \`/l1-evo\` (\`$l1-evo\`) → \`${rootDir}/skills/l1-evo/SKILL.md\` (эволюция методологии и обновление \`HANDOFF.md\`)`,
      "",
      "## Обновление фреймворка и скиллов по просьбе пользователя",
      "- Если пользователь просит **«обнови l1dder»** (весь фреймворк): запусти `npx l1dder@latest update`. Если CLI остановится из-за `BREAKING CHANGES`, покажи список ломающих изменений пользователю, дождись его «да» / «ок» и только после этого запусти `npx l1dder@latest update --yes`.",
      "- Если пользователь просит **«обнови только скиллы l1dder»**: запусти `npx l1dder@latest update --skills`.",
      "- Если пользователь просит добавить сторонний скилл: запусти `npx l1dder skills add <owner/repo> --skill <name>`.",
      "",
      "## Обязательные правила и манифест скиллов",
      `- \`${rootDir}/skills.json\` — манифест скиллов (\`l1dder\`, \`core\`: \`ponytail\` + \`mattpocock/skills\`, и \`stack\`)`,
      `- \`${rootDir}/rules/00-methodology.mdc\` — стандарт сквозных ID и структура \`docs/\``,
      `- \`${rootDir}/rules/10-conventions.mdc\` — дисциплина кода (\`ponytail\`, \`codebase-design\`, \`tdd\`, \`diagnosing-bugs\`)`,
      `- \`${rootDir}/rules/20-workflow.mdc\` — пошаговые алгоритмы цепочек и статусы`,
      `- \`${rootDir}/rules/30-tech-stack.mdc\` — технологический стек проекта и команды \`Makefile\``,
      `- \`${rootDir}/rules/40-skills-router.mdc\` — маршрутизатор скиллов`,
    ].join("\n");
  }

  return [
    `# Project Methodology: L1DDER (\`${rootDir}/\`)`,
    "",
    `This repository uses the **L1DDER** Spec-Driven & Roadmap-Gated AI development framework. Canonical rules, templates, skills manifest (\`${rootDir}/skills.json\`), and skills live in \`${rootDir}/\`.`,
    "",
    "## Core Guardrails for Every AI Agent (Cursor, Claude Code, Codex, etc.)",
    "1. **Roadmap Gate:** Never start `/l1-task` for any feature or task that is not at row `1 (CURRENT)` in `docs/roadmap.md` (the only exception is `/l1-hotfix`).",
    "2. **Two-Approval Rule:** Every task has two mandatory stops waiting for an explicit **\"ok\"** from the human: after writing `plan.md` (`⛔ STOP #1`) and after running DoD self-check (`⛔ STOP #2`).",
    "3. **End-to-End ID Chain (`ID Passport`):** Every document stores all parent IDs: `IDEA-NNN` (`docs/ideas.md`) → `FEAT-NNN` (`docs/backlog.md` + `docs/specs/FEAT-NNN-<slug>/`) → `SPRINT-NN` (`docs/roadmap.md` + `docs/sprints/SPRINT-NN-<slug>/`) → `TASK-NN.MM` (and mandatory sprint finale `TASK-NN.99` Doctor Checklist).",
    "",
    "## Control Slash Commands (when invoked as `/l1-*` or `$l1-*`, read the corresponding `SKILL.md`)",
    `- \`/l1-onboard\` (\`$l1-onboard\`) → \`${rootDir}/skills/l1-onboard/SKILL.md\` (project onboarding, \`30-tech-stack.mdc\` & \`${rootDir}/skills.json\` setup)`,
    `- \`/l1-idea\` (\`$l1-idea\`) → \`${rootDir}/skills/l1-idea/SKILL.md\` (refine idea & record \`IDEA-NNN\` in \`docs/ideas.md\`)`,
    `- \`/l1-feature\` (\`$l1-feature\`) → \`${rootDir}/skills/l1-feature/SKILL.md\` (create spec \`docs/specs/FEAT-NNN-<slug>/\` & slice into \`docs/backlog.md\`)`,
    `- \`/l1-planning\` (\`$l1-planning\`) → \`${rootDir}/skills/l1-planning/SKILL.md\` (schedule \`docs/roadmap.md\` & create \`SPRINT-NN\`)`,
    `- \`/l1-task\` (\`$l1-task\`) → \`${rootDir}/skills/l1-task/SKILL.md\` (execute next task \`TASK-NN.MM\` & final \`TASK-NN.99\` Doctor Checklist)`,
    `- \`/l1-hotfix\` (\`$l1-hotfix\`) → \`${rootDir}/skills/l1-hotfix/SKILL.md\` (urgent bug fix \`RED → GREEN\` & log \`HOTFIX-NNN\`)`,
    `- \`/l1-evo\` (\`$l1-evo\`) → \`${rootDir}/skills/l1-evo/SKILL.md\` (evolve methodology & update \`HANDOFF.md\`)`,
    "",
    "## Agent-Assisted Framework & Skills Updates",
    "- If the user asks to **\"update l1dder\"** (entire framework): run `npx l1dder@latest update`. If the CLI stops due to `BREAKING CHANGES`, show the breaking changes list to the user, wait for their explicit \"yes\" / \"ok\", and only then run `npx l1dder@latest update --yes`.",
    "- If the user asks to **\"update only l1dder skills\"**: run `npx l1dder@latest update --skills`.",
    "- If the user asks to add a stack skill: run `npx l1dder skills add <owner/repo> --skill <name>`.",
    "",
    "## Mandatory Rules & Skills Manifest",
    `- \`${rootDir}/skills.json\` — skills manifest (\`l1dder\`, \`core\`: \`ponytail\` + \`mattpocock/skills\`, and \`stack\`)`,
    `- \`${rootDir}/rules/00-methodology.mdc\` — ID standard & \`docs/\` layout`,
    `- \`${rootDir}/rules/10-conventions.mdc\` — code discipline (\`ponytail\`, \`codebase-design\`, \`tdd\`, \`diagnosing-bugs\`)`,
    `- \`${rootDir}/rules/20-workflow.mdc\` — step-by-step workflows & status models`,
    `- \`${rootDir}/rules/30-tech-stack.mdc\` — project tech stack & \`Makefile\` commands`,
    `- \`${rootDir}/rules/40-skills-router.mdc\` — skills router`,
  ].join("\n");
}

function addSkillFolderToMap(
  outMap: Map<string, string>,
  baseSkillsDir: string,
  skill: SkillDoc,
): void {
  const mainContent = skill.rawContent.endsWith("\n") ? skill.rawContent : `${skill.rawContent}\n`;
  outMap.set(`${baseSkillsDir}/${skill.name}/SKILL.md`, mainContent);
  for (const companion of skill.companionFiles) {
    const compContent = companion.content.endsWith("\n")
      ? companion.content
      : `${companion.content}\n`;
    outMap.set(`${baseSkillsDir}/${skill.name}/${companion.fileName}`, compContent);
  }
}

function addMergedMarkerFileToMap(
  projectDir: string,
  outMap: Map<string, string>,
  relPath: string,
  innerContent: string,
): void {
  const absPath = join(projectDir, relPath);
  const existing = existsSync(absPath) ? readFileSync(absPath, "utf-8") : null;
  const next = mergeMarkerBlock(existing, innerContent);
  outMap.set(relPath, next);
}

/**
 * Pure computation of agent files (`relPath -> content`) for the selected AI agents.
 * When `scope` is `"skills-only"`, only skill and command files are emitted (leaving
 * rules and root `AGENTS.md` / `CLAUDE.md` untouched).
 */
export function renderAgentFilesMap(options: {
  readonly projectDir: string;
  readonly rootDir: string;
  readonly language: Language;
  readonly agents: readonly AgentId[];
  readonly scope?: AgentSyncScope | undefined;
}): ReadonlyMap<string, string> {
  const { projectDir, rootDir, language, agents, scope = "all" } = options;
  const selected = new Set(agents);
  const outMap = new Map<string, string>();

  if (selected.size === 0) return outMap;

  const { rules, skills } = loadProjectRulesAndSkills(projectDir, rootDir);
  const includeRules = scope === "all";
  const entrySummary = buildEntryPointSummary(language, rootDir);
  const combinedRulesDoc = buildCombinedRulesMarkdown(entrySummary, rules);
  const commandSkills = skills.filter((s) => USER_INVOKED_COMMAND_SKILLS.has(s.name));

  // 1. Universal AGENTS.md (used by Cursor, OpenAI Codex, OpenCode, Windsurf, Cline)
  if (
    includeRules &&
    (selected.has("cursor") ||
      selected.has("codex") ||
      selected.has("opencode") ||
      selected.has("windsurf") ||
      selected.has("cline"))
  ) {
    addMergedMarkerFileToMap(projectDir, outMap, "AGENTS.md", entrySummary);
  }

  // 2. Cursor (.cursor/rules/l1dder/*.mdc + .cursor/skills/<skill>/*)
  if (selected.has("cursor")) {
    if (includeRules) {
      for (const rule of rules) {
        const text = rule.rawContent.endsWith("\n") ? rule.rawContent : `${rule.rawContent}\n`;
        outMap.set(`.cursor/rules/l1dder/${rule.fileName}`, text);
      }
    }
    for (const skill of skills) {
      addSkillFolderToMap(outMap, ".cursor/skills", skill);
    }
  }

  // 3. Claude Code (CLAUDE.md + .claude/rules/l1dder/*.md + .claude/skills/<skill>/* + .claude/commands/<cmd>.md)
  if (selected.has("claude")) {
    if (includeRules) {
      addMergedMarkerFileToMap(projectDir, outMap, "CLAUDE.md", entrySummary);
      for (const rule of rules) {
        const text = rule.body.endsWith("\n") ? rule.body : `${rule.body}\n`;
        outMap.set(`.claude/rules/l1dder/${rule.baseName}.md`, text);
      }
    }
    for (const skill of skills) {
      addSkillFolderToMap(outMap, ".claude/skills", skill);
    }
    for (const skill of commandSkills) {
      outMap.set(`.claude/commands/${skill.name}.md`, renderCommandMarkdown(skill, true));
    }
  }

  // 4. OpenAI Codex & OpenCode (.agents/skills/<skill>/*)
  if (selected.has("codex") || selected.has("opencode")) {
    for (const skill of skills) {
      addSkillFolderToMap(outMap, ".agents/skills", skill);
    }
  }

  // 5. OpenCode (.opencode/commands/<cmd>.md)
  if (selected.has("opencode")) {
    for (const skill of commandSkills) {
      outMap.set(`.opencode/commands/${skill.name}.md`, renderCommandMarkdown(skill, false));
    }
  }

  // 6. Windsurf (.windsurf/rules/l1dder.md + .windsurf/workflows/<cmd>.md)
  if (selected.has("windsurf")) {
    if (includeRules) {
      outMap.set(".windsurf/rules/l1dder.md", combinedRulesDoc);
    }
    for (const skill of commandSkills) {
      const wfContent = `---\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.body.trim()}\n`;
      outMap.set(`.windsurf/workflows/${skill.name}.md`, wfContent);
    }
  }

  // 7. GitHub Copilot (.github/copilot-instructions.md + .github/prompts/<cmd>.prompt.md)
  if (selected.has("copilot")) {
    if (includeRules) {
      addMergedMarkerFileToMap(projectDir, outMap, ".github/copilot-instructions.md", entrySummary);
    }
    for (const skill of commandSkills) {
      const promptContent = `---\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.body.trim()}\n`;
      outMap.set(`.github/prompts/${skill.name}.prompt.md`, promptContent);
    }
  }

  // 8. Cline & Roo Code (.clinerules/l1dder.md + .roo/rules/l1dder.md)
  if (selected.has("cline") && includeRules) {
    outMap.set(".clinerules/l1dder.md", combinedRulesDoc);
    outMap.set(".roo/rules/l1dder.md", combinedRulesDoc);
  }

  return outMap;
}

/**
 * Synchronize agent-specific rule files, slash commands, prompts, and skills
 * for all selected agents (`cursor`, `claude`, `codex`, `windsurf`, `copilot`, `opencode`, `cline`).
 */
export function syncAgentIntegrations(options: {
  readonly projectDir: string;
  readonly rootDir: string;
  readonly language: Language;
  readonly agents: readonly AgentId[];
  readonly scope?: AgentSyncScope | undefined;
}): readonly string[] {
  const { projectDir } = options;
  const rendered = renderAgentFilesMap(options);
  const written: string[] = [];

  for (const [relPath, content] of rendered) {
    const absPath = join(projectDir, relPath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, "utf-8");
    written.push(relPath);
  }

  return written.sort();
}

function buildCombinedRulesMarkdown(entrySummary: string, rules: readonly RuleDoc[]): string {
  const sections = [entrySummary];
  for (const rule of rules) {
    sections.push(`\n---\n\n${rule.body.trim()}`);
  }
  return `${sections.join("\n")}\n`;
}

function renderCommandMarkdown(skill: SkillDoc, includeArgumentHint: boolean): string {
  const fmLines = [`description: ${JSON.stringify(skill.description)}`];
  if (includeArgumentHint && skill.argumentHint) {
    fmLines.push(`argument-hint: ${JSON.stringify(skill.argumentHint)}`);
  }
  const suffix = skill.argumentHint ? "\nArgument: $ARGUMENTS\n" : "";
  return `---\n${fmLines.join("\n")}\n---\n\n${skill.body.trim()}\n${suffix}`;
}
