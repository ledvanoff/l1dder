---
name: l1-idea
description: Brainstorms, refines, and registers product or technical ideas into the L1DDER Idea Bank (docs/ideas.md) using the grilling design-tree frontier and domain-modeling discipline, assigning a strict IDEA-NNN ID, priority (P0-P3), and status model. Use when the user invokes /l1-idea or wants to capture, discuss, or update an idea in the Idea Bank.
---

# L1DDER — Flow 1: Idea (`/l1-idea`)

> **MODEL INSTRUCTION:** Execute strictly step by step (1 → 2 → 3 → 4 → 5). Never edit `docs/ideas.md` before the user explicitly replies `"ok"` at Step 3.

---

## Exact Format Reference (Copy Character-for-Character)

- **Idea ID Format:** `IDEA-NNN` (three digits with leading zeros: `IDEA-001`, `IDEA-002`...).
- **Card Anchor Format:** `#idea-nnn` (lowercase: `#idea-001`, `#idea-002`...).
- **Allowed Priorities:** `P0` | `P1` | `P2` | `P3`
- **Allowed Statuses for `IDEA-NNN`:**
  - `📋 unrealized` *(initial status for new ideas)*
  - `🚧 in-progress`
  - `✅ realized`
  - `❌ rejected`

---

## STEP 1: Read Input Files

Use `Read` on:
1. `docs/ideas.md` *(if missing, read `l1dder/templates/ideas/ideas-template.md`)*.
2. `docs/concept/idea.md` + `l1dder/GLOSSARY.md` *(for project context and domain vocabulary)*.

---

## STEP 2: Compute Next ID (`IDEA-NNN`)

1. Inspect Table 1 (`1. Idea Registry`) in `docs/ideas.md`.
2. Find the highest `IDEA-NNN` and add `+1` (or `IDEA-001` if empty).
3. Check for duplicate ideas.

---

## STEP 3: Brainstorm via `grilling` + `domain-modeling` & Show Draft Card (`⛔ STOP`)

1. **Fact-finding rule (`grilling`):** Research facts in the codebase/docs yourself; ask the human **only product decisions**.
2. **Design Tree Frontier questions:** If there are decision branches, ask in this exact format:
   ```markdown
   ❓ **Q1 — [Decision Title]**: [Options backed by facts]
   ➡️ **Recommendation:** [Recommended lean option following ponytail — phrased so replying "ok" accepts it]
   ```
3. **Domain Glossary (`domain-modeling`):** Capture any new domain term and its 1-line definition.
4. Present the draft card:

```markdown
### Draft for Idea Bank (`docs/ideas.md`)

| Passport Field | Value |
|----------------|-------|
| **Idea ID** | `IDEA-NNN` |
| **Title** | [Short clear title] |
| **Priority** | `P0` / `P1` / `P2` / `P3` |
| **Status** | `📋 unrealized` |
| **Linked Features (`FEAT-NNN`)** | — |

**Essence & Value:**
[2–3 sentences]

**Key Scenarios:**
- [Scenario 1]
- [Scenario 2]

**Scope Boundaries (`ponytail` / YAGNI):**
- **Included in base scope:** [...]
- **Deferred / Out of scope:** [...]
```

5. ⛔ **STOP:** Ask: *"Approve card `IDEA-NNN` for `docs/ideas.md` (ok / edits)?"* and wait.

---

## STEP 4: Write `IDEA-NNN` to `docs/ideas.md` (ONLY after `"ok"`)

1. Append the row to `## 1. Idea Registry (Summary Table)`:
```markdown
| [`IDEA-001`](#idea-001) | Instant Catalog Search & Tag Filtering | P0 | 📋 unrealized | — | 2026-10-21 |
```
2. Append the full card `### IDEA-001: Instant Catalog Search & Tag Filtering {#idea-001}` to `## 2. Idea Cards`.

---

## STEP 5: Self-Check Exit Gate

Verify all 4 items before replying:
- [ ] 1. ID in Table 1 (`IDEA-NNN`) matches the card heading (`### IDEA-NNN: ... {#idea-nnn}`)?
- [ ] 2. Status is `📋 unrealized`?
- [ ] 3. Priority is `P0`, `P1`, `P2`, or `P3`?
- [ ] 4. Linked Features column is `—`?

Reply:
- *"Idea `IDEA-NNN` has been added to `docs/ideas.md` with status `📋 unrealized`."*
- *"Next step: run `/l1-feature IDEA-NNN` to write its feature specification, or `/l1-planning` to schedule it on the Roadmap."*
