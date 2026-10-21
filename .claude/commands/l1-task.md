---
description: "Executes the next scheduled task TASK-NN.MM from the active sprint in docs/roadmap.md following the L1DDER 4-phase workflow (Plan -> Implement with codebase-design & vertical TDD at seams -> Self-check -> Summary), including the mandatory final Sprint Hygiene & Doctor Checklist task (TASK-NN.99: two-axis code-review, Agent E2E, Living Docs Sync, retro, and Human UAT). Use when the user invokes /l1-task."
---

# L1DDER — Цепочка 4: Задача и Гигиена спринта (`/l1-task`)

> **ПРАВИЛО ДЛЯ МОДЕЛИ:** Выполняй инструкцию строго по шагам. На каждой задаче обязательно останавливайся **ДВА РАЗА**:
> - `⛔ СТОП №1` — после создания `plan.md` (до написания кода).
> - `⛔ СТОП №2` — после самопроверки DoD / подготовки Human UAT (до создания `summary.md` и закрытия задачи).

---

## ШАГ 0: Проверка `Roadmap Gate` и определение активной цепочки ID

1. Прочитай через `Read` файлы `docs/roadmap.md` и `docs/backlog.md`.
2. Посмотри на строку **`1 (CURRENT)`** в таблице `2. Очередь реализации (Delivery Queue)` файла `docs/roadmap.md`.
3. Выпиши из этой строки **3 родительских ID**:
   - `SPRINT-NN` (например, `SPRINT-01`)
   - `FEAT-NNN` (например, `FEAT-001`)
   - `IDEA-NNN` (например, `IDEA-001`)
4. **Проверка `Roadmap Gate`:** Если пользователь просит сделать задачу из другого спринта или другой фичи (не из строки `1 (CURRENT)`):
   - ⛔ **Остановись** и ответь: *«По правилу Roadmap Gate мы берём задачи только из текущего спринта `1 (CURRENT)` в `docs/roadmap.md`. Сначала вызови `/l1-planning` для смены очереди (или `/l1-hotfix` для срочного бага).»*
5. Открой `docs/sprints/SPRINT-NN-<slug>/README.md` и найди первую задачу со статусом `📋 запланирована` (или активную `🚧 реализация`). Выпиши её парные ID:
   - `TASK-NN.MM` (например, `TASK-01.01`)
   - `FEAT-NNN.MM` (например, `FEAT-001.01`)
6. Выбери ветку выполнения:
   - Если `TASK-NN.MM` НЕ заканчивается на `.99` → иди по **ВЕТКЕ А (Обычная задача)**.
   - Если это `TASK-NN.99` → иди по **ВЕТКЕ Б (Обязательный финал спринта: `Doctor Checklist`)**.

---

## ВЕТКА А: Обычная задача (`TASK-NN.01 .. TASK-NN.K`)

### Фаза А.1 — Планирование (`Plan`) + `⛔ СТОП №1`
1. Прочитай `docs/specs/FEAT-NNN-<slug>/{requirements,design,tasks}.md` (обрати особое внимание на согласованные публичные швы тестирования `Pre-agreed Test Seams` в `design.md`).
2. Открой `l1dder/rules/40-skills-router.mdc`, выбери нужные скиллы под задачу и прочитай их `SKILL.md` через `Read` (`l1dder/skills/ponytail/SKILL.md` + профильные скиллы стека).
3. Создай файл `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.MM-<slug>/plan.md` строго по шаблону `l1dder/templates/tasks/plan-template.md`.
   - Имя папки задачи **обязано начинаться с `TASK-NN.MM-`** (например, `tasks/TASK-01.01-search-filter/plan.md`).
   - В начале `plan.md` заполни все 5 ID паспорта: `TASK-NN.MM`, `FEAT-NNN.MM`, `SPRINT-NN`, `FEAT-NNN`, `IDEA-NNN`.
   - Явно укажи тестируемые публичные швы (`Test Seams`).
4. ⛔ **СТОП №1:** Покажи пользователю план задачи в чате и спроси: *«План `TASK-NN.MM` готов. Начинаем реализацию (ок / правки)?»* Не пиши код до ответа «ок».

### Фаза А.2 — Реализация (`Implement`: `ponytail` + `codebase-design` + `tdd`) *(ТОЛЬКО после первого «ок»)*
1. Обнови статус `TASK-NN.MM` на `🚧 реализация` в `docs/sprints/SPRINT-NN-<slug>/README.md` и `docs/backlog.md` (а если это первая задача спринта — также поставь `🚧 реализация` для `SPRINT-NN` и `FEAT-NNN`).
2. Внеси изменения строго в файлы из раздела `Артефакты / Scope` плана:
   - Проектируй глубокие модули с простым публичным интерфейсом (`codebase-design`) и без лишнего кода (`ponytail`).
   - Для логики и вычислений иди вертикальными срезами (`tdd`): `1 публичный шов → 1 падающий тест (RED) → минимальная реализация (GREEN)`. Никаких тавтологичных тестов и моков приватных методов!
3. Для каждого изменённого файла выполни цикл `Edit → Sanitize → Verify` (`make lint`, `make typecheck`, `make test`).

### Фаза А.3 — Самопроверка (`Self-check` + `ponytail-review`) + `⛔ СТОП №2`
1. Выполни все проверки из таблицы DoD в `plan.md` (`make lint && make typecheck && make test && make build` + проверка в браузере/окружении для пользовательских изменений).
2. Проверь свой дифф по чек-листу `l1dder/skills/ponytail-review/SKILL.md` (все вызывающие функции `callers` проверены, лишних обёрток нет, осознанные срезы помечены `// shortcut: <what>, <limit>`).
3. ⛔ **СТОП №2:** Выведи в чат таблицу результатов DoD, завершив сообщение **обязательным 2-строчным футером `ponytail`**:
   - **Ponytail skipped (что намеренно не делали/не проверяли):** `[1 строка]`
   - **Risk (какой лимит/риск нужно знать пользователю):** `[1 строка]`
   Спроси: *«Самопроверка `TASK-NN.MM` пройдена. Фиксируем `summary.md` и закрываем задачу (ок / замечания)?»*

### Фаза А.4 — Фиксация (`Confirm & Record`) *(ТОЛЬКО после второго «ок»)*
1. Создай `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.MM-<slug>/summary.md` по шаблону `l1dder/templates/tasks/summary-template.md` (заполнив все 5 ID паспорта).
2. **Обнови статус задачи в 4 файлах по списку:**
   - **Файл 1 (`docs/sprints/SPRINT-NN-<slug>/README.md`):** у строки `TASK-NN.MM` поставь статус `✅ реализована` и ссылку на `summary.md`.
   - **Файл 2 (`docs/specs/FEAT-NNN-<slug>/tasks.md`):** у шага `FEAT-NNN.MM` поставь `[x]`.
   - **Файл 3 (`docs/backlog.md`):** у строки `FEAT-NNN.MM` / `TASK-NN.MM` поставь статус `✅ реализована` и ссылку на `summary.md`.
   - **Файл 4 (`docs/roadmap.md`):** в строке `SPRINT-NN` обнови счётчик прогресса задач (например, `1/2 (+ TASK-01.99)`).
3. Назови пользователю точный ID следующей задачи в спринте (если обычные задачи закончились — сообщи, что следующая задача `TASK-NN.99` — обязательный `Doctor Checklist`).

---

## ВЕТКА Б: Обязательная финальная задача спринта `TASK-NN.99` (`Doctor Checklist`)

> Спринт `SPRINT-NN` не может быть закрыт без полного прохождения этой задачи!

### Фаза Б.1 — План ревизии (`Plan`) + `⛔ СТОП №1`
1. Создай файл `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.99-doctor/plan.md` строго по шаблону `l1dder/templates/tasks/doctor-checklist-template.md`.
2. Заполни в паспорте все 5 ID: `TASK-NN.99`, `FEAT-NNN.99`, `SPRINT-NN`, `FEAT-NNN`, `IDEA-NNN`.
3. ⛔ **СТОП №1:** Покажи план `Doctor Checklist` пользователю и дождись слова «ок».

### Фаза Б.2 и Б.3 — Выполнение 4 блоков `Doctor Checklist` + `⛔ СТОП №2` *(после первого «ок»)*
Пройди строго все 4 блока подряд:
1. **Блок 1 (Code & Repo Doctor + Двухосевой `code-review`):**
   - Выполни `make ci` (0 ошибок).
   - Проведи **двухосевое ревью диффа спринта (`code-review`)**:
     - **Ось 1 (`Standards`):** соответствие `10-conventions.mdc`, `30-tech-stack.mdc`, `ponytail-audit` (0 отладочных логов, мёртвого кода, утечек памяти) и глубина модулей (`codebase-design`).
     - **Ось 2 (`Spec`):** независимая проверка каждого критерия приёмки из `docs/specs/FEAT-NNN-<slug>/requirements.md`.
   - Собери маркеры `shortcut:` по скиллу `l1dder/skills/ponytail-debt/SKILL.md`.
2. **Блок 2 (Agent E2E Verification):**
   - Запусти `make test-e2e` (если есть).
   - Подними приложение и пройди **все пользовательские сценарии `FEAT-NNN`** в живом окружении/браузере. Убедись в отсутствии ошибок.
3. **Блок 3 (Обязательное обновление долгосрочной доки — Living Docs Sync + `retro`):**
   - Проверь и обнови `docs/concept/vision.md`, `architecture.md`, `data-model.md`, `integrations.md`, `api-contracts.md` и доменный словарь (`l1dder/GLOSSARY.md`).
   - Проверь и обнови `docs/specs/FEAT-NNN-<slug>/{requirements,design,tasks}.md` под фактический код.
   - **Ретроспектива среды агента (`retro`):** проанализируй, где в ходе спринта агент спотыкался (навигация, тайпчек, линтер, правила), и обнови `l1dder/rules/*.mdc` (запустив `npx l1dder sync`), `Makefile` или `docs/adrs/`.
4. **Блок 4 (Предложение потестировать человеку — Human UAT):**
   - Составь для человека пошаговый сценарий ручной проверки (как запустить, что нажать, что проверить).
5. ⛔ **СТОП №2:** Покажи пользователю отчёт по Блокам 1–3 (вердикты по осям `Standards` и `Spec`, результаты E2E, список обновлённых файлов доки и выводов `retro`) + сценарий Human UAT. Напиши: *«Протестируй, пожалуйста, спринт `SPRINT-NN` по шагам выше и напиши "ок" (или замечания для исправления).»*

### Фаза Б.4 — Каскадное закрытие спринта, фичи и идеи *(ТОЛЬКО после «ок» человека по Human UAT)*
Выполни обновления строго в **6 файлах по списку**:
1. **Файл 1 (`summary.md`):** Создай `docs/sprints/SPRINT-NN-<slug>/tasks/TASK-NN.99-doctor/summary.md` с полным паспортом ID.
2. **Файл 2 (`docs/sprints/SPRINT-NN-<slug>/README.md`):** Поставь `TASK-NN.99` и всему спринту `SPRINT-NN` статус `✅ реализована`, заполни раздел «4. Итог спринта».
3. **Файл 3 (`docs/specs/FEAT-NNN-<slug>/tasks.md` и `requirements.md`):** Поставь `[x]` у `FEAT-NNN.99`. Если все спринты фичи `FEAT-NNN` завершены — в паспорте `requirements.md` поставь статус `✅ реализована`.
4. **Файл 4 (`docs/backlog.md`):**
   - У `TASK-NN.99` и `SPRINT-NN` поставь статус `✅ реализована`.
   - Если все спринты фичи `FEAT-NNN` завершены — в Таблице 1 и Разделе 2 у `FEAT-NNN` поставь статус `✅ реализована`.
5. **Файл 5 (`docs/roadmap.md`):**
   - Перенеси строку `SPRINT-NN` (`FEAT-NNN` ← `IDEA-NNN`) из `2. Delivery Queue` в `4. Завершённые спринты`.
   - Сдвинь следующий спринт в `Delivery Queue` на позицию `1 (CURRENT)`.
6. **Файл 6 (`docs/ideas.md`):**
   - Проверь все фичи `FEAT-NNN`, связанные с родительской идеей `IDEA-NNN`. Если все они имеют статус `✅ реализована` — измени статус `IDEA-NNN` (в таблице и в карточке) на `✅ реализована`.
