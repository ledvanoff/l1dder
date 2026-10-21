# TASK-01.01: Подготовка `playground/` и полностью автоматический тест методологии на 2 моделях (`Composer` и `Grok`) — План (Plan)

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-01.01` |
| **ID шага спеки** | `FEAT-002.01` ([`docs/specs/FEAT-002-release-hygiene-v1/tasks.md`](../../../../specs/FEAT-002-release-hygiene-v1/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-01`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-002`](../../../../backlog.md#feat-002) ([`docs/specs/FEAT-002-release-hygiene-v1/`](../../../../specs/FEAT-002-release-hygiene-v1/)) |
| **ID родительской идеи** | [`IDEA-002`](../../../../ideas.md#idea-002) |
| **Тип задачи** | `feat` |
| **Статус задачи** | `📋 запланирована` |
| **Git-ветка** | `feat/playground-TASK-01.01-dual-model-test` |
| **Прочитанные скиллы (`40-skills-router.mdc`)** | `ponytail`, `codebase-design`, `tdd` |

---

## 1. Цель задачи и фильтр `ponytail` (6-Step Decision Ladder)

**Цель:** Создать изолированный полигон `playground/` (`prepare.mjs` + `verify.mjs`) и провести полностью автоматический сквозной тест методологии `L1DDER` параллельно на двух разных быстрых моделях (**`Composer`** и **`Grok`**), проверив соблюдение стандарта `ID Passport`, структуры `docs/` и работоспособность кода.

**Фильтр `ponytail`:**
- **Что переиспользуем:** встроенный `node:fs`, `node:child_process`, наш собранный `dist/cli.js` и нативный запуск двух параллельных субагентов (`Composer` и `Grok`).
- **От чего намеренно отказываемся (`Ponytail skipped` / YAGNI):** не пишем внешних HTTP-обёрток к OpenAI/xAI API с ключами — запускаем реальных агентов `Composer` и `Grok` напрямую в изолированных песочницах `playground/sandboxes/{composer,grok}` и валидируем результат детерминированным скриптом `playground/verify.mjs`.
- **Публичные швы для тестирования (`Pre-agreed Test Seams`):**
  1. `node playground/prepare.mjs` — создаёт идентичные стартовые мини-проекты в `playground/sandboxes/composer` и `playground/sandboxes/grok` и выполняет в них `l1dder init --lang ru --yes`.
  2. `node playground/verify.mjs` — проверяет 12 инвариантов в каждой песочнице (наличие и формат `IDEA-001` в `docs/ideas.md`, спеки `docs/specs/FEAT-001-*/{requirements,design,tasks}.md` с `FEAT-001.99`, `docs/backlog.md`, `docs/roadmap.md`, `docs/sprints/SPRINT-01-*/README.md`, `plan.md`, `summary.md` с полными `ID Passport`, а также запуск unit-тестов реализованной моделями функции).

---

## 2. Состав работ (Пошаговый чек-лист)

- [ ] Шаг 1: Добавить `playground/sandboxes/` в `.gitignore` и создать скрипт `playground/prepare.mjs`, инициализирующий песочницы `composer` и `grok`.
- [ ] Шаг 2: Создать строгий автоматический верификатор `playground/verify.mjs` (12 проверок соблюдения `L1DDER` и `ID Passport`) и добавить скрипты `"playground:prepare"` и `"playground:verify"` в `package.json`.
- [ ] Шаг 3: Запустить параллельно две модели (**`Composer`** и **`Grok`**) на одинаковом сквозном задании в их песочницах (`IDEA-001 → FEAT-001 → SPRINT-01 → TASK-01.01 + код и тест`).
- [ ] Шаг 4: Прогнать `node playground/verify.mjs` и `make ci`. Если какая-то из моделей допустила неточность из-за формулировки в скилле — зафиксировать это для исправления.
- [ ] ⛔ **СТОП №2:** Показать пользователю таблицу результатов `playground/verify.mjs` по обеим моделям (`Composer` vs `Grok`) + 2-строчный футер `ponytail` и дождаться слова «ок».

---

## 3. Критерии готовности (DoD)

| # | Критерий | Точная команда / способ проверки |
|---|----------|----------------------------------|
| 1 | Песочницы `composer` и `grok` инициализируются без ошибок | `node playground/prepare.mjs` |
| 2 | Оба прогона (`Composer` и `Grok`) проходят все 12 проверок `L1DDER` (ID Passport, спека, бэклог, роадмап, спринт, план, саммари, тесты кода) | `node playground/verify.mjs` |
| 3 | Полный цикл качества репозитория проходит с 0 ошибок | `make ci` |

---

## 4. Артефакты и границы Scope

**Трогаем:**
- `playground/prepare.mjs` — подготовка песочниц для `Composer` и `Grok`
- `playground/verify.mjs` — автоматическая проверка 12 инвариантов `L1DDER`
- `.gitignore` и `package.json` — игнорирование `playground/sandboxes/` и npm-скрипты

**НЕ трогаем (вне Scope этой задачи):**
- Релизный тег и публикация в npm (это `TASK-01.03`).
