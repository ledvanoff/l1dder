---
name: l1-onboard
description: Initializes a new (from-scratch) or existing (existing-code) project on L1DDER: configures the project tech stack in l1dder/rules/30-tech-stack.mdc and 40-skills-router.mdc, syncs agent rules, and step-by-step creates docs/concept/, docs/ideas.md, docs/backlog.md, and docs/roadmap.md with human "ok" approvals. Use when the user invokes /l1-onboard or starts a project after npx l1dder init.
---

# L1DDER — Flow 0: Project Onboarding & Stack Configuration (`/l1-onboard`)

> **MODEL INSTRUCTION:** Execute this skill strictly step by step (1 → 2 → 3 → 4 → 5). Do not skip steps. At every `⛔ STOP` checkpoint, show the draft to the user and wait for an explicit `"ok"` before writing files.

---

## STEP 1: Detect Mode (`from-scratch` or `existing-code`) & Read Context

1. Inspect the repository:
   - If `docs/roadmap.md` already exists and is populated — show a concise status summary (`1 CURRENT` sprint, next `TASK-NN.MM`, and next idea in `Discovery Queue`) and suggest running `/l1-task`, `/l1-feature`, or `/l1-planning`.
   - If the repository **already has application source code** (`src/`, `app/`, `packages/`, `package.json`, `pyproject.toml`, `go.mod`, etc.) but no `docs/roadmap.md` → select **`existing-code` mode (Reverse-engineering from code)**.
   - If the repository is **empty** (or only has initial notes like `concept.md` / `README.md`) → select **`from-scratch` mode (Greenfield project)**.
2. Read `l1dder/METHODOLOGY.md`, `l1dder/rules/30-tech-stack.mdc`, and `l1dder/rules/40-skills-router.mdc`.

---

## STEP 2: Configure Tech Stack (`30-tech-stack.mdc` + `Makefile`) & `⛔ STOP #1`

1. **In `existing-code` mode:** inspect project configuration files (`package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Makefile`, directory tree) and extract the actual stack.
2. **In `from-scratch` mode:** if the stack is not yet specified, ask 1–2 `grilling` questions (`❓ Q1 — Tech Stack ➡️ Recommendation following ponytail`).
3. Present the proposed stack setup:
   - Stack matrix for `l1dder/rules/30-tech-stack.mdc` (Language, Frontend/UI, Backend/Core, Data, Testing/Linter);
   - Directory structure;
   - `Makefile` targets (`make dev`, `make build`, `make lint`, `make typecheck`, `make test`, `make ci`);
   - Recommended stack skills for `l1dder/skills.json` (section `"stack"`) and `l1dder/rules/40-skills-router.mdc`.
4. ⛔ **STOP #1:** Ask: *"Approve the project stack for `l1dder/rules/30-tech-stack.mdc`, `l1dder/skills.json`, and `Makefile` (ok / edits)?"* and wait.
5. **After `"ok"`:**
   - Write `l1dder/rules/30-tech-stack.mdc`, add stack skills to `"stack"` in `l1dder/skills.json`, and update section 2 of `l1dder/rules/40-skills-router.mdc`.
   - Create or update the root `Makefile`.
   - Run `npx l1dder skills install` and `npx l1dder sync` so all stack skills are downloaded and all configured AI agents receive the updated rules and skills.

---

## STEP 3: Project Concept Foundation (`docs/concept/`) & `⛔ STOP #2`

1. Read templates in `l1dder/templates/concept/`.
2. Draft the core concept documents (in `existing-code` mode — reflecting the current system as-is; in `from-scratch` mode — based on user answers and `grilling`):
   - `docs/concept/idea.md` — product essence, target audience, problem solved, MVP scope.
   - `docs/concept/vision.md` — roles, user scenarios, components, stack, principles.
   - `docs/concept/architecture.md` — layers, Deep Modules, data flows (when ≥2 components exist).
   - `docs/concept/data-model.md` — domain entities and storage/config schemas.
   - `docs/concept/integrations.md` and `docs/concept/api-contracts.md` (if applicable).
3. ⛔ **STOP #2:** Present the concept summary and ask: *"Approve the project concept for `docs/concept/` (ok / edits)?"*
4. **After `"ok"`:** write the approved files in `docs/concept/`.

---

## STEP 4: Initialize Idea Bank (`docs/ideas.md`), Backlog (`docs/backlog.md`) & Roadmap (`docs/roadmap.md`) + `⛔ STOP #3`

1. Read templates `l1dder/templates/ideas/ideas-template.md`, `l1dder/templates/backlog/backlog-template.md`, and `l1dder/templates/roadmap/roadmap-template.md`.
2. Formulate the initial ideas `IDEA-001`, `IDEA-002`, `IDEA-003`... with priorities `P0..P3` and status `📋 unrealized` (in `existing-code` mode, already-shipped capabilities may be recorded as `✅ realized` and upcoming work as `📋 unrealized`).
3. Present the initial `IDEA-NNN` list and `Discovery Queue` order for `docs/roadmap.md`.
4. ⛔ **STOP #3:** Ask: *"Approve the initial Idea Bank (`docs/ideas.md`), Backlog (`docs/backlog.md`), and Roadmap (`docs/roadmap.md`) (ok / edits)?"*
5. **After `"ok"`:**
   - Create `docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`, and the navigator `docs/README.md`.

---

## STEP 5: Onboarding Exit Gate

Verify that `l1dder/rules/30-tech-stack.mdc`, `docs/concept/idea.md`, `docs/concept/vision.md`, `docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`, and `docs/README.md` exist, then tell the user:
- *"L1DDER onboarding is complete! Stack rules are synced and `docs/` is initialized."*
- *"Next step: run `/l1-feature IDEA-001` to spec out your first feature (or `/l1-idea` to add more ideas)."*
