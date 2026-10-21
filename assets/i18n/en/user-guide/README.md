# 🚀 L1DDER — Human Guide (Vibe-Coder Friendly)

Welcome to **L1DDER**!
This guide is written in plain language. Even if you don't write code by hand and build products through chat with AI coding agents (**Cursor, Claude Code, Codex, Windsurf, Copilot, OpenCode, Cline**), in 3 minutes you'll see how to build complex, reliable software that doesn't fall apart on day three.

---

## Guide Navigation

| Document | What It Covers | Read Time |
|----------|----------------|:---------:|
| **[0. Main Map (You are here)](./README.md)** | Core idea, **visual map of all flows**, nested ID chain, and the 3 control screens | 3 min |
| **[1. Quickstart & Live Walkthrough](./01-QUICKSTART.md)** | One-command setup `npx l1dder init` + real chat walkthrough from idea to finished sprint | 5 min |
| **[2. Deep Dive into `/l1-*` Commands](./02-FLOWS-IN-DETAIL.md)** | Inside `/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task` (`Doctor Checklist`), and `/l1-hotfix` | 7 min |
| **[3. One-Page Cheatsheet & FAQ](./03-CHEATSHEET.md)** | "What to press when..." table, all statuses, and FAQ | 2 min |

---

## Why `L1DDER`?

In ordinary vibe-coding, you ask *"Build me a dashboard"*, the AI writes 1,000 lines of code, and three days later adding a single button breaks half the app because the agent forgot yesterday's context.

In **L1DDER**, roles are strictly separated:
- 👤 **You are the Product Owner & Final Reviewer.** You bring ideas, set priorities, reply **"ok"** at decision checkpoints, and test the finished result.
- 🤖 **The AI Agent is your Engineering Team with a Built-in Tech Lead.** It asks smart decision-tree questions with recommendations, writes specs, writes lean code (`ponytail`), runs tests, and keeps documentation in sync.

You control the entire lifecycle with **6 slash commands**:
0. `/l1-onboard` — run once at project start to configure your tech stack and create `docs/`.
1. `/l1-idea` — capture and refine an idea into the Idea Bank.
2. `/l1-feature` — turn an idea into a technical specification and slice it into Backlog tasks.
3. `/l1-planning` — order the Roadmap queue (what we build now vs. next).
4. `/l1-task` — tell the agent "Execute the next task on the Roadmap!".
5. `/l1-hotfix` — emergency button "Fix this bug right now bypassing the queue!".
*(Plus `/l1-evo` to evolve the methodology itself or save `HANDOFF.md`).*

---

## 🗺 Visual Map of `L1DDER`: 5 Core Chains

```mermaid
flowchart TB
    classDef human fill:#FFF3CD,stroke:#D97706,stroke-width:2px,color:#1F2937
    classDef ideaFlow fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    classDef featFlow fill:#E0E7FF,stroke:#4F46E5,stroke-width:2px,color:#1E1B4B
    classDef planFlow fill:#FEF3C7,stroke:#B45309,stroke-width:3px,color:#78350F
    classDef taskFlow fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef doctorFlow fill:#F3E8FF,stroke:#9333EA,stroke-width:2px,color:#3B0764
    classDef hotfixFlow fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#7F1D1D

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

    YOU -->|"/l1-idea"| CHAIN1
    I3 -->|"/l1-feature"| CHAIN2
    F3 -->|"/l1-planning"| CHAIN3
    I3 -.->|"Discovery Queue"| CHAIN3
    P3 -->|"Roadmap Gate: strictly in queue order!"| CHAIN4
    T2 -->|"Cascades closure:<br/>SPRINT-01 ✅ → FEAT-001 ✅ → IDEA-001 ✅"| P3
    YOU -->|"/l1-hotfix"| CHAIN5
```

---

## 🔗 Nested ID Chain: Why the Agent Never Loses Context

Every document stores all parent IDs in its header **ID Passport** — like nested Russian dolls:

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
| **`docs/ideas.md`** | **💡 Idea Bank.** All your ideas with priorities (`P0..P3`) and statuses (`📋 unrealized`, `🚧 in-progress`, `✅ realized`, `❌ rejected`). | `/l1-idea` |
| **`docs/backlog.md`** | **📋 Backlog & Task Tracker.** All specified features (`FEAT-001`), their sprints, tasks, and the emergency hotfix log (`HOTFIX-001`). | `/l1-feature`, `/l1-task`, `/l1-hotfix` |
| **`docs/roadmap.md`** | **🔒 Roadmap (Source of Truth).** Which sprint is active right now (`1 CURRENT`), which is `2 NEXT`, and which idea is next for spec grooming. | `/l1-planning` |

---

👉 **Next:** open **[01-QUICKSTART.md](./01-QUICKSTART.md)** for a live step-by-step chat walkthrough!
