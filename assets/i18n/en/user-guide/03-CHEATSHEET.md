# 📋 3. One-Page Cheatsheet & FAQ (`L1DDER`)

> ⬅️ Back to [Flows in Detail (02-FLOWS-IN-DETAIL.md)](./02-FLOWS-IN-DETAIL.md) | 🏠 [Main Map (README.md)](./README.md)

---

## 🎮 Table 1: "What Should I Type Right Now?"

| Situation | What to Type in Agent Chat | What Happens |
|-----------|----------------------------|--------------|
| 🧭 Just ran `npx l1dder init` in a new or existing repo | `/l1-onboard` | Works out the concept in `docs/concept/` stage by stage, then the stack in `30-tech-stack.mdc`, and creates `docs/ideas.md`, `docs/backlog.md`, and `docs/roadmap.md`. |
| 💡 Got a new idea (even mid-sprint) | `/l1-idea [idea summary]` | Refines with recommendations and after `"ok"` saves `IDEA-NNN` to `docs/ideas.md`. Active sprint is untouched. |
| 📐 Want to turn an idea into a spec and Backlog tasks | `/l1-feature IDEA-001` | Creates `docs/specs/FEAT-NNN/`, slices `FEAT-NNN.01..99`, and adds to `docs/backlog.md`. |
| 🗺 Want to schedule a sprint, reorder priorities, or reject the current sprint with rollback | `/l1-planning` | Updates `docs/roadmap.md` and assigns `SPRINT-NN`, or shows the current sprint's commits (`ok`), rolls back its code with `git revert`, and marks the sprint `❌ rejected`. |
| ⚙️ Want the agent to build the next scheduled task | `/l1-task` | Picks the next task from `docs/roadmap.md`, creates `plan.md` (`ok`), implements, verifies (`ok`), and records `summary.md`. |
| 🩺 All regular sprint tasks are done | `/l1-task` | Automatically starts `TASK-NN.99` (`Doctor Checklist`): CI, E2E, Living Docs Sync, and Human UAT. |
| 🚑 Urgent bug needs an immediate fix | `/l1-hotfix [bug description]` | Reproduces the bug (`RED`), gets `"ok"`, fixes it (`GREEN`), and logs `HOTFIX-NNN` in `docs/backlog.md`. |
| 🧹 Want to change the project itself, not the product: git rules, CI, libraries, `Makefile`, agent rules | `/l1-chore [what to change]` *(or "let's make a chore change...")* | Checks the product stays unchanged, suggests an option, after `"ok"` makes the change, runs `make ci`, and logs `CHORE-NNN` in `docs/backlog.md`. |
| ⚡ Want to quickly build a small product feature when no sprint is active (**strictly human-invoked, forbidden for the agent on its own**) | `/l1-fast [small feature]` | When `1 (CURRENT)` is empty: clarifies (`ok`), writes the code and runs all checks, shows the manual testing guide (`ok`), and records the idea, spec, sprint, and tasks marked `mode: /l1-fast`. |
| 🔍 Want to review code for bloat | `/ponytail-review` or `/ponytail-audit` | Reviews recent changes or the whole repo for over-engineering. |
| 🧾 Want to see deliberate shortcuts | `/ponytail-debt` | Collects all `// shortcut:` comments into a debt ledger. |
| 🧬 Want to evolve `L1DDER` rules or update `HANDOFF.md` | `/l1-evo [description or handoff]` | Synchronously updates rules/skills/guides, logs `WORKLOG-CHANGELOG.md`, and updates `HANDOFF.md`. |

---

## 🚦 Table 2: Status Reference

- **Ideas (`docs/ideas.md`):** `📋 unrealized` → `🚧 in-progress` → `✅ realized` | `❌ rejected`
- **Features (`docs/backlog.md`):** `📝 drafting` → `📋 in-backlog` → `🗓 scheduled` → `🚧 in-progress` → `✅ realized` | `❌ rejected`
- **Sprints & Tasks (`docs/roadmap.md`, `docs/backlog.md`):** `📋 planned` → `🚧 in-progress` → `✅ realized` | `⏸ paused` | `❌ rejected`

---

## ❓ FAQ

### I type `/l1-` but the commands aren't in the menu. What should I do?
Run `npx l1dder@latest update` and open a new agent session. If that doesn't help, follow the [step-by-step guide](https://ledvanoff.github.io/l1dder/en/troubleshooting).
