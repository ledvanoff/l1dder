---
name: l1-hotfix
description: Performs fast, disciplined emergency bug fixes bypassing the L1DDER Roadmap Gate using diagnosing-bugs (RED reproduction gate first) and ponytail discipline, runs verification (make ci + regression test turns GREEN), and logs HOTFIX-NNN with linked FEAT-NNN / TASK-NN.MM IDs in docs/backlog.md. Use when the user invokes /l1-hotfix.
---

# L1DDER — Flow 5: Emergency Hotfix (`/l1-hotfix`)

> **MODEL INSTRUCTION:** Execute strictly step by step (1 → 2 → 3 → 4 → 5). This is the only exception to the `Roadmap Gate` for urgent bugs.
> **RED REPRODUCTION GATE (`diagnosing-bugs`):** You are **forbidden** from guessing the cause or editing application code until you have reproduced the bug with a failing test/command (`RED Gate`). Never edit application code before receiving `"ok"` at Step 2.

---

## STEP 1: Read `docs/backlog.md`, Compute `HOTFIX-NNN` & Pass `RED Reproduction Gate`

1. Read `docs/backlog.md` (`Section 3. Hotfix Log (HOTFIX-NNN)`) and compute the next `HOTFIX-NNN` (`HOTFIX-001`, `HOTFIX-002`...).
2. Identify the related `FEAT-NNN` / `TASK-NN.MM` (or `—`).
3. **Pass the `RED Reproduction Gate` (`diagnosing-bugs`):** run or write a minimal test/command that **fails (`RED`) right now on this bug**, and grep all callers of the affected function (`ponytail`).

---

## STEP 2: Show Concise Hotfix Plan in Chat & `⛔ STOP`

```markdown
### Emergency Hotfix Plan `HOTFIX-NNN`

| Field | Value |
|-------|-------|
| **Hotfix ID** | `HOTFIX-NNN` |
| **Linked ID** | `FEAT-NNN` / `TASK-NN.MM` (or `—`) |
| **Reproduction (`RED Gate`)** | `[exact failing command / test]` |
| **Root Cause** | [1–2 sentences] |
| **Minimal Fix (`ponytail`)** | [exact files & lines to change] |
| **Verification (`GREEN Gate`)** | Failing test turns `GREEN` + `make ci` |
```

⛔ **STOP:** Ask: *"Apply hotfix `HOTFIX-NNN` (ok / edits)?"* and wait.

---

## STEP 3: Apply Minimal Fix & Verify `RED → GREEN` (ONLY after `"ok"`)

1. Save the regression test, apply the minimal fix (`ponytail`), verify the test turns `GREEN`, and run `make ci`.

---

## STEP 4: Log `HOTFIX-NNN` in `docs/backlog.md`

Append `HOTFIX-NNN` with status `✅ realized` to Section 3 of `docs/backlog.md`, and update `docs/concept/` or `docs/specs/` if contract behavior changed.

---

## STEP 5: Self-Check Exit Gate

- [ ] 1. Reproduction test went `RED → GREEN` and `make ci` passed with 0 errors?
- [ ] 2. Regression test committed in repository?
- [ ] 3. `HOTFIX-NNN` logged in `docs/backlog.md` (`✅ realized`)?
