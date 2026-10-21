# System Architecture

## 1. Container Diagram
```mermaid
flowchart TB
    U["User"] --> C["Client / Entry"]
    C --> Core["Core / Deep Modules"]
    Core --> Store[("Data / Storage")]
```

## 2. Deep Modules & Public Seams (`codebase-design`)
| Module | Public Interface (`Seam`) | Hidden Responsibility | Tech |
|--------|---------------------------|-----------------------|------|
| **[Module 1]** | `[functions / API]` | `[internal logic]` | `[stack]` |

## 3. Local Development & CI Verification
- Local dev: `make dev`
- Full CI check: `make ci` (`lint` + `typecheck` + `test` + `build`)
