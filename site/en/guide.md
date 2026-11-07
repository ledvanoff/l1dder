# 🚀 L1DDER — Human Guide (Vibe-Coder Friendly)

Welcome to **L1DDER**!
This guide is written in plain language. Even if you don't write code by hand and build products through chat with AI coding agents (**Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, Cline**), in 3 minutes you'll see how to build complex, reliable software that doesn't fall apart on day three.

---

## Guide Navigation

| Document | What It Covers | Read Time |
|----------|----------------|:---------:|
| **[0. Main Map (You are here)](/en/guide)** | Core idea, **visual map of all flows**, nested ID chain, and the 3 control screens | 3 min |
| **[1. Quickstart & Live Walkthrough](/en/quickstart)** | One-command setup `npx l1dder init` + real chat walkthrough from idea to finished sprint | 5 min |
| **[2. Deep Dive into `/l1-*` Commands](/en/flows)** | Inside `/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task` (`Doctor Checklist`), `/l1-hotfix`, `/l1-chore`, and `/l1-fast` | 7 min |
| **[3. One-Page Cheatsheet & FAQ](/en/cheatsheet)** | "What to press when..." table, all statuses, and FAQ | 2 min |

---

## Why `L1DDER`?

In ordinary vibe-coding, you ask *"Build me a dashboard"*, the AI writes 1,000 lines of code, and three days later adding a single button breaks half the app because the agent forgot yesterday's context.

In **L1DDER**, roles are strictly separated:
- 👤 **You are the Product Owner & Final Reviewer.** You bring ideas, set priorities, reply **"ok"** at decision checkpoints, and test the finished result.
- 🤖 **The AI Agent is your Engineering Team with a Built-in Tech Lead.** It asks smart decision-tree questions with recommendations, writes specs, writes lean code (`ponytail`), runs tests, and keeps documentation in sync.

You control the entire lifecycle with a few **slash commands**:
0. `/l1-onboard` — run once at project start to work out the concept stage by stage, then the tech stack and `docs/`.
1. `/l1-idea` — capture and refine an idea into the Idea Bank.
2. `/l1-feature` — turn an idea into a technical specification and slice it into Backlog tasks.
3. `/l1-planning` — order the Roadmap queue (what we build now vs. next), or reject the current sprint and roll back its changes.
4. `/l1-task` — tell the agent "Execute the next task on the Roadmap!".
5. `/l1-hotfix` — emergency button "Fix this bug right now bypassing the queue!".
6. `/l1-chore` — changes to the project itself, not to what your users see: git rules (how branches and commits are named, what is checked before a push), automatic checks in CI, library updates, the `Makefile`, rules for the AI agent. No idea, spec or sprint needed: the agent suggests, you say "ok".
7. `/l1-fast` — quickly build **a small product feature** when no sprint is active (**strictly human-invoked — the agent is forbidden from running `/l1-fast` on its own initiative**). You reply "ok" only twice (before the code and after every check and manual testing), and the agent writes the code, runs every check, and then records the idea, spec, sprint, and tasks marked `mode: /l1-fast`.
*(Plus `/l1-evo` to evolve the methodology itself or save `HANDOFF.md`).*

---

## 🗺 Visual Map of `L1DDER`: Core Chains

```mermaid
flowchart TB
    classDef human fill:#FFF3CD,stroke:#D97706,stroke-width:2px,color:#1F2937
    classDef ideaFlow fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    classDef featFlow fill:#E0E7FF,stroke:#4F46E5,stroke-width:2px,color:#1E1B4B
    classDef planFlow fill:#FEF3C7,stroke:#B45309,stroke-width:3px,color:#78350F
    classDef taskFlow fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef doctorFlow fill:#F3E8FF,stroke:#9333EA,stroke-width:2px,color:#3B0764
    classDef hotfixFlow fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#7F1D1D
    classDef choreFlow fill:#E5E7EB,stroke:#4B5563,stroke-width:2px,color:#111827
    classDef fastFlow fill:#FEF9C3,stroke:#CA8A04,stroke-width:2px,color:#713F12

    YOU(["👤 YOU (Product Owner)<br/>Control via /l1-* commands & 'ok'"]):::human

    subgraph CHAIN1["💡 1. IDEA CHAIN — /l1-idea"]
        direction LR
        I1["You share a raw thought"]:::ideaFlow --> I2["Agent asks grilling questions<br/>❓Q1 ➡️Recommendation"]:::ideaFlow
        I2 -->|"You: 'ok'"| I3[("📁 Idea Bank (docs/ideas.md)<br/>ID: IDEA-001<br/>Status: 📋 unrealized")]:::ideaFlow
    end

    subgraph CHAIN2["📐 2. FEATURE & SPEC CHAIN — /l1-feature"]
        direction LR
        F1["Take IDEA-001<br/>from Idea Bank"]:::featFlow --> F2["Agent writes Spec<br/>docs/specs/FEAT-001-slug/<br/>& slices FEAT-001.01..99"]:::featFlow
        F2 -->|"You: 'ok'"| F3[("📋 Backlog & Task Tracker (docs/backlog.md)<br/>ID: FEAT-001 (linked to IDEA-001)<br/>Status: 📋 in-backlog")]:::featFlow
    end

    subgraph CHAIN3["🔒 3. PLANNING CHAIN — /l1-planning"]
        direction LR
        P1["Agent inspects Backlog<br/>& Idea Bank"]:::planFlow --> P2["Proposes Sprint Queue<br/>& Idea Discovery Queue"]:::planFlow
        P2 -->|"You: 'ok'"| P3[("🗺 ROADMAP (docs/roadmap.md)<br/>SINGLE SOURCE OF TRUTH!<br/>Assigns SPRINT-01 & TASK-01.01..99")]:::planFlow
    end

    subgraph CHAIN4["⚙️ 4. TASK & SPRINT CHAIN — /l1-task"]
        direction TB
        T1["Regular Tasks: TASK-01.01, TASK-01.02...<br/>1. Plan (⛔ STOP — You: 'ok')<br/>2. Code + Tests<br/>3. Self-check (⛔ STOP — You: 'ok')<br/>4. Summary report (summary.md)"]:::taskFlow
        T2["🩺 MANDATORY SPRINT FINALE: TASK-01.99 (Doctor Checklist)<br/>1. Full CI & code cleanup<br/>2. Agent runs E2E verification<br/>3. Agent MANDATORILY syncs living docs & rules<br/>4. Gives you Human UAT checklist (⛔ STOP — You: 'ok')"]:::doctorFlow
        T1 --> T2
    end

    subgraph CHAIN5["🚑 5. HOTFIX EXCEPTION — /l1-hotfix"]
        direction LR
        H1["Urgent bug!<br/>Bypass Roadmap"]:::hotfixFlow --> H2["Agent reproduces bug (RED),<br/>shows fix plan (You: 'ok'),<br/>fixes (GREEN) & logs HOTFIX-001"]:::hotfixFlow
    end

    subgraph CHAIN6["🧹 6. CHANGE THE PROJECT ITSELF — /l1-chore"]
        direction LR
        C1["Change git rules, CI,<br/>libraries, Makefile"]:::choreFlow --> C2["Agent checks the product stays unchanged,<br/>suggests an option (You: 'ok'),<br/>makes the change & logs CHORE-001"]:::choreFlow
    end

    subgraph CHAIN7["⚡ 7. FAST MODE (when no sprint is active) — /l1-fast"]
        direction LR
        FM1["Small product feature<br/>(strictly human-invoked)"]:::fastFlow --> FM2["Clarify (You: 'ok') → reserve in Roadmap →<br/>code + all checks (You: 'ok') →<br/>all documents marked mode: /l1-fast"]:::fastFlow
    end

    YOU -->|"/l1-idea"| CHAIN1
    I3 -->|"/l1-feature"| CHAIN2
    F3 -->|"/l1-planning"| CHAIN3
    I3 -.->|"Discovery Queue"| CHAIN3
    P3 -->|"Roadmap Gate: strictly in queue order!"| CHAIN4
    T2 -->|"Cascades closure:<br/>SPRINT-01 ✅ → FEAT-001 ✅ → IDEA-001 ✅"| P3
    YOU -->|"/l1-hotfix"| CHAIN5
    YOU -->|"/l1-chore"| CHAIN6
    YOU -->|"/l1-fast"| CHAIN7
```

---

## 🔗 End-to-End Linked Entities (ID Chain): Why the Agent Never Loses Context

In `L1DDER`, **all entities are linked across an end-to-end ID chain**. Every document stores all of its parent IDs in its header **ID Passport**:

```mermaid
flowchart LR
    IDEA["💡 IDEA-001<br/>(in docs/ideas.md)<br/>Idea"] --> FEAT["📐 FEAT-001<br/>(in docs/backlog.md &<br/>docs/specs/FEAT-001-...)<br/>Feature Spec"]
    FEAT --> STEPS["🧩 FEAT-001.01 .. .99<br/>(pre-sprint steps)"]
    STEPS -->|"/l1-planning"| SPRINT["🏃 SPRINT-01<br/>(in docs/roadmap.md &<br/>docs/sprints/SPRINT-01-...)"]
    SPRINT --> TASKS["✅ TASK-01.01 .. TASK-01.02<br/>(regular sprint tasks)"]
    SPRINT --> DOCTOR["🩺 TASK-01.99<br/>(Mandatory Doctor Checklist)"]
```

---

## 📺 Three Control Screens in `docs/`

| File | Plain-Language Purpose | Managed By |
|------|------------------------|------------|
| **`docs/ideas.md`** | **💡 Idea Bank.** All your ideas with priorities (`P0..P3`) and statuses (`📋 unrealized`, `🚧 in-progress`, `✅ realized`, `❌ rejected`). | `/l1-idea`, `/l1-fast` |
| **`docs/backlog.md`** | **📋 Backlog & Task Tracker.** All specified features (`FEAT-001`), their sprints, tasks, the emergency hotfix log (`HOTFIX-001`), and the chore log (`CHORE-001`). | `/l1-feature`, `/l1-task`, `/l1-fast`, `/l1-hotfix`, `/l1-chore` |
| **`docs/roadmap.md`** | **🔒 Roadmap (Source of Truth).** Which sprint is active right now (`1 CURRENT`), which is `2 NEXT`, and which idea is next for spec grooming. | `/l1-planning`, `/l1-fast` |

---

👉 **Next:** open **[01-QUICKSTART.md](/en/quickstart)** for a live step-by-step chat walkthrough!
