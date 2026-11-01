---
name: ponytail-review
description: "Quality review of a change: is the logic right, is it safe, does it hold under real load, is risky code tested, is it fast enough, and is every line needed. Use for code review, /ponytail-review, or before STOP #2 in /l1-task."
---

# Ponytail Review

Review a change like the senior developer who will be paged when it breaks.
Order of importance: **correct, safe, holds under load, tested, fast, lean**.
Lean still matters: every extra line must be read, tested and fixed later.

## 1. Understand first

- Review what the user names: uncommitted or staged changes, a branch, a PR link, or files. Nothing named: the uncommitted changes, or the last commit if there are none.
- Read the diff, then the code it touches: callers of every changed function, the functions it calls, the tests, the spec.
- Trace the real flow: where data comes in, what is stored, what goes out.
- A change can break code it does not touch. When a signature, return value or behavior changes, grep every caller.

## 2. Look for

1. **Bug:** wrong result, crash, missed edge case (empty, zero, last item, concurrency), a caller broken by the change, a fix applied in one caller while the shared function stays broken.
2. **Risk:** security holes, data/state corruption (errors swallowed, invalid state persisted, missing cleanup).
3. **Scale / Memory:** memory or arrays/listeners that only grow and never clean up, O(n^2) in hot paths.
4. **Missing test:** risky new logic (a branch, a parser, state transitions, a bug fix) with no test that fails when it breaks. One good test at the public seam, not vanity coverage.
5. **Speed:** work repeated inside hot loops.
6. **Lean:** code that should not exist or should be smaller:
   - `delete:` dead code, unused options, speculative features
   - `reuse:` the repo already has this helper (name the path)
   - `stdlib / native:` the standard library or platform already does it; a new dependency for a few lines
   - `yagni:` abstraction with one implementation, config nobody sets
   - `merge:` near-copies that must change together
   - `split:` one function doing several unrelated jobs, so it is hard to read or test. Split by job, never by line count.

## 3. Check before you report

- Every finding needs a concrete case: "this input or situation leads to this wrong result". No case, no finding.
- Re-read the lines and confirm: the caller exists, the value can really be empty, the code really is unused.
- A shortcut marked with a `shortcut:` (or `ponytail:`) comment that names its limit is a decision, not a finding, unless the expected load already crosses it.
- Propose the smallest fix that works. Prefer fixes that delete code. Never add layers, frameworks or config the problem does not need.

## 4. Output

Start with `What this change does:` in two or three sentences.

Then the findings in three groups (skip empty groups):
- **Must fix:** bug, security, data/memory leak, breaks in target scenario.
- **Should fix:** missing test on risky logic, avoidable complexity (`delete` / `reuse` / `yagni`).
- **Nit / Cut:** minor simplification where lines can be deleted.
