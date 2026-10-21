# 🧬 Evolution, Release & Dogfooding Rules for `L1DDER`

> **Directory:** `l1dder/evolution/`
> **Control Skill:** `/l1-evo` (`l1dder/skills/l1-evo/SKILL.md`)
> **Core Principle:** **100% Dogfooding** — `L1DDER` is evolved following its own Two-Approval Rule, `ponytail` discipline, `grilling`, `domain-modeling`, `codebase-design`, and `Single Change = Full Sync` matrix.

---

## 1. Mandatory Release Changelog & `BREAKING CHANGES` Policy (`assets/releases.json` = Single Source of Truth)

- Internal repository infrastructure changes (`scripts/`, `Makefile`, `tests/`, `playground/`, `docs/`) are committed to the `dev` branch **without bumping the package version**.
- Whenever releasing a new public version of the `l1dder` package, the agent adds a new release entry at the top of **`assets/releases.json`** (`version`, `date`, `summary`, `changes`, and **`breaking`** in both `ru` and `en`) and logs the iteration in `assets/i18n/{ru,en}/evolution/WORKLOG-CHANGELOG.md`.
- `"version"` in `package.json` and the root `CHANGELOG.md` are **auto-generated** from `assets/releases.json` by `scripts/sync-release-meta.mjs` during `npm run build` / `make ci`. Publishing a release from `dev` to `main` + npm is done with a single command: `make release`.

### What Counts as a `BREAKING CHANGE`:
Any of the following **must** be listed in `breaking.ru` and `breaking.en` inside `assets/releases.json` (so `npx l1dder@latest update` warns the user first and asks for `yes/no` confirmation before updating):
- Changing an ID format (`IDEA-NNN`, `FEAT-NNN`, `SPRINT-NN`, `TASK-NN.MM`, `HOTFIX-NNN`) or required `ID Passport` fields;
- Renaming or removing a slash command (`/l1-*`), rule (`rules/*.mdc`), or core document in `docs/`;
- Changing the schema of `l1dder/config.json` or `l1dder/skills.json`;
- Changing or removing CLI commands or flags.

---

## 2. Core vs Stack Separation

- **`Core` (language-agnostic):** `00-methodology.mdc`, `10-conventions.mdc`, `20-workflow.mdc`, `skills/*`, `templates/*`, `METHODOLOGY.md`, `GLOSSARY.md`, `user-guide/*`.
- **`Stack` (project-specific, preserved during `npx l1dder update` / `sync`):** `skills.json` (`"stack"` array), `30-tech-stack.mdc`, `40-skills-router.mdc`, `ci/*`.
