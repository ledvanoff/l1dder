# ⚡ 1. Quickstart & Live Walkthrough in `L1DDER`

> ⬅️ Back to [Main Map (README.md)](/en/guide) | ➡️ Next: [Flows in Detail (02-FLOWS-IN-DETAIL.md)](/en/flows)

---

## Step 1. Install `L1DDER` in Your Project (30 Seconds)

You don't even have to open a terminal — just paste this single line into your AI agent chat (**Cursor, Claude Code, Codex, Windsurf, Copilot**):

```text
Install the L1DDER framework in this project by running `npx l1dder@latest init --lang en --yes`, then immediately start onboarding from `l1dder/skills/l1-onboard/SKILL.md`
```

Or run it in your project terminal:

```bash
# Interactive setup (asks for language en/ru and your AI agents)
npx l1dder init

# Or non-interactive one-liner (defaults to Cursor, Claude Code & Codex):
npx l1dder init --lang en --yes
```

Then open your agent chat and run:
```text
/l1-onboard
```
The agent detects your project stack (or helps you choose one), configures `l1dder/rules/30-tech-stack.mdc`, and initializes `docs/`.

---

## Step 2. Live Day-to-Day Walkthrough

Suppose we are building a knowledge base web app and you get an idea: *"I want instant article search and tag filtering synced to the URL"*.

### 💬 Scene 1: Capturing the Idea (`/l1-idea`)
- **You:** `/l1-idea I want instant search by article title and tag filtering synced to the URL`
- **Agent:** Checks `docs/ideas.md`, asks one decision-tree question (`❓ Q1 — Multi-tag combination ➡️ Recommendation: AND logic with URL query ?tags=api,auth`), and shows draft card **`IDEA-002`**.
- **You:** `ok` → Saved in `docs/ideas.md` as `📋 unrealized`.

### 💬 Scene 2: Feature Specification (`/l1-feature`)
- **You:** `/l1-feature IDEA-002`
- **Agent:** Proposes **`FEAT-002`** (`requirements.md`, `design.md` with Deep Module `CatalogFilter` and Pre-agreed Test Seams, and `tasks.md` with `FEAT-002.01`, `FEAT-002.02`, and mandatory `FEAT-002.99` Doctor Checklist).
- **You:** `ok` → Spec created in `docs/specs/FEAT-002-catalog-search/`, added to `docs/backlog.md` (`📋 in-backlog`), and `IDEA-002` becomes `🚧 in-progress`.

### 💬 Scene 3: Scheduling on the Roadmap (`/l1-planning`)
- **You:** `/l1-planning`
- **Agent:** Places **`SPRINT-02`** (`FEAT-002` ← `IDEA-002`) at **`1 (CURRENT)`** in `docs/roadmap.md` and assigns `TASK-02.01`, `TASK-02.02`, `TASK-02.99`.
- **You:** `ok` → `docs/roadmap.md` updated and `docs/sprints/SPRINT-02-catalog-search/README.md` created.

### 💬 Scene 4: Executing Tasks & Sprint Doctor (`/l1-task`)
- **You:** `/l1-task`
- **Agent:** Reads `docs/roadmap.md`, writes `plan.md` for `TASK-02.01`, stops at **⛔ STOP #1** (`ok`), implements code & tests, runs self-check, stops at **⛔ STOP #2** (`ok`), writes `summary.md`, and marks `TASK-02.01` as `✅ realized`.
- When regular tasks finish, `/l1-task` runs **`TASK-02.99` (`Doctor Checklist`)**: runs `make ci`, 2-axis review, E2E checks, syncs living docs (`docs/concept/`, `l1dder/rules/`), and gives you a Human UAT checklist. After your `"ok"`, `SPRINT-02`, `FEAT-002`, and `IDEA-002` cascade to `✅ realized`!
