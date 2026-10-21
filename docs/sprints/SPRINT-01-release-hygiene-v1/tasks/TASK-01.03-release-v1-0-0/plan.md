# TASK-01.03: Подготовка и выкатка релиза `l1dder@1.0.0` (`npm pack`, `CHANGELOG.md`, `releases.json`, git и деплой) — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-01.03` |
| **ID шага спеки** | `FEAT-002.03` ([`docs/specs/FEAT-002-release-hygiene-v1/tasks.md`](../../../../specs/FEAT-002-release-hygiene-v1/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-01`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-002`](../../../../backlog.md#feat-002) ([`docs/specs/FEAT-002-release-hygiene-v1/`](../../../../specs/FEAT-002-release-hygiene-v1/)) |
| **ID родительской идеи** | [`IDEA-002`](../../../../ideas.md#idea-002) |
| **Тип задачи** | `chore` |
| **Статус задачи** | `🚧 реализация` |
| **Git-ветка** | `chore/release-TASK-01.03-v1-0-0` |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `ponytail-review` |

---

## 1. Цель задачи

Проверить состав публикуемого npm-тарбола `l1dder@1.0.0` (`npm pack --dry-run`), убедиться в актуальности `CHANGELOG.md` и `assets/releases.json` (включая `BREAKING CHANGES`), проверить GitHub Actions воркфлоу (`ci.yml`, `docs.yml`, `publish.yml`) и подготовить команду выкатки в GitHub (`ledvanoff/l1dder`) и npm.

---

## 2. Критерии готовности (DoD)

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Тарбол `npm pack --dry-run` содержит `dist/cli.js`, `assets/releases.json`, `assets/i18n/{ru,en}/`, `README.md`, `CHANGELOG.md`, `LICENSE` и не содержит мусора | `npm pack --dry-run` |
| 2 | Вывод `node dist/cli.js changelog` и `node dist/cli.js --version` корректен (`1.0.0`) | `node dist/cli.js --version && node dist/cli.js changelog` |
| 3 | Полный цикл `make ci` проходит с 0 ошибок | `make ci` |
