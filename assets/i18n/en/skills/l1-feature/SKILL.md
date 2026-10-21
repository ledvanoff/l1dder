---
name: l1-feature
description: Creates feature specifications (docs/specs/FEAT-NNN-<slug>/requirements.md, design.md, tasks.md) strictly linked to an IDEA-NNN using grilling, domain-modeling, codebase-design (Deep Modules & Seams), and tdd (Pre-agreed Seams), numbers step candidates as FEAT-NNN.01..99, and updates docs/backlog.md and docs/ideas.md. Use when the user invokes /l1-feature.
---

# L1DDER — Flow 2: Feature & Specification (`/l1-feature`)

> **MODEL INSTRUCTION:** Execute strictly step by step (1 → 2 → 3 → 4 → 5). Every feature `FEAT-NNN` must be linked to a parent `IDEA-NNN`. Never create files before receiving `"ok"` at Step 3.

---

## Exact ID & Status Reference

- **Parent Idea ID:** `IDEA-NNN` (in `docs/ideas.md`).
- **Feature & Spec ID:** `FEAT-NNN` (`FEAT-001`, `FEAT-002`...).
- **Spec Folder Name:** `docs/specs/FEAT-NNN-<slug>/` (must start with `FEAT-NNN-`).
- **Step IDs inside Feature (before sprint planning):**
  - Regular tasks: `FEAT-NNN.01`, `FEAT-NNN.02`...
  - **Mandatory final task of every sprint:** `FEAT-NNN.99` (`Sprint Hygiene & Doctor Checklist (E2E + UAT + Docs Sync)`).
- **Status of `FEAT-NNN` after writing to backlog:** `📋 in-backlog`
- **Status of parent `IDEA-NNN` after creating feature:** changes from `📋 unrealized` to `🚧 in-progress`

---

## STEP 1: Read Input Files

Read:
1. `docs/ideas.md`
2. `docs/backlog.md` *(or `l1dder/templates/backlog/backlog-template.md`)*
3. `docs/roadmap.md` *(check `3. Discovery Queue`)*
4. `l1dder/templates/specs/spec-template.md`
5. `l1dder/rules/30-tech-stack.mdc` and `docs/concept/architecture.md`

---

## STEP 2: Verify Parent `IDEA-NNN` & Compute `FEAT-NNN`

1. Determine `IDEA-NNN` (from user argument, or first `📋 unrealized` idea in `Discovery Queue` / `docs/ideas.md`).
2. Find the highest `FEAT-NNN` in `docs/backlog.md` and increment by `+1` (or `FEAT-001`).

---

## STEP 3: `grilling` + `codebase-design` (Deep Modules & Seams) + Step Slicing `FEAT-NNN.01..99` (`⛔ STOP`)

1. Resolve any open product/technical branches using `❓ Q1 ➡️ Recommendation`.
2. Design **Deep Modules (`codebase-design`)** (passing the `Deletion Test`) and define **Pre-agreed Test Seams (`tdd`)**.
3. Present the proposed specification summary (`requirements.md`, `design.md` with Test Seams, and `tasks.md` with steps `FEAT-NNN.01 .. FEAT-NNN.99`).
4. ⛔ **STOP:** Ask: *"Approve specification `FEAT-NNN` (linked to `IDEA-NNN`), test seams, and task breakdown (ok / edits)?"* and wait.

---

## STEP 4: Write Changes to 3 Locations (ONLY after `"ok"`)

1. **Location 1 (`docs/specs/FEAT-NNN-<slug>/`):** create `requirements.md`, `design.md`, and `tasks.md` with full ID Passports (`FEAT-NNN` & `IDEA-NNN`).
2. **Location 2 (`docs/backlog.md`):** add `FEAT-NNN` to Table 1 (`1. Feature Registry`) and Section 2 (`2. Feature Decomposition, Sprints & Tasks`) with status `📋 in-backlog` and steps `FEAT-NNN.01 .. FEAT-NNN.99`.
3. **Location 3 (`docs/ideas.md`):** update `IDEA-NNN` status to `🚧 in-progress` and link `[FEAT-NNN](./backlog.md#feat-nnn)`.

---

## STEP 5: Self-Check Exit Gate

- [ ] 1. Spec folder starts with `docs/specs/FEAT-NNN-`?
- [ ] 2. All 3 spec files include the ID Passport with `FEAT-NNN` and `IDEA-NNN`?
- [ ] 3. `design.md` defines Deep Modules and Pre-agreed Test Seams?
- [ ] 4. Every sprint candidate ends with mandatory step `FEAT-NNN.99` (`Doctor Checklist`)?
- [ ] 5. `docs/backlog.md` updated in both Table 1 and Section 2 (`📋 in-backlog`)?
- [ ] 6. `docs/ideas.md` updated for `IDEA-NNN` (`🚧 in-progress`)?

Reply:
- *"Specification `FEAT-NNN` (from `IDEA-NNN`) has been created in `docs/specs/FEAT-NNN-<slug>/` and added to `docs/backlog.md` (`📋 in-backlog`)."*
- *"Next step: run `/l1-planning` to schedule `FEAT-NNN` on the Roadmap and assign `SPRINT-NN`."*
