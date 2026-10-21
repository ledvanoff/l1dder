import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { L1DDER_MARKER_BEGIN, L1DDER_MARKER_END, syncAgentIntegrations } from "./agents.js";
import { loadLanguageAssets, resolveAssetsDir } from "./assets.js";
import type {
  AgentId,
  DoctorCheck,
  DoctorReport,
  L1dderConfig,
  Language,
  SkillsManifest,
  SyncOutcome,
} from "./types.js";
import { SUPPORTED_AGENTS, SUPPORTED_LANGUAGES } from "./types.js";

export const CONFIG_FILENAME = "config.json";

function readPackageVersion(): string {
  try {
    const pkgPath = join(resolveAssetsDir(), "..", "package.json");
    const parsed = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : "1.0.0";
  } catch {
    return "1.0.0";
  }
}

export const PACKAGE_VERSION: string = readPackageVersion();

export const DEFAULT_AGENTS: readonly AgentId[] = ["cursor", "claude", "codex"] as const;

/**
 * Parse a comma-separated list of agent IDs (or `all`).
 */
export function parseAgentsFlag(raw: string | undefined): readonly AgentId[] {
  if (!raw || raw.trim() === "") {
    return [...DEFAULT_AGENTS];
  }
  const parts = raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (parts.includes("all")) {
    return [...SUPPORTED_AGENTS];
  }

  const out: AgentId[] = [];
  for (const part of parts) {
    if (!(SUPPORTED_AGENTS as readonly string[]).includes(part)) {
      throw new Error(
        `Unknown agent "${part}". Supported agents: ${SUPPORTED_AGENTS.join(", ")}, all`,
      );
    }
    const typed = part as AgentId;
    if (!out.includes(typed)) {
      out.push(typed);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_AGENTS];
}

/**
 * Parse `--lang` (`ru` or `en`).
 */
export function parseLanguageFlag(raw: string | undefined): Language {
  if (!raw || raw.trim() === "") {
    return "ru";
  }
  const normalized = raw.trim().toLowerCase();
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(normalized)) {
    throw new Error(`Unknown --lang "${raw}". Supported languages: ru, en`);
  }
  return normalized as Language;
}

/**
 * Auto-detect agents already present in a repository directory.
 * Defaults to `["cursor", "claude", "codex"]` when none are detected yet,
 * so Cursor, Claude Code, and OpenAI Codex work out of the box.
 */
export function detectExistingAgents(projectDir: string): readonly AgentId[] {
  const detected: AgentId[] = [];
  if (existsSync(join(projectDir, ".cursor"))) detected.push("cursor");
  if (existsSync(join(projectDir, ".claude")) || existsSync(join(projectDir, "CLAUDE.md"))) {
    detected.push("claude");
  }
  if (existsSync(join(projectDir, ".codex")) || existsSync(join(projectDir, ".agents"))) {
    detected.push("codex");
  }
  if (existsSync(join(projectDir, ".windsurf"))) detected.push("windsurf");
  if (existsSync(join(projectDir, ".github/copilot-instructions.md"))) detected.push("copilot");
  if (existsSync(join(projectDir, ".opencode"))) detected.push("opencode");
  if (existsSync(join(projectDir, ".clinerules")) || existsSync(join(projectDir, ".roo"))) {
    detected.push("cline");
  }
  return detected.length > 0 ? detected : [...DEFAULT_AGENTS];
}

/**
 * Read `<rootDir>/config.json` if present.
 */
export function readProjectConfig(projectDir: string, rootDir = "l1dder"): L1dderConfig | null {
  const configPath = join(projectDir, rootDir, CONFIG_FILENAME);
  if (!existsSync(configPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<L1dderConfig>;
    const language = parseLanguageFlag(raw.language);
    const agents = Array.isArray(raw.agents)
      ? parseAgentsFlag(raw.agents.join(","))
      : [...DEFAULT_AGENTS];
    return {
      version: typeof raw.version === "string" ? raw.version : PACKAGE_VERSION,
      language,
      rootDir: typeof raw.rootDir === "string" && raw.rootDir.length > 0 ? raw.rootDir : rootDir,
      agents,
    };
  } catch {
    return null;
  }
}

/**
 * Write `<rootDir>/config.json`.
 */
export function writeProjectConfig(projectDir: string, config: L1dderConfig): void {
  const configPath = join(projectDir, config.rootDir, CONFIG_FILENAME);
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

/**
 * Merge a newly shipped `skills.json` with an existing user `skills.json`:
 * updates `l1dder` and `core` to the latest shipped definitions while preserving
 * the project's custom `stack` array.
 */
function mergeSkillsManifestJson(existingRaw: string, shippedRaw: string): string {
  try {
    const existing = JSON.parse(existingRaw) as Partial<SkillsManifest>;
    const shipped = JSON.parse(shippedRaw) as SkillsManifest;
    const merged: SkillsManifest = {
      description: shipped.description,
      l1dder: shipped.l1dder,
      core: shipped.core,
      stack: Array.isArray(existing.stack) ? existing.stack : [],
    };
    return `${JSON.stringify(merged, null, 2)}\n`;
  } catch {
    return existingRaw;
  }
}

/**
 * Initialize, synchronize, or update `<rootDir>/` and all selected AI agent integrations.
 *
 * - When `skillsOnly` is `false` (default): updates the entire framework (Core rules, skills,
 *   templates, methodology docs, and agent integrations) while preserving project Stack files
 *   (`30-tech-stack.mdc`, `40-skills-router.mdc`, `ci/*`, and the `"stack"` array in `skills.json`).
 * - When `skillsOnly` is `true`: updates ONLY `<rootDir>/skills/**`, merges `<rootDir>/skills.json`,
 *   and refreshes skill/command files in the configured AI agents without touching rules or templates.
 */
export function runProjectSync(options: {
  readonly projectDir: string;
  readonly rootDir: string;
  readonly language: Language;
  readonly agents: readonly AgentId[];
  readonly force: boolean;
  readonly updateGitignore: boolean;
  readonly skillsOnly?: boolean | undefined;
}): SyncOutcome {
  const {
    projectDir,
    rootDir,
    language,
    agents,
    force,
    updateGitignore,
    skillsOnly = false,
  } = options;

  const config: L1dderConfig = {
    version: PACKAGE_VERSION,
    language,
    rootDir,
    agents,
  };
  writeProjectConfig(projectDir, config);

  const shipped = loadLanguageAssets(language, rootDir);
  const created: string[] = [];
  const updated: string[] = [];
  const preservedStack: string[] = [];

  for (const asset of shipped) {
    const isSkillAsset =
      asset.relativePath.startsWith("skills/") || asset.relativePath === "skills.json";
    if (skillsOnly && !isSkillAsset) {
      continue;
    }

    const relToProject = `${rootDir}/${asset.relativePath}`;
    const absPath = join(projectDir, rootDir, asset.relativePath);
    const exists = existsSync(absPath);

    // Special smart-merge for skills.json: keep user's `stack` array while updating `l1dder` & `core`
    if (exists && asset.relativePath === "skills.json" && !force) {
      const currentRaw = readFileSync(absPath, "utf-8");
      const mergedRaw = mergeSkillsManifestJson(currentRaw, asset.content);
      if (mergedRaw !== currentRaw) {
        writeFileSync(absPath, mergedRaw, "utf-8");
        updated.push(relToProject);
      }
      preservedStack.push(relToProject);
      continue;
    }

    if (exists && asset.isStackFile && !force) {
      preservedStack.push(relToProject);
      continue;
    }

    mkdirSync(dirname(absPath), { recursive: true });
    if (!exists) {
      writeFileSync(absPath, asset.content, "utf-8");
      created.push(relToProject);
    } else {
      const current = readFileSync(absPath, "utf-8");
      if (current !== asset.content) {
        writeFileSync(absPath, asset.content, "utf-8");
        updated.push(relToProject);
      }
    }
  }

  if (updateGitignore && !skillsOnly) {
    ensureGitignoreBlock(projectDir);
  }

  const agentFilesWritten = syncAgentIntegrations({
    projectDir,
    rootDir,
    language,
    agents,
    scope: skillsOnly ? "skills-only" : "all",
  });

  return {
    rootDir,
    language,
    agents,
    created,
    updated,
    preservedStack,
    agentFilesWritten,
  };
}

/**
 * Lightweight, non-blocking structure check (`npx l1dder doctor`).
 */
export function runProjectDoctor(projectDir: string, rootDir = "l1dder"): DoctorReport {
  const config = readProjectConfig(projectDir, rootDir);
  const language: Language = config?.language ?? "ru";
  const agents: readonly AgentId[] = config?.agents ?? [...DEFAULT_AGENTS];
  const checks: DoctorCheck[] = [];

  const rootAbs = join(projectDir, rootDir);
  if (!existsSync(rootAbs)) {
    checks.push({
      id: "root-dir",
      status: "fail",
      message:
        language === "ru"
          ? `Папка ${rootDir}/ не найдена. Запусти: npx l1dder init`
          : `Directory ${rootDir}/ not found. Run: npx l1dder init`,
    });
    return { ok: false, rootDir, language, agents, checks };
  }

  checks.push({
    id: "root-dir",
    status: "pass",
    message: `${rootDir}/ (v${config?.version ?? PACKAGE_VERSION}, ${language}, agents: ${agents.join(", ")})`,
  });

  const requiredFrameworkFiles = [
    "METHODOLOGY.md",
    "GLOSSARY.md",
    "skills.json",
    "rules/00-methodology.mdc",
    "rules/10-conventions.mdc",
    "rules/20-workflow.mdc",
    "rules/30-tech-stack.mdc",
    "rules/40-skills-router.mdc",
    "skills/l1-onboard/SKILL.md",
    "skills/l1-idea/SKILL.md",
    "skills/l1-feature/SKILL.md",
    "skills/l1-planning/SKILL.md",
    "skills/l1-task/SKILL.md",
    "skills/l1-hotfix/SKILL.md",
    "skills/l1-evo/SKILL.md",
    "skills/ponytail/SKILL.md",
    "skills/grilling/SKILL.md",
    "skills/codebase-design/SKILL.md",
  ];

  const missingFramework = requiredFrameworkFiles.filter(
    (rel) => !existsSync(join(rootAbs, rel)),
  );
  if (missingFramework.length === 0) {
    checks.push({
      id: "framework-files",
      status: "pass",
      message:
        language === "ru"
          ? `Все ключевые правила и 20 базовых скиллов в ${rootDir}/ на месте`
          : `All core rules and 20 bundled skills in ${rootDir}/ are present`,
    });
  } else {
    checks.push({
      id: "framework-files",
      status: "fail",
      message:
        language === "ru"
          ? `Отсутствуют файлы в ${rootDir}/: ${missingFramework.join(", ")} (запусти npx l1dder update)`
          : `Missing files in ${rootDir}/: ${missingFramework.join(", ")} (run npx l1dder update)`,
    });
  }

  const docsDir = join(projectDir, "docs");
  if (!existsSync(docsDir)) {
    checks.push({
      id: "docs-onboard",
      status: "warn",
      message:
        language === "ru"
          ? "Папка docs/ ещё не создана — открой чат агента и вызови /l1-onboard"
          : "docs/ folder not created yet — open your agent chat and run /l1-onboard",
    });
  } else {
    const coreDocs = ["docs/ideas.md", "docs/backlog.md", "docs/roadmap.md"];
    const missingDocs = coreDocs.filter((rel) => !existsSync(join(projectDir, rel)));
    if (missingDocs.length === 0) {
      checks.push({
        id: "docs-screens",
        status: "pass",
        message:
          language === "ru"
            ? "Три экрана управления (docs/ideas.md, docs/backlog.md, docs/roadmap.md) созданы"
            : "All 3 control screens (docs/ideas.md, docs/backlog.md, docs/roadmap.md) exist",
      });
    } else {
      checks.push({
        id: "docs-screens",
        status: "warn",
        message:
          language === "ru"
            ? `Ещё не созданы: ${missingDocs.join(", ")} (вызови /l1-onboard)`
            : `Not created yet: ${missingDocs.join(", ")} (run /l1-onboard)`,
      });
    }
  }

  return {
    ok: checks.every((c) => c.status !== "fail"),
    rootDir,
    language,
    agents,
    checks,
  };
}

function ensureGitignoreBlock(projectDir: string): void {
  const gitignorePath = join(projectDir, ".gitignore");
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf-8") : "";
  if (existing.includes(L1DDER_MARKER_BEGIN)) return;

  const block = [
    L1DDER_MARKER_BEGIN,
    ".env",
    ".env.local",
    ".env.*.local",
    ".DS_Store",
    L1DDER_MARKER_END,
    "",
  ].join("\n");

  const next =
    existing.length === 0
      ? block
      : existing.endsWith("\n")
        ? `${existing}\n${block}`
        : `${existing}\n\n${block}`;
  writeFileSync(gitignorePath, next, "utf-8");
}
