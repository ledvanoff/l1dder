---
id: brownfield-scan
name: "Brownfield Project Scan"
format_version: 1
phase: init
roles: [architect]
trigger: manual
priority: 1
context_profile: brownfield_full
tags: [init, brownfield, onboarding]
builtin: true
---

# Brownfield Project Scan

## Summary

Parallel mapping of an existing project during brownfield onboarding:
5 mapper aspects + a synthesizer → an initial `knowledge/` structure.

## When to Use

- The user ran `l1dder init --existing` and received an activation hint
- An explicit user request to analyze an existing project
- Onboarding L1DDER into a project with already-written code

## Steps

1. Determine the project scope: root directory, languages, frameworks
2. Run parallel mapping (5 mapper aspects):
   - **Stack mapper**: languages, runtime, frameworks, dependencies, build tools
   - **Architecture mapper**: directory structure, modules, patterns, entry points
   - **Data model mapper**: DB schemas, ORM models, API contracts, state shape
   - **Conventions mapper**: code style (implicit), naming, testing patterns, CI config
   - **Integrations mapper**: external APIs, services, SDKs, deployment targets
3. For each mapper:
   - Scan relevant files (package.json, tsconfig, src/, tests/, CI configs, etc.)
   - Extract structured findings
   - Flag uncertainties (confidence level: high/medium/low)
4. Synthesize the findings:
   - Merge the 5 mapper outputs into a single Project Brief
   - Resolve conflicts between mapper findings
   - Generate the initial `knowledge/` structure
5. Generate Knowledge scaffolding:
   - `knowledge/as-is/architecture.md` — the real architecture
   - `knowledge/as-is/erd.md` — the real data model
   - `knowledge/as-is/integrations.md` — the real integrations
   - `knowledge/idea.md` — a brief about the project (from README + context)
6. Propose the result to the user for review and correction

## Reverse-Engineering Flow (read-only, step-by-step)

<!-- Adapted from AI-Driven Methodology onboarding/existing-code.md (M9). -->

When recovering knowledge from an existing codebase, stay **read-only** and work
one document at a time. On every step repeat the same loop:

1. **Study** the relevant code only (read, do not modify anything).
2. **Draft** a document proposal based strictly on what the code reveals.
3. **Ask** clarifying questions about gaps the code does not answer — do not invent.
4. **Finalize** the document after the user answers.
5. **Wait** for an explicit "ok" before moving to the next step.

Recommended order (skip a step with a stated reason when it does not apply):

- **Step 1 — Project structure.** Map directories, components (backend/frontend/CLI/…),
  stack, config files (`package.json`, `tsconfig`, `.env.example`, lockfiles), and any
  existing docs (README, `docs/`). Produce a short report; wait for "ok".
- **Step 2 — `knowledge/idea.md`.** Recover the product brief from README, package
  metadata, models, handlers/endpoints: name, purpose, roles, the problem it solves,
  the current feature set.
- **Step 3 — `knowledge/as-is/architecture.md`.** Component responsibilities, how they
  communicate (HTTP/events/queue), where the business logic lives, the deployment shape
  (compose/CI). Draw mermaid diagrams when ≥2 components exist.
- **Step 4 — `knowledge/as-is/erd.md`** (if a DB / persistent entities exist). Recover
  the data model from ORM models and migrations: entities, relations, invariants.
- **Step 5 — `knowledge/as-is/integrations.md`** (if external calls exist). HTTP clients,
  third-party SDKs, and env vars that point at external services, with their contracts.
- **Step 6 — `knowledge/as-is/usecases.md`.** Recover the real user scenarios from
  routers/handlers/commands; phrase them from the user's point of view.

The 5 mapper aspects above feed these documents: the Stack and Architecture mappers feed
Steps 1 and 3, the Data model mapper feeds Step 4, the Integrations mapper feeds Step 5,
and the Conventions mapper informs `standards/`.

## As-Is vs To-Be in roadmap

Recovered concept docs describe **how it is now** (`as-is/*`), not how it should be. After
the as-is picture is agreed:

- Record the recovered current state as the **starting point** in `knowledge/roadmap.md`.
- Capture the gap between as-is and the desired to-be (what is broken, missing, or planned)
  as roadmap items — do not silently "fix" it inside the as-is documents.
- Keep `as-is/*` and `to-be/*` separate: as-is is updated after delivery, to-be after
  discovery (see `standards/workflow.md`).

## Validation

- [ ] All 5 mapper outputs are filled (empty = warning)
- [ ] Knowledge files are generated and do not contradict each other
- [ ] Confidence levels are marked (low = needs manual review)
- [ ] The `knowledge/` directory structure conforms to L1DDER conventions

## Output

- Initial `knowledge/` structure (as-is files populated)
- `.l1dder/config.yml`
- `.l1dder/state.yml`
