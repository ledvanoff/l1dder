# l1dder

## 0.2.0

### Minor Changes

- 2275af8: Fix six golden-path blockers found by the H-HARD end-to-end sweep.
  - The `product_discovery` route had no forward exit from `update_tobe`, so a
    Product Discovery session could only roll back. `UPDATE_TOBE → REVIEW` and
    `UPDATE_TOBE → COMPLETE` now exist behind the discovery gate.
  - A phase outside the selected profile route trapped the state machine even
    under `--force`. Returning to `IDLE` is now allowed as an audited off-route
    escape; `--force` still cannot jump from the route onto a foreign phase.
  - Blockers carry a `hard` / `advisory` level. `DISCOVERY_NOT_READY` and the
    milestone prompts are advisory, so `/l1dder-next` no longer has to stop for
    the entire Product Discovery. Missing level is treated as hard.
  - Primary Action reports `needs_input` and `required_inputs` for commands that
    need human text (`discovery plan`, `discovery complete`) instead of emitting
    a command that fails on a required flag.
  - `stage set` no longer bypasses the discovery gate: it refuses without
    `--force --reason` and records the same audited Decision as `stage advance`.
    `doctor --section stage` now reports forced stage waivers.
  - Generated `AGENTS.md` and IDE rules take the project name from project state
    instead of the working-directory basename.

  Also removes the dead `stage.enforcement.require_criteria` config field. It was
  read by no production code; existing `config.yml` files keep loading because the
  schema ignores unknown keys.

### Patch Changes

- 3eb6a97: Fix state recovery idempotency, schema error details, and doctor --fix re-check (HARD-1).
- 1c7c13e: Add the Discovery orchestrator, explicit workflow profiles, the single workflow projection and the greenfield roadmap scaffold (HARD-2).
  - `l1dder discovery status/start/plan/complete/waive/reopen/skip` drive the ordered IDEA→READY milestone checklist; `status`, `helpme`, `stage status` and `doctor` all read that one checklist.
  - Workflow profiles (`product_discovery`, `feature_discovery`, `delivery`, `hygiene`) are stored explicitly and never selected silently; `stage advance` is a hard gate with an audited `--force --reason` bypass.
  - `state.yml` moves to schema v2 through a real migration on a single production load path (backup → migrate → validate → atomic save).
  - `l1dder init` renders the full localized roadmap scaffold into `knowledge/roadmap.md` and initializes the seven discovery milestones with a brainstorm-first next step.

- 6d010c8: Add the canonical traceability manifest contract and its reader, validator and generated view (HARD-3).
  - `ProjectRegistrySchema` validates `knowledge/project-registry.yml`: `FEAT-*`/`UC-*`/`MODEL-*`/`ENUM-*`/`TC-*`/`INT-*`/`DEC-*` id rules, the FEAT↔UC parent-number invariant, globally unique ids and source anchors, and referential integrity of every typed link. Historical `INT-*`/`DEC-*` forms are accepted without a rename, and `DEBT-*`/`BL-*` rows reuse the existing pool schemas.
  - `RegistryReader` parses the manifest through the schemas and returns typed `ReadError`/`ParseError` values instead of throwing.
  - `RegistryValidator` reports what schemas cannot see — missing source files, missing Markdown heading anchors, orphan entities and relation cycles — as issues carrying stable codes (`REGISTRY_BROKEN_PATH`, `REGISTRY_BROKEN_ANCHOR`, `REGISTRY_ORPHAN`, `REGISTRY_CYCLE`).
  - `renderRegistry` builds a deterministic, locale-independent `knowledge/registry.md` view, and its embedded content hash detects a stale generated file.

- 2119840: Add the registry engine, the TypeScript public-symbol indexer and the test-contract evidence index (HARD-4).
  - `l1dder registry check|sync|show` reads the traceability manifest, indexes code and renders `knowledge/registry.md`. `check` is read-only, `sync` is idempotent and fail-closed (nothing is written while error-severity issues remain), and `sync --init` scaffolds a draft manifest.
  - A convention-based TypeScript indexer discovers exported declarations and package export paths without pulling the compiler API into the published bundle. A manifest `symbols` collection links each symbol to `FEAT-*`/`UC-*`/`MODEL-*`, and the generated view gains a deterministic, bounded domain/public API Mermaid diagram.
  - Duplicate detection is scoped to a real public-API collision (same name, package and export path); the same name across different packages is an advisory warning, and project conventions such as `X`/`XSchema` no longer produce similar-name noise.
  - Test contracts are evidenced by `// @tc TC-NNN-MM-L` markers placed directly above the proving `it()`/`test()`, so no global id is assigned to every test. Missing evidence for a required contract fails the check.
  - The generated view is now considered stale when it is edited by hand, not only when the manifest changes, and doctor exposes stable `registry-*` and `ai-context-freshness` check ids with a fixer that reuses the same sync logic.

- 353da92: Add task projection, delivery rails and lifecycle integrity (HARD-5).
  - `l1dder task sync|list|complete <T-NN>` projects the `## Task List` table of `specs/current/tasks.md` into `state.tasks.items`. The markdown stays the single source of truth: `complete` rewrites only the Status cell of that row, leaves every other byte untouched, and re-syncs state from the file. Completing a task whose `depends_on` entries are unfinished is rejected instead of silently breaking the order.
  - The `implementation-gate` on `implement → update_asis` now fails closed. Deterministic gate conditions run before approval, so the transition is blocked while tasks are still open, and also when `tasks.md` exists but the state projection is empty (previously the solo approver waved everything through).
  - The manifest gained a machine-readable Delivery Plan: an `iterations` collection with sessions carrying `status`, `profile`, `depends_on` and FEAT/UC coverage. Sessions of one iteration may share the roadmap Delivery Plan anchor — rails are exempt from global source-anchor uniqueness for that reason.
  - `l1dder session status|start <ID>` records the active Agent Session rail in `workflow.session`. Starting a session that is off-road, already closed, or blocked by unfinished dependencies fails without touching state; `--force --reason` remains an audited bypass and is stored as a waiver. When the rails are genuinely absent the CLI says so, and when the manifest exists but cannot be loaded it says that instead and points at `l1dder registry check`.
  - `helpme` reports delivery artifact readiness (`missing` / `in_progress` / `ready`) for the current phase instead of repeating static "fill in plan.md" guidance once the artifact is complete.
  - State schema moves to version 3 with a registered migration that adds `workflow.session`.

- 8788b2a: Add spec templates with an AI Contract, the `/l1dder-next` entrypoint and an explicit Agent Session closure (HARD-6).
  - The en and ru spec templates now separate a prose **Human Summary** from a machine-readable **AI Contract** block: a `yaml` fence under `## AI Contract` carrying `feature`, `usecases`, `decisions`, `models` and `test_contracts`. Heading and keys stay English in both locales so one parser serves every language. `parseSpecContract` validates that block against registry ID rules, and a new `spec-contract` doctor section reports a malformed contract as an error while a legacy spec without the block is only a warning with a migration hint. Plan and tasks templates gained coverage, plan dependencies and per-task Test Contracts. There is no second `ai-spec.md`: one spec bundle carries both audiences.
  - `l1dder init` now asks for the AI IDE as well as the language, and installs the chosen adapter in the same run, so `.cursor/` and a complete `AGENTS.md` exist immediately instead of waiting for a manual `l1dder sync`. Non-interactive runs no longer apply defaults silently: they name the resolved `--lang` / `--ai` values and how to override them, and `--ai none` is now the flag spelling of the interactive "skip" choice. A filesystem-permission failure during adapter install reports one actionable message instead of a per-file cascade.
  - The generated `AGENTS.md` explains the position model Stage → Milestone → Profile → Session → Phase → Gate → Primary Action, the workflow profiles, roadmap rails, registry-first lookup and the recovery entrypoints, and points at a single primary next step rather than presenting every command as an equal option.
  - `/l1dder-next` is the new primary AI IDE entrypoint. It reads the canonical projection from `l1dder now --json` and dispatches exactly its Primary Action, holding no routing table of its own; phase-specific slash commands remain as an advanced surface. `helpme` / `now` therefore expose top-level `primary_action` and `blockers`, and the new `l1dder profile status|select|clear` closes the gap where the projection recommended a command that did not exist. A contract test now fails if any Primary Action names an unregistered CLI command.
  - `l1dder session end --outcome completed|interrupted|handed_off` records outcome, evidence and next action into the append-only `workflow.session_history` and clears the active rail; completing without evidence is rejected. An interrupted or handed-off session also refreshes the handoff. A `Stop` hook follows up when an Agent Session is still open, and degrades to recommending `l1dder doctor` when state cannot be read rather than reporting false success.
  - `l1dder handoff` generates or refreshes `.l1dder/handoff.md`. Template, skill, generator, detector and validator now share one contract: three required core sections plus optional rich blocks (decisions, open questions, files changed, risks, verification, recommended first command). Existing minimal handoffs stay valid, and the generator emits a rich block only when it has the facts for it. A handoff template now actually ships to user projects, fixing a skill that pointed at a file no project ever received.
  - Built-in implementation assets are no longer tied to the framework's own stack: they derive test, lint and typecheck commands from the project's standards and architecture instead of hard-coding vitest, tsc, eslint and `packages/` paths.
  - Cursor command front-matter is now YAML-escaped, so command prose containing quotes cannot produce an unparseable file, and a wildcard command no longer advertises a meaningless phase.
  - State schema moves to version 4 with a registered migration that adds `workflow.session_history`.

- f29fe2d: Make the workflow projection the single source of the next action across every CLI surface (HARD-7).
  - `status`, `helpme` / `now`, `stage status`, `doctor` and `context` no longer compute a next step of their own. Primary Action, blockers, task counters and alternative transitions all come from `WorkflowProjectionService`, so the surfaces cannot drift apart — a cross-command contract test now fails if they do. `doctor` also stops constructing its own projection instance and shares the one from the state manager.
  - The projection gained exactly the facts its consumers were re-deriving: task counters by status plus the next startable task, the forward transition with its real trigger and gates, and the rollback targets allowed by the active profile route.
  - Default human output progressively discloses one Primary Action (plus blockers when present), while `--verbose` and `--json` keep the complete machine picture: alternative transitions, gates, rollback targets, task counters and evidence.
  - Slash command references now have exactly one spelling. The hyphen form `/l1dder-<id>` — matching the files an AI IDE actually reads — is produced by a single formatter, and the internal `slash:<id>` trigger source is never shown to a human. The dotted form is gone from commands, skills, personas, templates and help output.
  - Slash command front-matter `phase` is validated against the canonical phase schema instead of accepting any string. This uncovered a real defect in a shipped asset: the update-tobe command declared a non-canonical phase name, which the composer inlined into the transition command it generates, so the command recommended an invalid phase in every project. Historical phase aliases now produce a "did you mean" suggestion without ever becoming valid phase names.
  - The Project Brief can no longer contradict runtime state: workflow status is rendered only from a projection snapshot passed in as pure data, and roadmap text is included as a clearly labelled narrative excerpt with machine-status claim lines removed.
  - `l1dder stage advance --dry-run` previews a stage advance without writing state, and returns the same exit code the real run would return instead of always succeeding.
  - `l1dder help <topic>` explains an unknown topic instead of reprinting the top-level help with a generic failure: it distinguishes a workflow phase, a slash command, a historical phase alias and a genuinely unknown name, and exits with a usage error code.
  - Every command's help now ends with a Global options section listing the flags that apply to all commands, generated from one source so a new command gets it automatically.
  - `--quiet` has specified behaviour: a single summary line naming the current phase and Primary Action, with banners and recovery notices suppressed while warnings, errors and exit codes are preserved. `--json` stays complete and takes precedence.
  - `primary_action` and `blockers` are now part of the published status, stage status and doctor output schemas rather than local inline types.

- 63d977e: Give a `delivery` workflow profile a real entry point, make the task gate
  fail-closed for any project layout, and stop rejected transitions from touching
  state.
  - Add the ungated `IDLE → TASKS` transition: an Agent Session that picks up an
    approved roadmap entry starts at TASKS, and its route contains no
    SPECIFY/PLAN/UPDATE_TOBE to arrive from — without it the projection returned a
    primary action with an empty command.
  - A rejected transition no longer rewrites `state.yml`. The pipeline decides
    first and the crash-safety marker now wraps only the write itself, so a
    forbidden route, a stage guard or a gate rejection leaves memory and disk
    untouched (a dry run likewise).
  - The implementation gate resolves task documents from the project instead of
    one hardcoded path: `l1dder task sync` records `tasks.source_path`, and the
    gate also recognises any `specs/<feature>/tasks.md`. A project that keeps its
    task list outside `specs/current/` no longer looks like a project without
    tasks and can no longer walk through the gate.
  - Ending an Agent Session as `interrupted` or `handed_off` parks the current
    phase as `interrupted`; the next `session start` resumes it to `in_progress`.
  - `l1dder registry sync --init` now also renders `knowledge/registry.md`, so
    `l1dder registry check` no longer fails on a freshly initialised manifest.
  - Registry source anchors resolve explicit `<a id="...">` targets in addition to
    Markdown heading slugs, so cards that live in tables can be referenced.
  - `DeliverySessionIdSchema` accepts alphanumeric suffixes (`HARD-D`, `H-HARD`,
    `DF-E1`) instead of digits only.

## 0.1.1

### Patch Changes

- 8e610d4: First release published through the CI/CD pipeline with npm provenance. 0.1.0 was a manual bootstrap publish (name reservation, no provenance); 0.1.1 is the first release produced end-to-end by the release pipeline (Version PR → tag → public mirror sync → OIDC publish).
