# SPRINT-01: Гигиенический спринт — тест на 2 моделях (Composer и Grok), аудит `ponytail` и выкатка `v1.0.0`

| Поле паспорта спринта | Значение |
|-----------------------|----------|
| **ID спринта** | `SPRINT-01` |
| **ID родительской фичи / спеки** | [`FEAT-002`](../../backlog.md#feat-002) ([`docs/specs/FEAT-002-release-hygiene-v1/`](../../specs/FEAT-002-release-hygiene-v1/)) |
| **ID родительской идеи** | [`IDEA-002`](../../ideas.md#idea-002) |
| **Позиция в Роадмапе** | [`docs/roadmap.md`](../../roadmap.md) |
| **Статус спринта** | `✅ реализована` |
| **Дата открытия / закрытия** | 2026-10-21 / 2026-10-21 |

---

## 1. Цель спринта

Подготовить изолированный полигон `playground/`, провести полностью автоматический тест методологии `L1DDER` на двух разных моделях (`Composer` и `Grok`), прогнать кодовую базу и все 20 скиллов через `ponytail` (`ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`) с исправлением всех найденных косяков, и подготовить релиз `l1dder@1.0.0`.

---

## 2. Критерии готовности спринта (Sprint DoD)

| # | Критерий | Способ проверки |
|---|----------|-----------------|
| 1 | Полигон `playground/` подготовлен, и обе модели (`Composer` и `Grok`) прошли полный цикл `L1DDER` с 0 ошибок верификатора (`14/14`) | `node playground/verify.mjs` |
| 2 | Проведён аудит кода и всех 20 скиллов через `ponytail` (`ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`), все замечания исправлены | `make ci` |
| 3 | Пакет `l1dder@1.0.0` проверен через `npm pack --dry-run` и готов к публикации в GitHub и npm | `npm pack --dry-run` |
| 4 | **Doctor Checklist & E2E (`TASK-01.99`):** `make ci` + Living Docs Sync + Human UAT | `make ci` |

---

## 3. Таблица задач спринта (`TASK-01.MM` ↔ `FEAT-002.MM`)

| ID задачи спринта | ID шага спеки | Название задачи | Тип | Статус | Plan | Summary |
|:-----------------:|:-------------:|-----------------|:---:|--------|------|---------|
| `TASK-01.01` | `FEAT-002.01` | Подготовка `playground/` и полностью автоматический тест методологии на 2 моделях (`Composer` и `Grok`) | `feat` | ✅ реализована | [plan](tasks/TASK-01.01-playground-dual-model-test/plan.md) | [summary](tasks/TASK-01.01-playground-dual-model-test/summary.md) |
| `TASK-01.02` | `FEAT-002.02` | Прогонка кодовой базы и всех 20 скиллов через `ponytail` (`ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`) и исправление косяков | `refactor` | ✅ реализована | [plan](tasks/TASK-01.02-ponytail-skills-audit/plan.md) | [summary](tasks/TASK-01.02-ponytail-skills-audit/summary.md) |
| `TASK-01.03` | `FEAT-002.03` | Подготовка и выкатка релиза `l1dder@1.0.0` (`npm pack`, `CHANGELOG.md`, `releases.json`, git и деплой) | `chore` | ✅ реализована | [plan](tasks/TASK-01.03-release-v1-0-0/plan.md) | [summary](tasks/TASK-01.03-release-v1-0-0/summary.md) |
| `TASK-01.99` | `FEAT-002.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** | `chore` | ✅ реализована | [plan](tasks/TASK-01.99-doctor/plan.md) | [summary](tasks/TASK-01.99-doctor/summary.md) |

---

## 4. Итог спринта

- **Что поставлено по `FEAT-002` (`IDEA-002`):** созданы `playground/prepare.mjs` и `playground/verify.mjs` (14 инвариантов); проведён полный трёхходовой E2E-прогон на двух разных моделях (`Composer` и `Grok` — обе `14/14`); проведён аудит `ponytail-audit` + `code-review` по всем 20 скиллам и коду `src/`; проверен релизный пакет `l1dder-1.0.0.tgz`.
- **Обновления в долгосрочной доке (`concept` / `rules` / `specs`):** синхронизированы `docs/concept/*`, `l1dder/rules/30-tech-stack.mdc` и все 20 скиллов в `assets/i18n/{ru,en}/`.
