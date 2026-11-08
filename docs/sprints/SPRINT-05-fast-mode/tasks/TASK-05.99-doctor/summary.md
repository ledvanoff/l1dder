# Summary: TASK-05.99 — Гигиена спринта и Doctor Checklist

| Поле паспорта задачи | Значение |
|----------------------|----------|
| **ID задачи спринта** | `TASK-05.99` |
| **ID шага спеки** | `FEAT-006.99` ([`docs/specs/FEAT-006-fast-mode/tasks.md`](../../../../specs/FEAT-006-fast-mode/tasks.md)) |
| **ID родительского спринта** | [`SPRINT-05`](../../README.md) |
| **ID родительской фичи / спеки** | [`FEAT-006`](../../../../backlog.md#feat-006) ([`docs/specs/FEAT-006-fast-mode/`](../../../../specs/FEAT-006-fast-mode/)) |
| **ID родительской идеи** | [`IDEA-005`](../../../../ideas.md#idea-005) |
| **План задачи** | [`plan.md`](./plan.md) |
| **Статус задачи** | `✅ реализована` |
| **Дата закрытия** | 2026-11-08 |

---

## 1. Что реализовано

- **Блок 1 (`Code & Repo Doctor`):** `make ci && make site-gate` (324 теста, сборка и проверка 18 страниц сайта не хуже снимка `docs/site-baseline.json`, `doctor`) пройдены с 0 ошибок. Проведено параллельное двухосевое ревью `code-review` (`Standards` + `ponytail-audit` и `Spec`) диффа `1bc4842...HEAD`: найдены и исправлены канонические заголовки английских шаблонов (`1. Active Pointer`, `5. Roadmap Changelog`, `Sprint Outcome`) в `assets/i18n/en/skills/l1-fast/SKILL.md`. Ревизия `ponytail-debt` нашла 3 существующих маркера `shortcut:` (0 новых, 0 без триггера).
- **Блок 2 (`Agent E2E Verification`):** проведены живые пошаговые E2E-прогоны в изолированных git-песочницах `playground/sandboxes/qwen` и `playground/sandboxes/kimi` на двух быстрых моделях (`opencode-go/qwen3.8-flash` и `opencode-go/kimi-k2.7-code`):
  1. **Сценарий 1 (`US-1`):** вызов `/l1-fast` при занятой `1 (CURRENT)` (`SPRINT-01` в работе) → строгий отказ без изменения файлов и указание двух выходов (`/l1-task` или отклонение через `/l1-planning`).
  2. **Сценарий 2 (`US-5`):** отклонение `SPRINT-01` через `/l1-planning` → поиск начала спринта через `git log -S "SPRINT-01"`, карточка и `⛔ СТОП` → после «ок» откат коммита кода через `git revert --no-commit` с сохранением документов, `make ci`, статус `❌ отклонена` у спринта и задач, возврат `FEAT-001` в `📋 в бэклоге` и `IDEA-001` в `📋 нереализована`, освобождение `1 (CURRENT)` и коммит `revert(slugify): reject SPRINT-01`.
  3. **Сценарий 3 (`US-2`..`US-4`):** полный цикл `/l1-fast` при пустой `1 (CURRENT)` (`truncateSlug`) → оценка масштаба, карточка `FEAT-002` и `⛔ СТОП №1` → бронь и коммит `chore(roadmap): reserve SPRINT-02 for /l1-fast` → TDD-реализация и коммит `TASK-02.01` → все 8 проверок Шага 6 и `⛔ СТОП №2` со сценарием ручной проверки и 2-строчным футером `Ponytail skipped / Risk` → запись всей цепочки реестров с `Режим | /l1-fast`, перенос `SPRINT-02` в «Завершённые спринты», `make ci`, `make doctor`, коммит `docs(...): record FEAT-002 built in /l1-fast`.
  4. **Сценарий 4 (`US-6`):** запрос небольшой фичи (`isValidSlug`) в чате без команды `/l1-fast` при пустой `1 (CURRENT)` → обе модели отказались запускать `/l1-fast` по своей инициативе («вызывает строго только человек») и предложили обычный путь `/l1-idea` → `/l1-feature` → `/l1-planning` → `/l1-task`.
- **Блок 3 (`Living Docs Sync` + `retro`):**
  - Обновлены `docs/concept/idea.md`, `docs/concept/vision.md`, `docs/concept/data-model.md`, `docs/adrs/ADR-0002-sprint-rejection-rollback.md` и `docs/specs/FEAT-006-fast-mode/{requirements,design}.md`.
- **Блок 4 (`Human UAT`):** пользователь просмотрел отчёт и лог E2E-прогонов обеих моделей, подтвердил приёмку («ок»), временные песочницы `playground/sandboxes/` очищены.

---

## 2. Отклонения от плана

Без отклонений.

---

## 3. Принятые решения (и влияние на долгосрочную документацию)

| Решение | Причина | Отражено ли в `concept/` / `specs/` / `ADR-NNNN` |
|---------|---------|--------------------------------------------------|
| Выровнять заголовки разделов в `en/skills/l1-fast/SKILL.md` (`1. Active Pointer`, `5. Roadmap Changelog`, `Sprint Outcome`) с английскими шаблонами | Найдено на `Standards`-оси двухосевого `code-review` (`Ubiquitous Language`) | `assets/i18n/en/skills/l1-fast/SKILL.md` |
| Дополнить `ADR-0002` правилом поиска начала спринта через `git log -S` и избирательным возвратом путей `docs/` | Одинаково работает для обычного и быстрого спринта и не затирает незакоммиченные документы из соседней вкладки | [`ADR-0002`](../../../../adrs/ADR-0002-sprint-rejection-rollback.md) |

---

## 4. Проблемы и решения

| Проблема | Как решили |
|----------|-----------|
| Буквальные переводы заголовков разделов в `en/skills/l1-fast/SKILL.md` (`Current focus`, `Roadmap change history`, `Sprint summary`) | Заменены на точные заголовки из `en/templates/roadmap/roadmap-template.md` и `sprint-template.md` |

---

## 5. Итог прохождения DoD

| # | Критерий из `plan.md` | Результат |
|---|-----------------------|:---------:|
| 1 | Полный цикл качества и сборки проходит с 0 ошибок (`make ci && make site-gate`) | ✅ |
| 2 | Двухосевой `code-review`, `ponytail-audit` и `ponytail-debt` пройдены без блокеров | ✅ |
| 3 | Живой E2E-прогон всех сценариев `FEAT-006` (`US-1`..`US-6`) на двух быстрых моделях (`Qwen3.8 Flash` и `Kimi K2.7 Code`) проходит по контракту спеки | ✅ |
| 4 | Долгосрочная документация (`docs/concept/`, `docs/adrs/ADR-0002`, `docs/specs/FEAT-006-fast-mode/`, `l1dder/rules/`) синхронизирована | ✅ |

---

## 6. Обязательный чек-лист синхронизации трекеров по цепочке ID (Exit Gate)

- [x] **1. `docs/sprints/SPRINT-05-fast-mode/README.md`:** у `TASK-05.99` и `SPRINT-05` статус изменён на `✅ реализована`, добавлена ссылка на этот `summary.md`.
- [x] **2. `docs/specs/FEAT-006-fast-mode/tasks.md` и `requirements.md`:** у шага `FEAT-006.99` поставлена галочка `[x]`, статус `FEAT-006` — `✅ реализована`.
- [x] **3. `docs/backlog.md`:** у `FEAT-006.99` / `TASK-05.99`, `SPRINT-05` и `FEAT-006` статус изменён на `✅ реализована`, добавлена ссылка на `summary.md`.
- [x] **4. `docs/roadmap.md`:** `SPRINT-05` перенесён в «4. Завершённые спринты», позиция `1 (CURRENT)` освобождена.
- [x] **5. `docs/ideas.md`:** статус `IDEA-005` изменён на `✅ реализована`.

---

## 7. Что дальше по Роадмапу (`docs/roadmap.md`)

- Очередь реализации пуста (`SPRINT-05` закрыт).
- Следующий шаг: проработка следующей идеи из `Discovery Queue` (`/l1-feature IDEA-007`) или выпуск релиза по отдельной просьбе пользователя.
