# Technical Vision

> **Template:** fill in every section. Remove the `[]` instructions once filled in.
> This file holds only the product vision. Architecture and components live in [`architecture.md`](architecture.md), entities in [`data-model.md`](data-model.md), technologies and the folder layout in `l1dder/rules/30-tech-stack.mdc`.

---

## 1. System Overview

[2–3 sentences: what the system is, what it is called, what its core is.]

---

## 2. Roles

| Role | Description |
|------|-------------|
| **[Role 1]** | [What it does in the system] |
| **[Role 2]** | [What it does in the system] |

---

## 3. User Scenarios

### [Role 1]
- **S-1: [Name]** — [what the user does / sees]
- **S-2: [Name]** — [what the user does / sees]

---

## 4. Principles

- **Ponytail & Deep Modules:** minimal code, deep modules with clean public seams (`Seams`).
- **KISS & YAGNI:** build only what the current Roadmap task needs.
- **[Product principle]:** [what matters for this project in particular, for example "works offline" or "data never leaves the device"]
