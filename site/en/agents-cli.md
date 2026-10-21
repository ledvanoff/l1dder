# 🤖 Supported AI Agents, Skills Manifest & CLI Reference

`L1DDER` works across all major AI coding agents from a single canonical `l1dder/` directory in your repository.

---

## 1. Terminal CLI Commands

### `npx l1dder init`
Installs the `l1dder/` directory (methodology, templates, rules, `l1dder/skills.json` manifest, and **20 bundled skills**) and configures native rules and slash commands for your selected AI agents.

```bash
# Interactive setup (asks for language and agents):
npx l1dder init

# Non-interactive setup for Cursor and Claude Code in English:
npx l1dder init --lang en --agents cursor,claude --yes

# Configure all supported agents at once:
npx l1dder init --lang en --agents all --yes
```

### `npx l1dder@latest update` (or `npx l1dder sync`) — Update Entire Framework with `BREAKING CHANGES` Guard
When a new version of `l1dder` is released, run a single command:
```bash
npx l1dder@latest update
```
1. **Changelog & `BREAKING CHANGES` Check:** The CLI compares your installed version in `l1dder/config.json` against the new release, prints the changelog, and if any intermediate release contains **`BREAKING CHANGES`**, displays them prominently and asks:
   `❓ This update includes BREAKING CHANGES. Proceed with update? (yes/no) [y/N]:`
   Only if you reply **`yes`** (or pass `--yes`) does the CLI proceed. If you reply `no`, zero files are modified.
2. **Framework Update:** updates `00-methodology.mdc`, `10-conventions.mdc`, `20-workflow.mdc`, all 20 bundled `/l1-*`, `ponytail*`, `mattpocock/skills`, `templates/`, `user-guide/`, `METHODOLOGY.md`, and refreshes all configured AI agent folders.

> 🔒 **Stack Protection:** `npx l1dder@latest update` **never overwrites** your project-specific stack files (`l1dder/rules/30-tech-stack.mdc`, `l1dder/rules/40-skills-router.mdc`, `l1dder/ci/*`, and the `"stack"` array in `l1dder/skills.json`). Use `--force` only if you want to reset stack files to the default template.

### `npx l1dder changelog`
Displays the release history, new features, and all `BREAKING CHANGES`.

### `npx l1dder@latest update --skills` (or `npx l1dder skills update`) — Update ONLY Skills
If you want to update **only the skills** from a new `l1dder` release (`/l1-*`, `ponytail*`, `mattpocock/skills`, and your `stack` skills in `l1dder/skills.json`) while leaving `l1dder/rules/`, `l1dder/templates/`, and `AGENTS.md`/`CLAUDE.md` completely untouched:
```bash
npx l1dder@latest update --skills
# (or: npx l1dder@latest update skills / npx l1dder@latest skills update)
```
This updates only `l1dder/skills/**` and the skill/command folders in your configured AI agents (`.cursor/skills/`, `.claude/skills/`, `.claude/commands/`, `.agents/skills/`, etc.).

### `npx l1dder skills` (`list | add | install | update`)
Manages project skills declaratively via **`l1dder/skills.json`** (`package.json` for AI Agent Skills):

```bash
# List all skills declared in l1dder/skills.json (l1dder, core, stack) and their install status:
npx l1dder skills list

# Add an external stack skill to "stack" in l1dder/skills.json, download it from GitHub into l1dder/skills/, and sync to all agents:
npx l1dder skills add vercel-labs/agent-skills --skill vercel-react-best-practices,vercel-composition-patterns
npx l1dder skills add anthropics/skills --skill frontend-design,webapp-testing

# Download all stack skills declared in l1dder/skills.json:
npx l1dder skills install

# Pull latest upstream versions from GitHub for both stack and bundled core skills (ponytail + mattpocock/skills):
npx l1dder skills update
```

### `npx l1dder doctor`
Runs a fast, non-blocking check of your `l1dder/` installation and the three `docs/` control screens (`docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`).

---

## 2. 📦 Skills Manifest `l1dder/skills.json` ("`package.json` for Skills")

Inside `l1dder/` sits **`l1dder/skills.json`**, organizing all skills into 3 clear tiers:

```json
{
  "l1dder": [
    "l1-onboard", "l1-idea", "l1-feature", "l1-planning", "l1-task", "l1-hotfix", "l1-evo"
  ],
  "core": [
    {
      "repo": "DietrichGebert/ponytail",
      "bundled": true,
      "skills": ["ponytail", "ponytail-review", "ponytail-audit", "ponytail-debt"]
    },
    {
      "repo": "mattpocock/skills",
      "bundled": true,
      "skills": [
        "grilling", "domain-modeling", "codebase-design", "tdd",
        "diagnosing-bugs", "code-review", "retro", "prototype", "writing-for-agents"
      ]
    }
  ],
  "stack": [
    {
      "repo": "anthropics/skills",
      "skills": ["frontend-design", "webapp-testing"]
    }
  ]
}
```

1. **`l1dder` (7 workflow control skills):** built-in slash commands (`/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task`, `/l1-hotfix`, `/l1-evo`).
2. **`core` (13 core engineering skills — bundled out of the box `bundled: true`):**
   - `DietrichGebert/ponytail`: `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`.
   - `mattpocock/skills` (`Model-invoked` engineering primitives): `grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `retro`, `prototype`, `writing-for-agents` (along with all companion reference files `DEEPENING.md`, `DESIGN-IT-TWICE.md`, `tests.md`, `mocking.md`, `LOGIC.md`, `UI.md`, `GLOSSARY-FORMAT.md`, `ADR-FORMAT.md`).
   - Because they are bundled (`bundled: true`), `npx l1dder init` installs them offline in milliseconds, while `npx l1dder skills update` lets you pull fresh upstream updates from GitHub anytime.
3. **`stack` (project stack skills):** configured during `/l1-onboard` (or via `npx l1dder skills add <repo> --skill <name>`), stored in `l1dder/skills.json`, and preserved across `npx l1dder sync`.

---

## 3. Generated Files per AI Agent

| AI Agent | `--agents` Flag | Files Generated in Your Repository |
|----------|:---------------:|------------------------------------|
| **Cursor** | `cursor` | • `.cursor/rules/l1dder/*.mdc` (5 rules with `alwaysApply: true`)<br/>• `.cursor/skills/<skill>/*` (all 20+ skills `/l1-*`, `ponytail*`, `mattpocock/skills` & `stack`)<br/>• `AGENTS.md` (managed `<!-- l1dder:begin -->` block) |
| **Claude Code** | `claude` | • `CLAUDE.md` (managed `<!-- l1dder:begin -->` block)<br/>• `.claude/rules/l1dder/*.md` (modular rules)<br/>• `.claude/commands/<skill>.md` (slash commands)<br/>• `.claude/skills/<skill>/*` (complete skill folders) |
| **OpenAI Codex** | `codex` | • `AGENTS.md`<br/>• `.agents/skills/<skill>/*` (complete folders for all 20+ skills) |
| **Windsurf** | `windsurf` | • `.windsurf/rules/l1dder.md`<br/>• `.windsurf/workflows/<skill>.md` (slash workflows)<br/>• `AGENTS.md` |
| **GitHub Copilot** | `copilot` | • `.github/copilot-instructions.md` (managed marker block)<br/>• `.github/prompts/<skill>.prompt.md` (prompt files) |
| **OpenCode** | `opencode` | • `AGENTS.md`<br/>• `.opencode/commands/<skill>.md`<br/>• `.agents/skills/<skill>/*` |
| **Cline / Roo Code** | `cline` | • `.clinerules/l1dder.md`<br/>• `.roo/rules/l1dder.md`<br/>• `AGENTS.md` |
