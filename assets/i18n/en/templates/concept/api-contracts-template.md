# API & Module Contracts

> Inter-module or HTTP/RPC contracts of the system.

---

## 1. General Conventions

- **Data format:** JSON (UTF-8) / typed structures.
- **Validation:** strict checking of input parameters at the trust boundary.
- **Error format:** a clear error code and a human-readable message.

---

## 2. Endpoints / Methods Summary

| Method / Call | Path / Signature | Success Response | Scenario |
|---------------|------------------|------------------|----------|
| `POST` | `/api/v1/[resource]` | `201 Created` | `[Create a resource]` |
| `GET` | `/api/v1/[resource]` | `200 OK` | `[List resources]` |
| `GET` | `/health` | `200 OK` | Health check |
