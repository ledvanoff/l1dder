# Glossary (L1DDER)

Core terms and status models of the **L1DDER** framework in workflow order.

---

## Concept (`docs/concept/`)

Long-term project foundation: what is being built, for whom, and how it is architected (`idea.md`, `vision.md`, `architecture.md`, `data-model.md`, `integrations.md`, `api-contracts.md`).
Created during `/l1-onboard` and **mandatorily synchronized at the end of every sprint** during `TASK-NN.99` (`Doctor Checklist`).

---

## Concept Phase & Onboarding Stages (`/l1-onboard`)

- **Concept phase** — working out `docs/concept/` during onboarding, before the Idea Bank and features. Not to be confused with the `Discovery Queue`, the queue of ideas to turn into specs in `docs/roadmap.md`.
- **Concept stage** — working out one onboarding file in rounds of up to 7 questions, ending with a draft and an "ok". There are six stages: idea, vision, architecture, data model, stack, Idea Bank and roadmap.
- **Answer review** — the agent's reaction to the human's answers: what is now clear, what is worth strengthening, what is still unclear and what belongs in another stage's file.

---

## Idea Bank (`docs/ideas.md`) & `IDEA-NNN`

Single registry of all product and technical ideas, managed via **`/l1-idea`**.
Statuses:
- `📋 unrealized` — recorded in the Idea Bank, waiting for `/l1-feature`.
- `🚧 in-progress` — linked to a feature (`FEAT-NNN`) in `docs/backlog.md` and/or active sprints.
- `✅ realized` — all linked features (`FEAT-NNN`) are `✅ realized`.
- `❌ rejected` — rejected (reason recorded in card).

---

## Feature (`FEAT-NNN`) & Specification (`docs/specs/FEAT-NNN-<slug>/`)

A functional unit grown from an `IDEA-NNN` via **`/l1-feature`**:
1. Spec folder `docs/specs/FEAT-NNN-<slug>/` (`requirements.md`, `design.md`, `tasks.md`).
2. Backlog entry in `docs/backlog.md` with statuses:
   - `📝 drafting` → `📋 in-backlog` → `🗓 scheduled` → `🚧 in-progress` → `✅ realized` (or `❌ rejected`).

---

## Backlog & Task Tracker (`docs/backlog.md`)

Operational tracker containing:
1. **Feature Registry (`FEAT-NNN`)**
2. **Feature Decomposition, Sprints & Tasks (`SPRINT-NN` & `TASK-NN.MM`)**
3. **Hotfix Log (`HOTFIX-NNN`)**
4. **Chore Log (`CHORE-NNN`)** — one row per change to the project itself made via `/l1-chore`

---

## Roadmap (`docs/roadmap.md`) & `Roadmap Gate`

**Single Source of Truth** for work ordering, managed via **`/l1-planning`**:
1. **Delivery Queue:** strict execution order for sprints (`SPRINT-NN`).
2. **Discovery Queue:** strict grooming order for ideas (`IDEA-NNN`).

**Roadmap Gate:** no feature or task may be executed in `/l1-task` unless it sits at position `1 (CURRENT)` in `docs/roadmap.md`. Exceptions: `/l1-hotfix` (an urgent product bug), `/l1-chore` (changes to the project itself that leave the product unchanged), and `/l1-fast` (a small product feature — **strictly human-invoked**, forbidden for the agent on its own initiative, and only while position `1 (CURRENT)` is empty).

---

## Sprint (`SPRINT-NN`) & `Doctor Checklist` (`TASK-NN.99`)

An iterative delivery unit stored in `docs/sprints/SPRINT-NN-<slug>/README.md`.
Every sprint **must** end with task **`TASK-NN.99: Sprint Hygiene & Doctor Checklist`** (`tasks/TASK-NN.99-doctor/`) covering 4 blocks:
1. **Code & Repo Doctor** (`make ci` + 2-axis `code-review` + `ponytail-audit` + `ponytail-debt`).
2. **Agent E2E Verification** (`make test-e2e` + live verification).
3. **Living Docs Sync & Retro** (updating `docs/concept/*`, `docs/specs/*`, `l1dder/rules/*.mdc`).
4. **Human UAT** (manual acceptance testing by the human before cascading closure).

If the team decides to abandon the active sprint at `1 (CURRENT)`, it is rejected via `/l1-planning`: its code is rolled back with `git revert` without rewriting history, while the sprint and task documents stay as a record with status `❌ rejected`.

---

## Task (`TASK-NN.MM` ↔ `FEAT-NNN.MM`) & Two-Approval Rule

An atomic unit of work inside a sprint executed via **`/l1-task`** with two mandatory stops:
- **STOP #1:** after creating `plan.md` (before writing code).
- **STOP #2:** after running DoD self-check (before writing `summary.md` and closing).

In `/l1-fast`, both stops happen in chat — before the code (`⛔ STOP #1`) and after every check (`⛔ STOP #2`) — while `plan.md` and the other documents are written after the code with `Mode | /l1-fast`.

---

## Hotfix (`HOTFIX-NNN` & `/l1-hotfix`)

An urgent bug fix bypassing `docs/roadmap.md`, executed via **`/l1-hotfix`**: reproduce the bug first (`RED Reproduction Gate`) → confirm a concise fix plan in chat (`⛔ STOP`) → apply the minimal fix (`ponytail`) and pass `make ci` (`GREEN`) → log `HOTFIX-NNN` in section 3 of `docs/backlog.md`.

---

## Chore (`CHORE-NNN` & `/l1-chore`)

A change to **the project itself**, not to what its users see and use: git rules (how branches and commits are named, what is checked before a push), automatic checks in CI, library updates, the `Makefile`, build scripts, tests, rules for the AI agent.
Done via the **`/l1-chore`** skill with no idea, spec or sprint: check that the product stays unchanged → a `CHORE-NNN` card and a single "ok" stop → the change and `make ci` → a row in section 4 of `docs/backlog.md`. If the change alters the product, it is `/l1-task` (or `/l1-fast` when no sprint is active) or `/l1-hotfix` instead.

---

## Fast Mode (`/l1-fast`)

A mode for a small product feature (up to 3 tasks in one sprint, with no new data model, external integration, ADR, or breaking changes) while position `1 (CURRENT)` in `docs/roadmap.md` is empty. **Strictly human-invoked — the agent is forbidden from running `/l1-fast` on its own initiative.**
- If `1 (CURRENT)` is occupied by a regular sprint, `/l1-fast` strictly refuses without changing any files: finish the sprint via `/l1-task` or reject it via `/l1-planning`.
- Instead of writing `plan.md` upfront, both stops happen in chat: `⛔ STOP #1` (what we build, after `grilling` and size assessment) and `⛔ STOP #2` (human acceptance after all checks).
- Right after the first "ok", `IDEA-NNN`, `FEAT-NNN`, and `SPRINT-NN` are reserved at row `1 (CURRENT)` in `docs/roadmap.md` marked `mode: /l1-fast`, and before the second "ok" the agent runs every check from a regular task and `TASK-NN.99` (`tdd`, `make ci`, `ponytail-review`, two-axis `code-review`, `ponytail-audit`, `ponytail-debt`, E2E, docs sync, and `retro`).
- After the second "ok", the full registry chain (`docs/ideas.md`, `docs/backlog.md`, `docs/specs/FEAT-NNN-<slug>/`, `docs/sprints/SPRINT-NN-<slug>/`, `TASK-NN.MM`, and `TASK-NN.99` with `plan.md` and `summary.md`) is written with `| **Mode** | \`/l1-fast\` |` in every document passport.

---

## Entity ID Passport (`ID Passport`)

Mandatory header table in every document (`requirements.md`, `design.md`, `tasks.md`, `SPRINT README.md`, `plan.md`, `summary.md`, `ADR`) storing all parent IDs up to `IDEA-NNN` (`TASK-NN.MM → FEAT-NNN.MM → SPRINT-NN → FEAT-NNN → IDEA-NNN`).

---

## Ponytail (`shortcut:`, `Skipped / Risk`) & Deep Modules (`Seams`)

- **Ponytail ([DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)):** 6-Step Decision Ladder, `// shortcut: <what>, <limit>` markers, and mandatory 2-line `Ponytail skipped / Risk` footer.
- **Deep Modules (`codebase-design`) & Pre-agreed Test Seams (`tdd`) ([mattpocock/skills](https://github.com/mattpocock/skills)):** modules hiding complex logic behind simple interfaces, tested via vertical `RED → GREEN` slices at public seams.
