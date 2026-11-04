import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/sync-release-meta.mjs", import.meta.url));
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function prepareRepo(lockText: string) {
  const repo = mkdtempSync(join(tmpdir(), "l1dder-release-meta-"));
  tempDirs.push(repo);
  mkdirSync(join(repo, "scripts"));
  mkdirSync(join(repo, "assets"));
  copyFileSync(script, join(repo, "scripts/sync-release-meta.mjs"));
  const release = { version: "2.0.0", date: "2026-01-01", summary: { ru: "ru", en: "en" } };
  writeFileSync(join(repo, "assets/releases.json"), JSON.stringify({ releases: [release] }));
  writeFileSync(join(repo, "package.json"), `${JSON.stringify({ name: "l1dder", version: "2.0.0" }, null, 2)}\n`);
  writeFileSync(join(repo, "CHANGELOG.md"), "");
  writeFileSync(join(repo, "package-lock.json"), lockText);
  return repo;
}

function sync(repo: string) {
  return spawnSync(process.execPath, [join(repo, "scripts/sync-release-meta.mjs")], { encoding: "utf-8" });
}

describe("sync-release-meta", () => {
  it("syncs both versions of the package itself in package-lock.json", () => {
    const dependency = { version: "1.26.0", integrity: "sha512-x" };
    const repo = prepareRepo(
      `${JSON.stringify(
        {
          name: "l1dder",
          version: "1.0.0",
          lockfileVersion: 3,
          packages: { "": { name: "l1dder", version: "1.0.0" }, "node_modules/dep": dependency },
        },
        null,
        2,
      )}\n`,
    );
    expect(sync(repo).status).toBe(0);
    const lock = JSON.parse(readFileSync(join(repo, "package-lock.json"), "utf-8"));
    expect(lock.version).toBe("2.0.0");
    expect(lock.packages[""].version).toBe("2.0.0");
    expect(lock.packages["node_modules/dep"]).toEqual(dependency);
  });

  it("does not rewrite a lockfile that is already in sync", () => {
    const text = '{"version":"2.0.0","packages":{"":{"version":"2.0.0"}}}\n';
    const repo = prepareRepo(text);
    expect(sync(repo).status).toBe(0);
    expect(readFileSync(join(repo, "package-lock.json"), "utf-8")).toBe(text);
  });
});
