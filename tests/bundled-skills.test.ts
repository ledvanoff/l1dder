import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { runProjectSync } from "../src/installer.js";
import type { Language } from "../src/types.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Every place a skill lands in a project: the l1dder/ copy and each agent's skills folder.
const SKILL_ROOTS = ["l1dder/skills", ".claude/skills", ".cursor/skills", ".agents/skills"];
// Paths in backticks that start with these name project files, not files next to the skill.
const PROJECT_DIRS = new Set(["docs", "l1dder", "src", "assets", "tests", "tasks", ".claude", ".cursor", ".agents"]);

function install(language: Language): string {
  const dir = mkdtempSync(join(tmpdir(), "l1dder-skills-"));
  tempDirs.push(dir);
  runProjectSync({ projectDir: dir, rootDir: "l1dder", language, agents: ["cursor", "claude", "codex"], force: false, updateGitignore: false });
  return dir;
}

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return entry.endsWith(".md") ? [path] : [];
  });
}

// Links to files next to the skill: markdown links, and backticked paths like `scripts/x.sh`.
function localReferences(markdown: string): string[] {
  const prose = markdown.replace(/^\s*```[\s\S]*?^\s*```/gm, "");
  const links = prose
    .split("\n")
    // A link inside inline code is an example to write into docs/, not a link of the skill.
    .flatMap((line) => [...line.matchAll(/\]\(([^)\s]+)\)/g)].filter((match) => (line.slice(0, match.index).split("`").length - 1) % 2 === 0))
    .map((match) => (match[1] ?? "").split("#")[0] ?? "")
    .filter((target) => target && !/^[a-z]+:/i.test(target));
  const paths = [...prose.matchAll(/`([\w.-]+\/[\w./-]+\.\w+)`/g)]
    .map((match) => match[1] ?? "")
    .filter((path) => !PROJECT_DIRS.has(path.split("/")[0] ?? ""));
  return [...links, ...paths];
}

describe.each(["ru", "en"] as const)("bundled skills (%s)", (language) => {
  it("every file a skill points to is installed next to it", () => {
    const project = install(language);
    const broken: string[] = [];
    for (const root of SKILL_ROOTS) {
      const skillsDir = join(project, root);
      if (!existsSync(skillsDir)) continue;
      for (const file of markdownFiles(skillsDir)) {
        for (const target of localReferences(readFileSync(file, "utf-8"))) {
          if (!existsSync(join(dirname(file), target))) broken.push(`${relative(project, file)} -> ${target}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("carries no leftovers of a merge with the upstream skills", () => {
    const skillsDir = fileURLToPath(new URL(`../assets/i18n/${language}/skills`, import.meta.url));
    const leftovers = markdownFiles(skillsDir).filter((file) => /^(<{7}|>{7}|={7})( |$)/m.test(readFileSync(file, "utf-8")));
    expect(leftovers.map((file) => relative(skillsDir, file))).toEqual([]);
  });
});
