import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { syncAgentIntegrations } from "./agents.js";
import { resolveAssetsDir } from "./assets.js";
import { readProjectConfig } from "./installer.js";
import type { ExternalSkillSource, SkillsManifest } from "./types.js";

export const SKILLS_MANIFEST_FILENAME = "skills.json";

function loadShippedDefaultManifest(): SkillsManifest {
  const shippedPath = join(resolveAssetsDir(), "i18n", "ru", SKILLS_MANIFEST_FILENAME);
  return JSON.parse(readFileSync(shippedPath, "utf-8")) as SkillsManifest;
}

/**
 * Known upstream path patterns inside popular skill repositories on GitHub.
 */
function candidateRawUrls(repo: string, skillName: string): readonly string[] {
  const cleanRepo = repo.replace(/^https?:\/\/github\.com\//u, "").replace(/\.git$/u, "");
  return [
    `https://raw.githubusercontent.com/${cleanRepo}/main/skills/${skillName}/SKILL.md`,
    `https://raw.githubusercontent.com/${cleanRepo}/main/skills/engineering/${skillName}/SKILL.md`,
    `https://raw.githubusercontent.com/${cleanRepo}/main/skills/productivity/${skillName}/SKILL.md`,
    `https://raw.githubusercontent.com/${cleanRepo}/main/.agents/skills/${skillName}/SKILL.md`,
    `https://raw.githubusercontent.com/${cleanRepo}/main/${skillName}/SKILL.md`,
  ];
}

/**
 * Read `<rootDir>/skills.json` or return the shipped default manifest.
 */
export function readSkillsManifest(projectDir: string, rootDir = "l1dder"): SkillsManifest {
  const fallback = loadShippedDefaultManifest();
  const manifestPath = join(projectDir, rootDir, SKILLS_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf-8")) as Partial<SkillsManifest>;
    return {
      description: parsed.description ?? fallback.description,
      l1dder: Array.isArray(parsed.l1dder) ? parsed.l1dder : fallback.l1dder,
      core: Array.isArray(parsed.core) ? parsed.core : fallback.core,
      stack: Array.isArray(parsed.stack) ? parsed.stack : [],
    };
  } catch {
    return fallback;
  }
}

/**
 * Save `<rootDir>/skills.json`.
 */
export function writeSkillsManifest(
  projectDir: string,
  rootDir: string,
  manifest: SkillsManifest,
): void {
  const manifestPath = join(projectDir, rootDir, SKILLS_MANIFEST_FILENAME);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

export interface SkillStatusRow {
  readonly group: "l1dder" | "core" | "stack";
  readonly repo: string;
  readonly skill: string;
  readonly installed: boolean;
}

/**
 * List all skills declared in `<rootDir>/skills.json` and whether they exist in `<rootDir>/skills/`.
 */
export function listDeclaredSkills(
  projectDir: string,
  rootDir = "l1dder",
): readonly SkillStatusRow[] {
  const manifest = readSkillsManifest(projectDir, rootDir);
  const rows: SkillStatusRow[] = [];

  for (const skill of manifest.l1dder) {
    rows.push({
      group: "l1dder",
      repo: "built-in (L1DDER)",
      skill,
      installed: existsSync(join(projectDir, rootDir, "skills", skill, "SKILL.md")),
    });
  }

  for (const entry of manifest.core) {
    for (const skill of entry.skills) {
      rows.push({
        group: "core",
        repo: entry.repo,
        skill,
        installed: existsSync(join(projectDir, rootDir, "skills", skill, "SKILL.md")),
      });
    }
  }

  for (const entry of manifest.stack) {
    for (const skill of entry.skills) {
      rows.push({
        group: "stack",
        repo: entry.repo,
        skill,
        installed: existsSync(join(projectDir, rootDir, "skills", skill, "SKILL.md")),
      });
    }
  }

  return rows;
}

/**
 * Add a stack skill entry to `<rootDir>/skills.json`.
 */
export function addStackSkillToManifest(options: {
  readonly projectDir: string;
  readonly rootDir: string;
  readonly repo: string;
  readonly skills: readonly string[];
}): SkillsManifest {
  const { projectDir, rootDir, repo, skills } = options;
  const current = readSkillsManifest(projectDir, rootDir);
  const cleanRepo = repo.replace(/^https?:\/\/github\.com\//u, "").replace(/\.git$/u, "");

  const nextStack: ExternalSkillSource[] = [];
  let found = false;

  for (const item of current.stack) {
    if (item.repo === cleanRepo) {
      found = true;
      const merged = Array.from(new Set([...item.skills, ...skills]));
      nextStack.push({ repo: cleanRepo, skills: merged });
    } else {
      nextStack.push(item);
    }
  }

  if (!found) {
    nextStack.push({ repo: cleanRepo, skills: [...skills] });
  }

  const nextManifest: SkillsManifest = {
    ...current,
    stack: nextStack,
  };
  writeSkillsManifest(projectDir, rootDir, nextManifest);
  return nextManifest;
}

/**
 * Fetch external skills from GitHub (for `stack` skills, and optionally `core` when `updateCore` is true),
 * save them into `<rootDir>/skills/<skill>/SKILL.md`, and propagate them to all configured AI agents.
 */
export async function installSkillsFromManifest(options: {
  readonly projectDir: string;
  readonly rootDir: string;
  readonly updateCore: boolean;
  readonly fetcher?: typeof fetch;
}): Promise<{
  readonly downloaded: readonly string[];
  readonly skippedBundled: readonly string[];
  readonly failed: readonly { skill: string; repo: string }[];
  readonly agentFilesWritten: readonly string[];
}> {
  const { projectDir, rootDir, updateCore, fetcher = globalThis.fetch } = options;
  const manifest = readSkillsManifest(projectDir, rootDir);
  const downloaded: string[] = [];
  const skippedBundled: string[] = [];
  const failed: Array<{ skill: string; repo: string }> = [];

  const sourcesToProcess: Array<{ source: ExternalSkillSource; isCore: boolean }> = [
    ...manifest.core.map((source) => ({ source, isCore: true })),
    ...manifest.stack.map((source) => ({ source, isCore: false })),
  ];

  for (const { source, isCore } of sourcesToProcess) {
    for (const skill of source.skills) {
      const targetPath = join(projectDir, rootDir, "skills", skill, "SKILL.md");
      if (isCore && !updateCore && existsSync(targetPath)) {
        skippedBundled.push(skill);
        continue;
      }

      const content = await fetchSkillMarkdown(source.repo, skill, fetcher);
      if (content !== null) {
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
        downloaded.push(`${source.repo}:${skill}`);
      } else {
        failed.push({ skill, repo: source.repo });
      }
    }
  }

  const config = readProjectConfig(projectDir, rootDir);
  const agentFilesWritten = syncAgentIntegrations({
    projectDir,
    rootDir,
    language: config?.language ?? "ru",
    agents: config?.agents ?? ["cursor"],
  });

  return {
    downloaded,
    skippedBundled,
    failed,
    agentFilesWritten,
  };
}

async function fetchSkillMarkdown(
  repo: string,
  skillName: string,
  fetcher: typeof fetch,
): Promise<string | null> {
  for (const url of candidateRawUrls(repo, skillName)) {
    try {
      const response = await fetcher(url);
      if (response.ok) {
        const text = await response.text();
        if (text.trim().length > 0) {
          return text;
        }
      }
    } catch {
      // Try next candidate URL
    }
  }
  return null;
}
