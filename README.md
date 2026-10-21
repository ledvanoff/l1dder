# L1DDER — Spec-Driven & Roadmap-Gated AI Development Framework

[![npm version](https://img.shields.io/npm/v/l1dder.svg)](https://www.npmjs.com/package/l1dder)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages%20(RU%20%2F%20EN)-blue)](https://ledvanoff.github.io/l1dder/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> 🌍 **Documentation Site (with visual diagrams):** [Русская версия](https://ledvanoff.github.io/l1dder/) | [English Version](https://ledvanoff.github.io/l1dder/en/)

**L1DDER** is a self-contained Spec-Driven & Roadmap-Gated AI development framework (**Zero Hidden State**) for **Cursor, Claude Code, OpenAI Codex, Windsurf, GitHub Copilot, OpenCode, and Cline**.

- **Zero Hidden State:** No brittle `state.yml` state machines or blocking git hooks. Your Markdown documents in `docs/` (`ideas.md`, `backlog.md`, `roadmap.md`) with traceable **ID Passports** are the single source of truth.
- **6 Slash Commands (`/l1-*`):** Control the entire product lifecycle with `/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task`, and `/l1-hotfix` + `"ok"` approvals.
- **Mandatory Sprint Doctor (`TASK-NN.99`):** Every sprint ends with a 4-block `Doctor Checklist` (CI, 2-axis code review, Agent E2E verification, mandatory Living Docs Sync, and Human UAT).
- **Built-in Engineering Discipline:** Ships with `ponytail` (*Lazy Senior Dev* mode, `shortcut:` ledger, 2-line `Skipped / Risk` footer) and practices from `mattpocock/skills` (`grilling`, `domain-modeling`, `codebase-design` Deep Modules, vertical `tdd` at seams, `diagnosing-bugs`).

---

## ⚡ Quick Start (Install via AI Agent or Terminal)

### 🤖 Option 1: Ask Your AI Agent to Install It for You (Zero Terminal)
Copy and paste this single line into **Cursor, Claude Code, OpenAI Codex, Windsurf, or Copilot** chat:

**Русская версия:**
```text
Установи в этот проект фреймворк L1DDER командой `npx l1dder@latest init --lang ru --yes`, а затем сразу начни онбординг по `l1dder/skills/l1-onboard/SKILL.md`
```

**English version:**
```text
Install the L1DDER framework in this project by running `npx l1dder@latest init --lang en --yes`, then immediately start onboarding from `l1dder/skills/l1-onboard/SKILL.md`
```

### 💻 Option 2: Install via Terminal (1 Second)

```bash
# Interactive setup (selects language ru/en and your AI coding agents):
npx l1dder init

# Or non-interactive one-liner (defaults to Cursor, Claude Code & Codex):
npx l1dder init --lang ru --yes
```

Then open your AI agent chat and run `/l1-onboard`.

---

## 🤖 Supported AI Agents (`--agents`)

| Agent | Flag | Configured Files |
|-------|:----:|------------------|
| **Cursor** | `cursor` | `.cursor/rules/l1dder/*.mdc` + `.cursor/skills/*` + `AGENTS.md` |
| **Claude Code** | `claude` | `CLAUDE.md` + `.claude/rules/l1dder/*.md` + `.claude/commands/*` + `.claude/skills/*` |
| **OpenAI Codex** | `codex` | `AGENTS.md` + `.agents/skills/*` |
| **Windsurf** | `windsurf` | `.windsurf/rules/l1dder.md` + `.windsurf/workflows/*` + `AGENTS.md` |
| **GitHub Copilot** | `copilot` | `.github/copilot-instructions.md` + `.github/prompts/*.prompt.md` |
| **OpenCode** | `opencode` | `AGENTS.md` + `.opencode/commands/*` + `.agents/skills/*` |
| **Cline / Roo Code** | `cline` | `.clinerules/l1dder.md` + `.roo/rules/l1dder.md` + `AGENTS.md` |
| **All Agents** | `all` | Installs for all supported agents at once |

---

## 🎮 The 6 Slash Commands

| Command | Flow | What It Does |
|---------|------|--------------|
| **`/l1-onboard`** | Onboarding | Configures `30-tech-stack.mdc` & `Makefile` and initializes `docs/`. |
| **`/l1-idea`** | Idea Bank | Refines an idea (`grilling`) and records `IDEA-NNN` in `docs/ideas.md`. |
| **`/l1-feature`** | Feature Spec | Creates `docs/specs/FEAT-NNN-<slug>/`, slices `FEAT-NNN.01..99`, updates `docs/backlog.md`. |
| **`/l1-planning`** | Roadmap | Updates `docs/roadmap.md` (`Delivery Queue` & `Discovery Queue`) and creates `SPRINT-NN`. |
| **`/l1-task`** | Task & Doctor | Executes the next task from `docs/roadmap.md` (Two-Approval Rule) and mandatory `TASK-NN.99` (`Doctor Checklist`). |
| **`/l1-hotfix`** | Hotfix | Reproduces a bug (`RED → GREEN`), applies minimal fix (`ponytail`), logs `HOTFIX-NNN` in `docs/backlog.md`. |

---

## 🛠 CLI Commands & Skills Manifest (`l1dder/skills.json`)

All skills are managed via **`l1dder/skills.json`** (like `package.json` for AI Agent Skills):
- **20 Bundled Skills Out-of-the-Box:** 7 `/l1-*` workflow skills + 4 `DietrichGebert/ponytail` skills + 9 `mattpocock/skills` engineering skills (`grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `retro`, `prototype`, `writing-for-agents`).
- **Project Stack Skills (`stack`):** configured during `/l1-onboard` or added via CLI.

```bash
# Install in a new or existing project (defaults to Cursor, Claude Code & Codex):
npx l1dder init [--lang ru|en] [--agents cursor,claude,codex] [--yes]

# Update the ENTIRE framework when a new version of l1dder comes out (preserves 30-tech-stack.mdc & stack skills):
npx l1dder@latest update

# Update ONLY skills (leaves rules, templates, and docs untouched):
npx l1dder@latest update --skills

# Manage skills in l1dder/skills.json:
npx l1dder skills list
npx l1dder skills add <owner/repo> --skill <skill1,skill2>
npx l1dder skills install
npx l1dder doctor
```

---

## License

MIT. See [LICENSE](LICENSE).
