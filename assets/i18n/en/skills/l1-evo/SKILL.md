---
name: l1-evo
description: Evolves and refines the L1DDER framework itself using 100% dogfooding (applying ponytail, grilling, domain-modeling, codebase-design, and the Two-Approval Rule from l1dder/evolution/METHODOLOGY-RULES.md), synchronizes all rules/skills/templates/user-guide, logs iterations in WORKLOG-CHANGELOG.md, and updates HANDOFF.md on request. Use when the user invokes /l1-evo or asks to modify the methodology or prepare a methodology handoff.
argument-hint: "[change description | handoff]"
---

# L1DDER — Meta Flow: Framework Evolution via Dogfooding (`/l1-evo`)

> **MODEL INSTRUCTION (100% DOGFOODING):** Evolving `L1DDER` follows its own rules:
> 1. **Two-Approval Rule (`⛔ STOP #1` after plan, `⛔ STOP #2` after self-check before logging changelog).**
> 2. **Decision-tree questions via `grilling` (`❓ Q1 ➡️ Recommendation`).**
> 3. **Ponytail filter (`Deletion beats addition` + 2-line `Ponytail skipped / Risk` footer).**

---

## STEP 1: Read Evolution Rules & Current State

Read `l1dder/evolution/METHODOLOGY-RULES.md`, `l1dder/evolution/HANDOFF.md`, `l1dder/evolution/WORKLOG-CHANGELOG.md`, and `l1dder/skills/ponytail/SKILL.md`.
- If the user only asked to update `HANDOFF.md` (`/l1-evo handoff`), jump to **STEP 5**.
- Otherwise follow **STEPS 2 → 3 → 4 → 5**.

---

## STEP 2: Phase 1 (`Plan` + `grilling` + `ponytail`) & `⛔ STOP #1`

Present the evolution plan:
- **Goal:** 1 sentence.
- **`BREAKING CHANGES` Assessment:** explicitly state whether this change introduces breaking changes (`Yes: [details & migration]` / `No`).
- **Ponytail filter & files from the `Single Change = Full Sync` matrix** (including `assets/releases.json` and `CHANGELOG.md` when releasing a new version).
⛔ **STOP #1:** Ask: *"Evolution plan for `L1DDER` is ready. Apply changes (ok / edits)?"* and wait.

---

## STEP 3: Phase 2 (`Implement` with Full Sync) *(ONLY after first `"ok"`)*

Update the approved files in `l1dder/` and run `npx l1dder sync` so all configured agent folders stay in sync.

---

## STEP 4: Phase 3 (`Self-check`: `ponytail-review` + Two-Axis Review) & `⛔ STOP #2`

Verify `Standards` (no bloat, `Core vs Stack` respected, agent files synced) and `Spec`. Show report with the mandatory 2-line `Ponytail skipped / Risk` footer and wait for the second `"ok"`.

---

## STEP 5: Phase 4 (`Confirm & Record` in `WORKLOG-CHANGELOG.md`, `CHANGELOG.md`, `assets/releases.json` & `HANDOFF.md`) *(after second `"ok"`)*

1. Prepend the iteration entry to `l1dder/evolution/WORKLOG-CHANGELOG.md` (and when working in the standalone `L1DDER` package repo, also update `CHANGELOG.md` and `assets/releases.json`).
2. **Explicitly record `BREAKING CHANGES`** in `breaking.ru` and `breaking.en` inside `assets/releases.json` (and under `### ⚠️ BREAKING CHANGES` in `CHANGELOG.md`) so `npx l1dder@latest update` warns users and asks for confirmation before applying the update.
3. Update `l1dder/evolution/HANDOFF.md` if requested.
