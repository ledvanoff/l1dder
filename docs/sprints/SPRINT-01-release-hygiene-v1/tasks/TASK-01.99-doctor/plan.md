# TASK-01.99: Гигиена спринта и Doctor Checklist — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-01.99` |
| **ID шага спеки** | `FEAT-002.99` ([`docs/specs/FEAT-002-release-hygiene-v1/tasks.md`](../../../../specs/FEAT-002-release-hygiene-v1/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-01`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-002`](../../../../backlog.md#feat-002) ([`docs/specs/FEAT-002-release-hygiene-v1/`](../../../../specs/FEAT-002-release-hygiene-v1/)) |
| **ID родительской идеи** | [`IDEA-002`](../../../../ideas.md#idea-002) |
| **Тип задачи** | `chore` (Обязательная гигиеническая задача завершения спринта) |
| **Статус задачи** | `🚧 реализация` |
| **Git-ветка** | `chore/sprint-01-TASK-01.99-doctor` |

---

## 1. Цель задачи

Провести финальную ревизию спринта `SPRINT-01` (`FEAT-002` ← `IDEA-002`), выполнить все 4 блока `Doctor Checklist` (`make ci`, `node playground/verify.mjs` на 2 моделях, `npm pack --dry-run`, синхронизация долгосрочной документации `docs/concept/` и `l1dder/evolution/WORKLOG-CHANGELOG.md`) и передать финальный отчёт пользователю.

---

## 2. Пошаговый чек-лист (4 обязательных блока Doctor Checklist)

- [x] **Блок 1 (Code & Repo Doctor + Двухосевой `code-review`):** `make ci` (0 ошибок), `ponytail-audit` и `ponytail-debt` (0 висячих `shortcut:`).
- [x] **Блок 2 (Agent E2E Verification):** `node playground/verify.mjs` подтверждает `14/14` проверок на обеих моделях (`Composer` и `Grok`), сборка сайта `npm run docs:build` проходит без ошибок.
- [x] **Блок 3 (Living Docs Sync + `retro`):** синхронизированы `docs/concept/*`, `docs/specs/FEAT-002-release-hygiene-v1/*`, `CHANGELOG.md`, `assets/releases.json` и `l1dder/evolution/WORKLOG-CHANGELOG.md`.
- [x] **Блок 4 (Human UAT & Release Gate):** подготовлен финальный отчёт и команды пуша релиза `v1.0.0`.
