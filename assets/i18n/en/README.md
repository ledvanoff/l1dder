# L1DDER — AI-Driven & Spec-Driven Development Framework

Self-contained **L1DDER** methodology package for iterative AI-driven / Spec-driven development with AI coding agents (**Cursor, Claude Code, OpenAI Codex, Windsurf, GitHub Copilot, OpenCode, Cline**).

Zero hidden state machines (`state.yml`) and zero brittle hooks: **your Markdown documents in `docs/` with traceable ID Passports are the single source of truth**.

---

## What's Inside `l1dder/`

```
l1dder/
├── config.json             # Installation config (language ru/en & enabled agents)
├── user-guide/             # 📖 VIBE-CODER FRIENDLY GUIDE (with visual Mermaid diagrams!)
├── evolution/              # 🧬 DOGFOODING & EVOLUTION: METHODOLOGY-RULES.md, WORKLOG-CHANGELOG.md, HANDOFF.md
├── METHODOLOGY.md          # Complete L1DDER specification: artifacts, flows, Roadmap Gate, Doctor Checklist
├── GLOSSARY.md             # Domain glossary & status models
├── rules/                  # Core & Stack rules (00..40-*.mdc)
├── skills/                 # Control skills (/l1-*) + engineering discipline skills (ponytail-*)
├── templates/              # Templates with ID Passports for concept, ideas, backlog, roadmap, specs, sprints, tasks
├── onboarding/             # Project entry points (from-scratch, existing-code, continue-project)
└── ci/                     # CI/Git starter (.gitignore & GitHub Actions)
```

---

## ⚡ Quick Start (2 Steps)

### Step 1. Initialize `L1DDER` in Your Project

```bash
# Interactive setup (selects language en/ru and your AI agents)
npx l1dder init

# Or non-interactive one-liner (e.g., English for Cursor and Claude Code):
npx l1dder init --lang en --agents cursor,claude --yes
```

Supported AI agents (`--agents`):
- `cursor` — Cursor IDE (`.cursor/rules/l1dder/*.mdc` + `.cursor/skills/*` + `AGENTS.md`)
- `claude` — Claude Code (`CLAUDE.md` + `.claude/rules/l1dder/*.md` + `.claude/commands/*` + `.claude/skills/*`)
- `codex` — OpenAI Codex (`AGENTS.md` + `.agents/skills/*`)
- `windsurf` — Windsurf (`.windsurf/rules/l1dder.md` + `.windsurf/workflows/*`)
- `copilot` — GitHub Copilot / VS Code (`.github/copilot-instructions.md` + `.github/prompts/*.prompt.md`)
- `opencode` — OpenCode (`AGENTS.md` + `.opencode/commands/*` + `.agents/skills/*`)
- `cline` — Cline / Roo Code (`.clinerules/l1dder.md` + `.roo/rules/l1dder.md`)
- `all` — configure all supported AI agents at once

### Step 2. Run Onboarding in Your Agent Chat

Open your AI agent chat and type:
```text
/l1-onboard
```
The agent automatically detects whether the repo is empty (`from-scratch`) or already has code (`existing-code`), configures your project stack in `l1dder/rules/30-tech-stack.mdc`, and step-by-step builds your `docs/` foundation.

---

## 🎮 Control Slash Commands

| Slash Command | Flow | What It Does |
|---------------|------|--------------|
| **`/l1-onboard`** | Project Onboarding | Configures tech stack (`30-tech-stack.mdc`) and creates `docs/concept/`, `docs/ideas.md`, `docs/backlog.md`, and `docs/roadmap.md`. |
| **`/l1-idea`** | Idea Flow | Refines an idea (`grilling`) and saves it to the **Idea Bank** (`docs/ideas.md`) with `IDEA-NNN`, priority, and `📋 unrealized` status. |
| **`/l1-feature`** | Feature & Spec Flow | Takes `IDEA-NNN`, writes a full spec (`docs/specs/FEAT-NNN-<slug>/`), slices steps `FEAT-NNN.01..99`, and adds to **Backlog** (`docs/backlog.md`). |
| **`/l1-planning`** | Planning Flow | Updates the **Roadmap** (`docs/roadmap.md` — Single Source of Truth): schedules sprints (`Delivery Queue`) and idea grooming (`Discovery Queue`). |
| **`/l1-task`** | Task & Doctor Flow | Executes the next scheduled task from the Roadmap (`Plan → Implement → Self-check → Summary`), ending every sprint with mandatory **`TASK-NN.99` (`Doctor Checklist`)**. |
| **`/l1-hotfix`** | Hotfix Flow | The only Roadmap exception: reproduces a critical bug (`RED → GREEN`), fixes it with minimal diff (`ponytail`), and logs `HOTFIX-NNN` in `docs/backlog.md`. |
| **`/l1-evo`** | Framework Evolution | Dogfoods improvements to `L1DDER` itself following [`evolution/METHODOLOGY-RULES.md`](evolution/METHODOLOGY-RULES.md), updating [`WORKLOG-CHANGELOG.md`](evolution/WORKLOG-CHANGELOG.md) and [`HANDOFF.md`](evolution/HANDOFF.md). |

---

## 📖 Where to Start (Human Guide)

Start with **[`user-guide/`](user-guide/README.md)**:
- **[`user-guide/README.md`](user-guide/README.md)** — Visual map of all flows and the nested ID chain in 3 minutes.
- **[`user-guide/01-QUICKSTART.md`](user-guide/01-QUICKSTART.md)** — `npx l1dder init` setup and a real chat walkthrough from idea to completed sprint.
- **[`user-guide/02-FLOWS-IN-DETAIL.md`](user-guide/02-FLOWS-IN-DETAIL.md)** — Deep dive into every `/l1-*` button and the 4-block `Doctor Checklist`.
- **[`user-guide/03-CHEATSHEET.md`](user-guide/03-CHEATSHEET.md)** — One-page cheatsheet & FAQ.

---

## Terminal CLI Commands & Skills Manifest (`l1dder/skills.json`)

`l1dder/` ships with **20 bundled skills** out of the box (7 `/l1-*` workflow skills + 4 `DietrichGebert/ponytail` skills + 9 `mattpocock/skills` engineering skills: `grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `retro`, `prototype`, `writing-for-agents`), tracked in **`l1dder/skills.json`**.

| Command | Description |
|---------|-------------|
| `npx l1dder init` | Installs `l1dder/`, `skills.json`, all 20 bundled skills, and agent files (`--lang en\|ru`, `--agents cursor,claude,codex`, `--yes`). |
| `npx l1dder@latest update` | **Updates the entire framework** (`Core` rules, templates, guides & skills) while **preserving** your project stack (`30-tech-stack.mdc`, `40-skills-router.mdc`, `stack` in `skills.json`) and `docs/`. |
| `npx l1dder@latest update --skills` | **Updates ONLY skills** (`l1dder/skills/**` and agent skill folders), leaving rules and templates untouched. |
| `npx l1dder skills list` | Lists all skills declared in `l1dder/skills.json` (`l1dder`, `core`, `stack`). |
| `npx l1dder skills add <repo> --skill <name>` | Adds a stack skill to `l1dder/skills.json`, downloads it into `l1dder/skills/`, and syncs to all agents. |
| `npx l1dder doctor` | Verifies `l1dder/` and `docs/` structure integrity. |
