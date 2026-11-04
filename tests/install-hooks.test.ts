import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/install-hooks.mjs", import.meta.url));
const source = fileURLToPath(new URL("../scripts/hooks/pre-push", import.meta.url));
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "l1dder-hooks-"));
  tempDirs.push(dir);
  return dir;
}

function prepareRepo() {
  const repo = tempDir();
  execFileSync("git", ["init", "-q"], { cwd: repo });
  const hook = join(repo, ".git", "hooks", "pre-push");
  mkdirSync(join(repo, ".git", "hooks"), { recursive: true });
  return { repo, hook };
}

function install(cwd: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf-8" });
}

describe("install-hooks", () => {
  it("installs pre-push when the repo has none", () => {
    const { repo, hook } = prepareRepo();
    expect(install(repo).status).toBe(0);
    expect(readFileSync(hook, "utf-8")).toBe(readFileSync(source, "utf-8"));
  });

  it("leaves a different pre-push alone and points to the update command", () => {
    const { repo, hook } = prepareRepo();
    writeFileSync(hook, "#!/bin/sh\necho my own check\n");
    const result = install(repo);
    expect(result.status).toBe(0);
    expect(readFileSync(hook, "utf-8")).toContain("my own check");
    expect(result.stderr).toContain("make hooks-update");
  });

  it("stays silent when pre-push differs only in comments", () => {
    const { repo, hook } = prepareRepo();
    const withOtherComments = readFileSync(source, "utf-8").replace(/^# .*$/gm, "# another note");
    writeFileSync(hook, withOtherComments);
    const result = install(repo);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(readFileSync(hook, "utf-8")).toBe(withOtherComments);
  });

  it("replaces pre-push with --force and keeps the old file as a backup", () => {
    const { repo, hook } = prepareRepo();
    writeFileSync(hook, "#!/bin/sh\necho my own check\n");
    expect(install(repo, "--force").status).toBe(0);
    expect(readFileSync(hook, "utf-8")).toBe(readFileSync(source, "utf-8"));
    expect(readFileSync(`${hook}.bak`, "utf-8")).toContain("my own check");
  });

  it("does not touch anything when core.hooksPath is set", () => {
    const { repo, hook } = prepareRepo();
    execFileSync("git", ["config", "core.hooksPath", "my-hooks"], { cwd: repo });
    const result = install(repo);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("core.hooksPath");
    expect(existsSync(hook)).toBe(false);
    expect(existsSync(join(repo, "my-hooks", "pre-push"))).toBe(false);
    expect(execFileSync("git", ["config", "core.hooksPath"], { cwd: repo, encoding: "utf-8" }).trim()).toBe("my-hooks");
  });

  it("refuses --force when core.hooksPath is set", () => {
    const { repo } = prepareRepo();
    execFileSync("git", ["config", "core.hooksPath", "my-hooks"], { cwd: repo });
    const result = install(repo, "--force");
    expect(result.status).toBe(1);
    expect(existsSync(join(repo, "my-hooks", "pre-push"))).toBe(false);
  });

  it("never fails npm install outside a git repo", () => {
    const result = install(tempDir());
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("leaves other hooks alone", () => {
    const { repo, hook } = prepareRepo();
    const preCommit = join(repo, ".git", "hooks", "pre-commit");
    writeFileSync(preCommit, "#!/bin/sh\necho mine\n");
    install(repo);
    expect(existsSync(hook)).toBe(true);
    expect(readFileSync(preCommit, "utf-8")).toContain("mine");
  });
});

// shortcut: skipped on Windows because it runs the hook with `sh`; git runs it there through its own shell, revisit if a release moves to Windows
describe.skipIf(process.platform === "win32")("pre-push hook", () => {
  const sha = "1".repeat(40);
  const zero = "0".repeat(40);

  function push(remoteRef: string, confirm?: string, localSha = sha) {
    const env = { ...process.env };
    delete env.L1DDER_RELEASE_CONFIRM;
    if (confirm) env.L1DDER_RELEASE_CONFIRM = confirm;
    return spawnSync("sh", [source], { input: `refs/x ${localSha} ${remoteRef} ${zero}\n`, env, encoding: "utf-8" });
  }

  it("is executable in the repository", () => {
    expect(statSync(source).mode & 0o111).not.toBe(0);
  });

  it.each([
    ["refs/tags/v1.2.3", undefined],
    ["refs/tags/v1.2.3", "v9.9.9"],
    ["refs/heads/main", undefined],
  ])("blocks a push to %s with confirm %s", (ref, confirm) => {
    const result = push(ref, confirm);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("BLOCKED");
  });

  it.each([
    ["refs/tags/v1.2.3", "v1.2.3"],
    ["refs/heads/main", "v1.2.3"],
    ["refs/heads/dev", undefined],
    ["refs/heads/site/fix", undefined],
  ])("allows a push to %s with confirm %s", (ref, confirm) => {
    expect(push(ref, confirm).status).toBe(0);
  });

  it("allows deleting a remote ref", () => {
    expect(push("refs/tags/v1.2.3", undefined, zero).status).toBe(0);
  });
});
