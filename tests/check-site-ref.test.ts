import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/check-site-ref.mjs", import.meta.url));
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function prepareRepo() {
  const repo = mkdtempSync(join(tmpdir(), "l1dder-site-ref-"));
  tempDirs.push(repo);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf-8" }).trim();
  const commit = (file: string, text = "changed\n") => {
    mkdirSync(dirname(join(repo, file)), { recursive: true });
    writeFileSync(join(repo, file), text);
    git("add", "-A");
    git("commit", "-q", "-m", `change ${file}`);
  };
  git("init", "-q", "-b", "dev");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  git("config", "commit.gpgsign", "false");
  commit("README.md", "start\n");
  git("tag", "v1.0.0");
  return { repo, git, commit };
}

function check(repo: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: repo, encoding: "utf-8" });
}

describe("check-site-ref", () => {
  it("allows a ref with only site changes since the latest release", () => {
    const { repo, commit } = prepareRepo();
    commit("site/.vitepress/config.mts");
    expect(check(repo).status).toBe(0);
  });

  it("rejects CLI code changes and names the file", () => {
    const { repo, commit } = prepareRepo();
    commit("src/cli.ts");
    const result = check(repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/cli.ts");
  });

  it.each([
    "assets/i18n/ru/rules/20-workflow.mdc",
    "assets/i18n/en/skills/l1-task/SKILL.md",
    "assets/i18n/ru/templates/tasks/plan-template.md",
    "assets/releases.json",
  ])("rejects shipped product asset %s", (file) => {
    const { repo, commit } = prepareRepo();
    commit(file);
    const result = check(repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(file);
  });

  it.each([
    "assets/i18n/ru/user-guide/01-QUICKSTART.md",
    "assets/i18n/en/METHODOLOGY.md",
    "assets/i18n/ru/GLOSSARY.md",
  ])("allows docs page source %s", (file) => {
    const { repo, commit } = prepareRepo();
    commit(file);
    expect(check(repo).status).toBe(0);
  });

  it("allows rolling back to an already released ref", () => {
    const { repo, git, commit } = prepareRepo();
    commit("src/cli.ts", "next release\n");
    git("tag", "v1.1.0");
    expect(check(repo, "v1.0.0").status).toBe(0);
  });

  it("compares with the highest version, not the alphabetical one", () => {
    const { repo, git, commit } = prepareRepo();
    git("tag", "v1.0.9");
    commit("src/cli.ts");
    git("tag", "v1.0.10");
    commit("site/index.md");
    expect(check(repo).status).toBe(0);
  });

  it("fails clearly when there is no release tag", () => {
    const { repo, git } = prepareRepo();
    git("tag", "-d", "v1.0.0");
    const result = check(repo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("No release tag");
  });
});
