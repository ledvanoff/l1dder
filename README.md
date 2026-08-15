# L1DDER

> AI-driven development framework — a Knowledge Layer (As-Is / To-Be), real state
> management, and a structured Discovery / Delivery workflow for your projects.

[![npm version](https://img.shields.io/npm/v/l1dder.svg)](https://www.npmjs.com/package/l1dder)
[![npm provenance](https://img.shields.io/badge/npm-provenance-blue)](https://docs.npmjs.com/generating-provenance-statements)
[![license](https://img.shields.io/npm/l/l1dder.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/l1dder.svg)](https://nodejs.org)

L1DDER is a CLI that helps humans and AI agents build software together. It keeps
project knowledge split into **As-Is** (what is built) and **To-Be** (what is
designed), tracks real project **state** across phases, and drives work through a
lightweight **Discovery → Delivery** loop. It integrates with AI IDEs such as
Cursor and Claude.

## Installation

```bash
npm install -g l1dder
```

Requires **Node.js 22+**. You can also run it without installing:

```bash
npx l1dder init
```

## Quick Start

```bash
# Initialize L1DDER in a new or existing project
l1dder init --ai cursor            # greenfield
l1dder init --existing --ai cursor # brownfield (adopt an existing codebase)

# See where you are
l1dder status

# What to do next (same projection as /l1dder-next in the IDE)
l1dder now

# Run a quick task without the full phase cycle
l1dder quick "add a health-check endpoint"
l1dder quick --finish

# Generate a Project Brief for your AI agent
l1dder context

# Check project health
l1dder doctor
```

## Typical session loop

```bash
l1dder now                          # or /l1dder-next in the IDE
l1dder profile select delivery
l1dder session start <id>
# …do the work…
l1dder task sync                    # or: l1dder task complete T-01
l1dder session end --outcome completed --evidence "…"
# interrupted work: l1dder handoff
```

## Key Commands

| Command | Description |
|---------|-------------|
| `l1dder init [--existing] [--ai <ide>]` | Initialize a project (greenfield or brownfield) |
| `l1dder status` | Current phase, stage, and tasks |
| `l1dder now` / `l1dder helpme` | Next step from the workflow projection (`now` is an alias of `helpme`) |
| `l1dder profile status` / `select` / `clear` | Choose a workflow profile before starting work |
| `l1dder session status` / `start` / `end` | Open and close an Agent Session |
| `l1dder task sync` / `list` / `complete` | Sync `tasks.md` (source of truth) into state |
| `l1dder registry check` / `sync` / `show` | Validate and regenerate the project registry |
| `l1dder handoff` | Write `.l1dder/handoff.md` for an interrupted session |
| `l1dder doctor` | Project health check (`--deep`, `--fix`, `--section`, `--mode`) |
| `l1dder quick "<task>"` | Quick task outside the full phase cycle |
| `l1dder context` | Generate a Project Brief for AI agents |
| `l1dder stage status` / `stage advance` / `stage set` | Inspect / advance / set the project stage (`advance --dry-run`; `set --to <stage>`) |
| `l1dder transition --to <phase>` | Move between workflow phases |
| `l1dder discovery status` / `start` / `plan` / `complete` | Drive the Product Discovery milestones |
| `l1dder sync --ai <ide>` | Generate IDE integration files |
| `l1dder check` | Verify standards compliance |

## Documentation

Full documentation is on the way. For now, run `l1dder <command> --help` for
per-command usage, or `l1dder helpme` for guided next steps.

## Contributing

**Issues are the best way to contribute** — bug reports, ideas, and questions are
very welcome. This repository is an **auto-generated public mirror**: it is
regenerated on every release, so direct commits here are overwritten. Pull
requests are welcome too, but they are not merged directly — a maintainer
re-implements accepted changes through the private source repository and credits
you in the changeset, PR, and changelog. See [CONTRIBUTING.md](./CONTRIBUTING.md)
for details. No CLA required.

## License

[MIT](./LICENSE) © Oleg Ledvanov
