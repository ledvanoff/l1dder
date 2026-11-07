---
name: l1-onboard
description: Onboards a new (from-scratch) or existing (existing-code) project on L1DDER stage by stage, one file per stage: idea, vision, architecture, data model, then the tech stack (l1dder/rules/30-tech-stack.mdc, skills.json, Makefile), then the Idea Bank, backlog and roadmap. Each stage runs short grilling rounds with recommendations and ends on a human "ok". Use when the user invokes /l1-onboard or starts a project after npx l1dder init.
---

# L1DDER — Flow 0: Project Onboarding by Stages (`/l1-onboard`)

> **MODEL INSTRUCTION:** Execute steps 1 → 2 → 3 → 4. The concept is worked out one stage at a time: every stage runs the same loop from STEP 3 and ends on a `⛔ STOP` until an explicit "ok". The stack is chosen only at stage 5, after the architecture and the data model.

---

## STEP 1: Find Where to Start

1. If the project already has a filled-in `docs/roadmap.md`, show a short summary of the active sprint (`1 (CURRENT)`), the next task `TASK-NN.MM` and the next idea in the `Discovery Queue`, and suggest `/l1-task`, `/l1-feature` or `/l1-planning`. Onboarding ends here.
2. Detect the mode:
   - **`existing-code`**: the project has source code (`src/`, `app/`, `packages/`, `package.json`, `pyproject.toml`, `go.mod`, etc.).
   - **`from-scratch`**: the project is empty or holds only notes such as `concept.md` and `README.md`. Read them as the primary context.
3. In `existing-code` mode the primary source of facts is the code. Read instruction files such as `CLAUDE.md`, `AGENTS.md` (outside the `l1dder:begin` block) and `.cursor/rules/`, including ones made by an agent's `/init`, only as a secondary source, and change nothing in them. If they disagree with the code, rely on the code and show the mismatch to the user.
4. Find the first unfinished stage in the STEP 2 table: a stage is finished when all its files are filled in. A template left by `npx l1dder init` (for example `30-tech-stack.mdc`) and a file that holds only a `## Notes from other stages` section count as unfinished. Start at the first unfinished stage and do not repeat finished ones.
5. Read `l1dder/METHODOLOGY.md` and the templates in `l1dder/templates/concept/`.

---

## STEP 2: Onboarding Stages

| Stage | Stage files | What the questions cover | Skills (read with `Read` at the start of the stage) |
|-------|-------------|--------------------------|-----------------------------------------------------|
| 1. Idea | `docs/concept/idea.md` | What the product is, who it is for, what problem it solves, MVP scope, example user actions | `grilling`, `domain-modeling`, `prototype` (if the behaviour is hard to pin down in words) |
| 2. Vision | `docs/concept/vision.md` | The system as a whole, roles, scenarios, principles | `grilling`, `domain-modeling`, `prototype` (if a screen or flow sketch helps) |
| 3. Architecture | `docs/concept/architecture.md`; `docs/concept/integrations.md` and `docs/concept/api-contracts.md` only if needed | Components and layers, data flows, deep modules and seams, external systems and APIs | `codebase-design` (and its `DESIGN-IT-TWICE.md`), `domain-modeling` (and its `ADR-FORMAT.md`), `ponytail` |
| 4. Data model | `docs/concept/data-model.md` | Entities, relations, storage and config schemas | `domain-modeling`, `codebase-design` |
| 5. Stack | `l1dder/rules/30-tech-stack.mdc`, `l1dder/rules/40-skills-router.mdc`, `l1dder/skills.json` (`"stack"` section), `Makefile` | Language and platform, frameworks, data storage, folder layout, tests and linter, `make` targets | `ponytail`, `tdd`, `writing-for-agents` (and any already installed stack skills) |
| 6. Idea Bank and roadmap | `docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`, `docs/README.md` | First `IDEA-NNN` ideas, their priorities and the order to work them out | `grilling` |

Stage specifics:
- **Stage 3:** ask whether the system has external integrations and APIs. If not, do not create `integrations.md` and `api-contracts.md`. Record significant decisions as `docs/adrs/ADR-NNNN-<slug>.md`.
- **Stage 5:** derive the stack from `architecture.md` and `data-model.md`: the platform and what the project already has come first. In `existing-code` mode the stack is a fact: read it from the configs (`package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Makefile`) and the folder layout instead of choosing it again. After "ok", fill in the Technologies column of `architecture.md` and run `npx l1dder skills install` and `npx l1dder sync`.
- **Stage 6:** write ideas with the `l1dder/templates/ideas/ideas-template.md` template and the status `📋 unrealized`. In `existing-code` mode, what already works can be marked `✅ realized`. Create the backlog, the roadmap and the `docs/README.md` navigator from the `l1dder/templates/` templates.

---

## STEP 3: The Stage Loop (the same for all six)

1. **Bearings.** Start every message of a stage with the line `Stage N of 6: <name>, round M`.
2. **Preparation.** Read the stage skills from the table and any notes already in its files. In `existing-code` mode, draft from the code first and ask only about what the code does not show.
3. **Question round.** Ask up to 7 questions about this stage in the `grilling` format: each with fact-based options and your recommendation that an "ok" accepts. Find facts in code and files yourself; ask the user only for decisions.
4. **Answer review.** Say briefly what is now clear, what is worth strengthening and what is still unclear. If the answer holds facts for another stage, offer to record them, for example "I suggest adding this to `architecture.md`". After "ok", add the note to the `## Notes from other stages` section of that file right away.
5. **Choice.** End every round with the question "Move on or another round?" and your recommendation: what is still unclear and whether another round is needed. There are as many rounds as the user decides.
6. **Draft.** When the user chooses to move on, show a draft of the stage files and ask: *"Approve `<stage files>` (ok / edits)?"*
7. ⛔ **STOP:** wait for "ok" (do not write the stage files before "ok"). Then write the stage files: move the notes from the `## Notes from other stages` section to where they belong and remove the section. Then move to the next stage from point 1.

---

## STEP 4: Onboarding Exit Gate

Check that the files of all six stages are in place (`integrations.md` and `api-contracts.md` only if you decided to create them), and tell the user:
- *"L1DDER onboarding is complete: the concept, the stack and the `docs/` base are ready."*
- *"Next step: run `/l1-feature IDEA-001` to work out the first feature spec (or `/l1-idea` to add more ideas)."*
