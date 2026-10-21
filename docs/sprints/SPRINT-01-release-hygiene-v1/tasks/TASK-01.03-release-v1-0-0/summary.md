# Summary: TASK-01.03 — Подготовка и выкатка релиза `l1dder@1.0.0`

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-01.03` |
| **ID шага спеки** | `FEAT-002.03` ([`docs/specs/FEAT-002-release-hygiene-v1/tasks.md`](../../../../specs/FEAT-002-release-hygiene-v1/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-01`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-002`](../../../../backlog.md#feat-002) ([`docs/specs/FEAT-002-release-hygiene-v1/`](../../../../specs/FEAT-002-release-hygiene-v1/)) |
| **ID родительской идеи** | [`IDEA-002`](../../../../ideas.md#idea-002) |
| **План задачи** | [`plan.md`](./plan.md) |
| **Статус задачи** | `✅ реализована` |
| **Дата закрытия** | 2026-10-21 |

---

## 1. Что реализовано

- Проверен состав npm-пакета `l1dder@1.0.0` через `npm pack --dry-run`: в тарбол входят ровно `dist/cli.js`, `assets/releases.json`, `assets/i18n/{ru,en}/**` (все 20 скиллов со справочниками, правила, шаблоны и гайды), `README.md`, `CHANGELOG.md`, `LICENSE`. Песочницы `playground/` и `node_modules/` не попадают в пакет.
- Проверены `.github/workflows/ci.yml`, `docs.yml` (деплой сайта VitePress на GitHub Pages) и `publish.yml` (публикация в npmjs через OIDC Trusted Publishing с provenance при пуше тега `v1.0.0`).

---

## 2. Итог прохождения DoD

| # | Критерий из `plan.md` | Результат |
|---|-----------------------|:---------:|
| 1 | `npm pack --dry-run` формирует чистый пакет `l1dder-1.0.0.tgz` | ✅ |
| 2 | `node dist/cli.js --version` (`1.0.0`) и `node dist/cli.js changelog` работают корректно | ✅ |
| 3 | Полный цикл `make ci` проходит с 0 ошибок | ✅ |
