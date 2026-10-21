---
layout: home

hero:
  name: "L1DDER"
  text: "Spec-Driven & Roadmap-Gated AI Development"
  tagline: "Control your entire product lifecycle with 6 slash commands (/l1-*) and 'ok' approvals. Zero hidden state.yml — pure Markdown documents with end-to-end ID Passports. Works with Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, and Cline."
  actions:
    - theme: brand
      text: "⚡ 3-Minute Quickstart"
      link: /en/quickstart
    - theme: alt
      text: "🗺 Visual Map & Overview"
      link: /en/guide
    - theme: alt
      text: "🤖 AI Agents & CLI"
      link: /en/agents-cli

features:
  - icon: 🎯
    title: "Zero Hidden State"
    details: "No brittle state.yml files or blocking git hooks. Your Markdown documents (docs/roadmap.md, docs/backlog.md, docs/ideas.md) are the single source of truth."
  - icon: 🔗
    title: "End-to-End Nested ID Passports"
    details: "Every artifact stores all parent IDs in its header (IDEA-001 → FEAT-001 → SPRINT-01 → TASK-01.01..99). Even small fast models never lose track."
  - icon: 🩺
    title: "Mandatory Sprint Doctor Checklist"
    details: "Every sprint ends with task TASK-NN.99: full CI, two-axis code review, E2E verification, mandatory Living Docs Sync, and Human UAT."
  - icon: ✂️
    title: "Built-in Ponytail + Matt Pocock Skills"
    details: "Ships out of the box with ponytail (Lazy Senior Dev), grilling (decision-tree interviews), codebase-design (Deep Modules), and vertical TDD at seams."
  - icon: 🤖
    title: "1-Second Multi-Agent Installer"
    details: "Run npx l1dder init to install l1dder/ and configure native rules, commands, and skills for Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, and Cline."
  - icon: 🌍
    title: "Full EN & RU Localization"
    details: "All rules, 11 skills, templates, and human guides ship in both English (--lang en) and Russian (--lang ru)."
---

## Setup: Via Your AI Agent Chat or Terminal

### 🤖 Option 1: Ask Your AI Agent to Install It for You (Zero Terminal)
Copy and paste this single line into **Cursor, Claude Code, or Codex** chat:

```text
Install the L1DDER framework in this project by running `npx l1dder@latest init --lang en --yes`, then immediately start onboarding from `l1dder/skills/l1-onboard/SKILL.md`
```

The agent will run `npx l1dder@latest init --lang en --yes`, read the agent instructions from CLI stdout, and immediately start Step 1 of project onboarding!

### 💻 Option 2: Run in Terminal

```bash
# Interactive setup (choose language en/ru and your AI agents)
npx l1dder init

# Or non-interactive one-liner (defaults to Cursor, Claude Code & Codex):
npx l1dder init --lang en --yes
```

Then open your AI agent chat and type `/l1-onboard`.
