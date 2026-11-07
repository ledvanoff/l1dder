# Summary: TASK-04.99 — Гигиена спринта и Doctor Checklist

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-04.99` |
| **ID шага спеки** | `FEAT-005.99` ([`docs/specs/FEAT-005-chore-command/tasks.md`](../../../../specs/FEAT-005-chore-command/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-04`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-005`](../../../../backlog.md#feat-005) ([`docs/specs/FEAT-005-chore-command/`](../../../../specs/FEAT-005-chore-command/)) |
| **ID родительской идеи** | [`IDEA-004`](../../../../ideas.md#idea-004) |
| **План задачи** | [`plan.md`](./plan.md) |
| **Статус задачи** | `✅ реализована` |
| **Дата закрытия** | 2026-11-07 |

---

## 1. Что реализовано

- **Блок 1 (`Code & Repo Doctor`):** `make ci` и `make site-gate` (234 теста, сборка и проверка 18 страниц сайта, `doctor`) пройдены с 0 ошибок. Двухосевой `code-review` (`Standards` + `ponytail-audit` и `Spec`) диффа `38a8f3e...HEAD` подтвердил отсутствие жёстких нарушений; ревизия `ponytail-debt` нашла 3 маркера `shortcut:` (все с явным условием пересмотра).
- **Блок 2 (`Agent E2E Verification`):** проведены живые пошаговые E2E-прогоны в изолированных песочницах `playground/sandboxes/` на быстрых моделях:
  - Песочница 1 (`opencode-go/qwen3.8-flash`): проверка отказа на продуктовой правке (`US-1`, `US-5` — попытка добавить транслитерацию в `slugify()` через `/l1-chore`), планирования настоящей служебной правки (`check-node` в `Makefile`) с вариантами и карточкой `CHORE-001` до «ок» (`US-2`), а после «ок» — выполнения правки, прогона `make ci`, автосоздания раздела `## 4. Журнал служебных правок (CHORE-NNN)` с 4 колонками в старом `docs/backlog.md` и записи `CHORE-001` (`US-2`, `US-3`).
  - Песочница 2 (`opencode-go/kimi-k2.7-code`): проверка выполнения блока «🤖 Инструкция для ИИ-агента после обновления» при переходе `1.0.3 → 1.2.0` (`US-6` — агент добавил строку `/l1-chore` в Раздел 0 защищённого `40-skills-router.mdc`, сохранив кастомный стек-скилл в Разделе 2, и синхронизировал папки агентов).
- **Блок 3 (`Living Docs Sync` + `retro`):**
  - `docs/concept/{idea,vision,architecture,data-model}.md` — убраны устаревшие числа скиллов и команд, добавлен `/l1-chore`, отражены `formatAgentUpdateSteps()` и обязательное поле `agent` в `assets/releases.json`.
  - `assets/i18n/{ru,en}/METHODOLOGY.md`, `skills/l1-task/SKILL.md`, `tests/chore-skill.test.ts` — в шапке `METHODOLOGY.md` и подсказке отказа `Roadmap Gate` названы оба исключения (`/l1-hotfix` и `/l1-chore`), регулярка `ONLY_EXCEPTION` в страж-тесте расширена.
  - `assets/i18n/ru/README.md`, `assets/i18n/{ru,en}/user-guide/README.md`, `site/{agents-cli,en/agents-cli}.md`, `assets/i18n/en/GLOSSARY.md` — дописаны `/l1-chore` и `CHORE-001` в оглавлении и таблице трёх экранов, добавлено описание блока 🤖 после `npx l1dder@latest update` и статья `Hotfix` в EN-словарь.
- **Блок 4 (`Human UAT`):** пользователь просмотрел полный лог ответов обеих моделей, подтвердил приёмку («ок»), песочницы `playground/sandboxes/` очищены.

---

## 2. Отклонения от плана

Без отклонений.

---

## 3. Принятые решения (и влияние на долгосрочную документацию)

| Решение | Причина | Отражено ли в `concept/` / `specs/` / `ADR-NNNN` |
|---------|---------|--------------------------------------------------|
| Расширить регулярку `ONLY_EXCEPTION` в `tests/chore-skill.test.ts` | На Spec-ревью в шапке `METHODOLOGY.md` нашлась формулировка `(кроме /l1-hotfix)` / `(except /l1-hotfix)` | `tests/chore-skill.test.ts`, `METHODOLOGY.md` |
| Вписать готовый шаг `agent` из `design.md` в `assets/releases.json` при выпуске следующего релиза | Чтобы существующие проекты при `update` получили строку `/l1-chore` в защищённом `40-skills-router.mdc` | `docs/specs/FEAT-005-chore-command/design.md` |

---

## 4. Проблемы и решения

| Проблема | Как решили |
|----------|-----------|
| В `METHODOLOGY.md:4`, `l1-task/SKILL.md` и паре строк `user-guide/README.md` оставалось упоминание только `/l1-hotfix` | Найдено на двухосевом `code-review` (`Spec`), синхронизировано на RU и EN и прикрыто страж-тестом |

---

## 5. Итог прохождения DoD

| # | Критерий из `plan.md` | Результат |
|---|-----------------------|:---------:|
| 1 | Полный цикл качества и сборки проходит с 0 ошибок (`make ci` + `make site-gate`) | ✅ |
| 2 | Живой E2E-прогон `/l1-chore` и блока 🤖 (`US-1`..`US-6`) на быстрых моделях (`Qwen3.8 Flash` и `Kimi K2.7 Code`) проходит по контракту спеки | ✅ |
| 3 | Долгосрочная документация (`concept/`, `specs/`, `l1dder/rules/`) сверена и синхронизирована | ✅ |

---

## 6. Обязательный чек-лист синхронизации трекеров по цепочке ID (Exit Gate)

- [x] **1. `docs/sprints/SPRINT-04-chore-command/README.md`:** у `TASK-04.99` и `SPRINT-04` статус `✅ реализована`, добавлена ссылка на этот `summary.md`.
- [x] **2. `docs/specs/FEAT-005-chore-command/tasks.md` и `requirements.md`:** у `FEAT-005.99` стоит `[x]`, статус `FEAT-005` — `✅ реализована`.
- [x] **3. `docs/backlog.md`:** у `FEAT-005.99` / `TASK-04.99`, `SPRINT-04` и `FEAT-005` статус `✅ реализована`, добавлена ссылка на `summary.md`.
- [x] **4. `docs/roadmap.md`:** `SPRINT-04` перенесён в «4. Завершённые спринты».
- [x] **5. `docs/ideas.md`:** статус `IDEA-004` изменён на `✅ реализована`.

---

## 7. Что дальше по Роадмапу (`docs/roadmap.md`)

- Очередь реализации пуста (`SPRINT-04` закрыт).
- Следующий шаг: проработка следующей идеи из `Discovery Queue` (`/l1-feature IDEA-005` — режим `/l1-fast`) или выпуск релиза по отдельной просьбе пользователя.
