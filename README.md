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

# Run a quick task without the full phase cycle
l1dder quick "add a health-check endpoint"
l1dder quick --finish

# Generate a Project Brief for your AI agent
l1dder context

# Check project health
l1dder doctor
```

## Key Commands

| Command | Description |
|---------|-------------|
| `l1dder init [--existing] [--ai <ide>]` | Initialize a project (greenfield or brownfield) |
| `l1dder status` | Current phase, stage, and tasks |
| `l1dder doctor` | Project health check |
| `l1dder quick "<task>"` | Quick task outside the full phase cycle |
| `l1dder context` | Generate a Project Brief for AI agents |
| `l1dder stage status` / `stage advance` | Inspect / advance the project stage |
| `l1dder transition <phase>` | Move between workflow phases |
| `l1dder sync --ai <ide>` | Generate IDE integration files |
| `l1dder check` | Verify standards compliance |
| `l1dder helpme` | Get guidance on what to do next |

## Documentation

Full documentation is on the way. For now, run `l1dder <command> --help` for
per-command usage, or `l1dder helpme` for guided next steps.

## License

[MIT](./LICENSE) © Oleg Ledvanov
