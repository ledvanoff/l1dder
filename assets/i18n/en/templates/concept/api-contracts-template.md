# API & Module Contracts

## 1. Conventions
- **Format:** JSON (UTF-8) / typed structures validated at trust boundaries.

## 2. Endpoints / Methods Summary
| Method / Call | Path / Signature | Success | Scenario |
|---------------|------------------|---------|----------|
| `POST` | `/api/v1/[resource]` | `201 Created` | `[Create resource]` |
| `GET` | `/api/v1/[resource]` | `200 OK` | `[List resources]` |
| `GET` | `/health` | `200 OK` | Health check |
