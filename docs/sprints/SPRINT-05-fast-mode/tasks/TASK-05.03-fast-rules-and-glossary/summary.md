# Summary: TASK-05.03 — Исключение `/l1-fast` в правилах, словаре, шаблоне роадмапа и соседних скиллах и синхронизация EN `/l1-planning`

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-05.03` |
| **ID шага спеки** | `FEAT-006.03` ([`docs/specs/FEAT-006-fast-mode/tasks.md`](../../../../specs/FEAT-006-fast-mode/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-05`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-006`](../../../../backlog.md#feat-006) ([`docs/specs/FEAT-006-fast-mode/`](../../../../specs/FEAT-006-fast-mode/)) |
| **ID родительской идеи** | [`IDEA-005`](../../../../ideas.md#idea-005) |
| **План задачи** | [`plan.md`](./plan.md) |
| **Статус задачи** | `✅ реализована` |
| **Дата закрытия** | 2026-11-08 |

---

## 1. Что реализовано

- `assets/i18n/en/skills/l1-planning/SKILL.md` — шаги 1–5 и Exit Gate полностью синхронизированы с RU-версией (нумерованные списки в шагах 1–2, блок markdown-шаблона в шаге 3, подразделы `### Location 1..4` в шаге 4 и 5 пунктов чек-листа в шаге 5).
- `tests/planning-reject.test.ts` — страж совпадения формы RU/EN расширен с ветки отклонения на весь файл `skills/l1-planning/SKILL.md` (`Seam 4`).
- `assets/i18n/{ru,en}/skills/l1-fast/SKILL.md` — во frontmatter `description` и в «Правиле для модели» жёстко зафиксировано, что `/l1-fast` вызывает **строго только человек**, а агенту запускать или выбирать `/l1-fast` по своей инициативе **запрещено**.
- `assets/i18n/{ru,en}/rules/00-methodology.mdc` — строка **`/l1-fast`** в таблице команд и упоминание отклонения спринта в **`/l1-planning`**.
- `assets/i18n/{ru,en}/rules/20-workflow.mdc` — исключение `/l1-fast` в `Roadmap Gate` (вызывает строго человек, только при пустой `1 (CURRENT)`), ветка отклонения спринта в Цепочке 3 (`Flow 3`) и `ЦЕПОЧКА 7: /l1-fast` (`Flow 7 (/l1-fast)`).
- `assets/i18n/{ru,en}/rules/40-skills-router.mdc` и `l1dder/rules/40-skills-router.mdc` — строка `/l1-fast` в разделе 0, дополнение к `/l1-planning` и пункт 3 «Как использовать» (`How to use` добавлен в EN-версию).
- `assets/i18n/{ru,en}/GLOSSARY.md` — статья про `/l1-fast` (`## Быстрый режим (/l1-fast)` / `## Fast Mode (/l1-fast)`), уточнение `Roadmap Gate`, правила двух согласований и отклонения спринта.
- `assets/i18n/{ru,en}/templates/roadmap/roadmap-template.md`, `assets/i18n/{ru,en}/skills/l1-task/SKILL.md`, `assets/i18n/{ru,en}/skills/l1-hotfix/SKILL.md` — исключение `/l1-fast` (вызывает строго только человек при пустой `1 (CURRENT)`) и граница с `/l1-hotfix` и `/l1-chore`.
- `src/agents.ts` — уточнены правило `Roadmap Gate`, строка `/l1-fast` и строка `/l1-planning` в `buildEntryPointSummary()`.
- `docs/specs/FEAT-006-fast-mode/design.md` и `requirements.md` — сверены шаги `agent` для будущего релиза и зафиксировано правило «вызывает строго человек, агенту запрещено».
- `tests/fast-skill.test.ts` — добавлены тесты `Seam 3` (49 тестов всего).

---

## 2. Отклонения от плана

- **Запрет автозапуска `/l1-fast` агентом (по замечанию пользователя на `⛔ СТОП №2`).** Чтобы модель при пустой позиции `1 (CURRENT)` не выбирала `/l1-fast` сама вместо обычного пути `/l1-idea` → `/l1-feature`, во всех файлах (включая `description` и шапку самого скилла `l1-fast/SKILL.md`, правила `00/20/40`, словарь, шаблон роадмапа, соседние скиллы и сводку `AGENTS.md` / `CLAUDE.md`) жёстко прописано, что `/l1-fast` вызывает строго только человек, а для агента запускать его по своей инициативе запрещено.

---

## 3. Принятые решения (и влияние на долгосрочную документацию)

| Решение | Причина | Отражено ли в `concept/` / `specs/` / `ADR-NNNN` |
|---------|---------|--------------------------------------------------|
| `/l1-fast` вызывает строго только человек; из `description` скилла убрано `or asks to quickly build a small feature` | Иначе при пустой `1 (CURRENT)` модель может сама свернуть в `/l1-fast` вместо основного пути `/l1-idea` → `/l1-feature` | [`requirements.md`](../../../../specs/FEAT-006-fast-mode/requirements.md) (`US-6`), [`design.md`](../../../../specs/FEAT-006-fast-mode/design.md) |
| В `en/rules/40-skills-router.mdc` добавлен раздел `## How to use`, а шаг 2 `agent` в `design.md` помечен условным (`if a "How to use" section is present`) | В проектах `v1.0–1.2` на EN секции `How to use` не было — так новые EN-проекты синхронны с RU, а старые не падают при `update` | [`design.md`](../../../../specs/FEAT-006-fast-mode/design.md) |

---

## 4. Проблемы и решения

| Проблема | Как решили |
|----------|-----------|
| В `en/rules/00-methodology.mdc` и `en/rules/20-workflow.mdc` фраза стояла с заглавной буквы (`Strictly human-invoked`), а тест искал `strictly human-invoked` | Выровняли регистр фразы внутри предложения на строчный во всех EN-файлах |

---

## 5. Итог прохождения DoD

| # | Критерий из `plan.md` | Результат |
|---|-----------------------|:---------:|
| 1 | Страж RU/EN в `tests/planning-reject.test.ts` проверяет весь `skills/l1-planning/SKILL.md` (`Seam 4`) | ✅ 15/15 |
| 2 | Контракт `Seam 3` в `tests/fast-skill.test.ts` проверяет `00/20/40-*.mdc`, `GLOSSARY.md`, `roadmap-template.md`, `l1-task/SKILL.md` и `l1-hotfix/SKILL.md` на RU и EN | ✅ 49/49 |
| 3 | Шаги `agent` в `docs/specs/FEAT-006-fast-mode/design.md` сверены символ-в-символ с `40-skills-router.mdc` | ✅ |
| 4 | Линтер и проверка типов (`make lint && make typecheck`) | ✅ |
| 5 | Полный цикл `make ci` + `make site-gate` (302 теста, сайт 18 страниц, `doctor`) | ✅ |

---

## 6. Обязательный чек-лист синхронизации трекеров по цепочке ID (Exit Gate)

- [x] **1. `docs/sprints/SPRINT-05-fast-mode/README.md`:** у строки `TASK-05.03` (`FEAT-006.03`) статус изменён на `✅ реализована`, добавлена ссылка на этот `summary.md`.
- [x] **2. `docs/specs/FEAT-006-fast-mode/tasks.md`:** у шага `FEAT-006.03` поставлена галочка `[x]`.
- [x] **3. `docs/backlog.md`:** у строки `FEAT-006.03` / `TASK-05.03` статус изменён на `✅ реализована`, добавлена ссылка на `summary.md`.
- [x] **4. `docs/roadmap.md`:** в строке `SPRINT-05` обновлён счётчик прогресса задач (`3/4 (+ TASK-05.99)`).
- [ ] **5. Не применимо:** это не `TASK-05.99`.

---

## 7. Что дальше по Роадмапу (`docs/roadmap.md`)

- Следующая задача в очереди: `TASK-05.04` (`FEAT-006.04`) — `/l1-fast` и отклонение спринта простым языком в `README`, `METHODOLOGY.md`, `user-guide/*` и на сайте.
