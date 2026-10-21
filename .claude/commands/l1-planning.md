---
description: "Updates the L1DDER Roadmap (docs/roadmap.md — Single Source of Truth), assigns SPRINT-NN and TASK-NN.01..99 IDs to feature steps FEAT-NNN.01..99, updates docs/backlog.md and docs/specs/FEAT-NNN/tasks.md, and creates docs/sprints/SPRINT-NN-<slug>/README.md. Use when the user invokes /l1-planning."
---

# L1DDER — Цепочка 3: Планирование Роадмапа (`/l1-planning`)

> **ПРАВИЛО ДЛЯ МОДЕЛИ:** Выполняй инструкцию строго по шагам 1 → 2 → 3 → 4 → 5. `docs/roadmap.md` — это главный источник истины проекта. Никогда не редактируй файлы до получения слова «ок» от пользователя на Шаге 3.

---

## Правило присвоения ID при планировании (копируй символ-в-символ)

Когда кандидат спринта из фичи `FEAT-NNN` (родитель `IDEA-NNN`) ставится в очередь `Delivery Queue` файла `docs/roadmap.md`:
1. Спринт получает двузначный ID `SPRINT-NN` (`SPRINT-01`, `SPRINT-02`...).
2. Папка спринта называется строго `docs/sprints/SPRINT-NN-<slug>/` (начинается с `SPRINT-NN-`).
3. Каждый шаг спеки `FEAT-NNN.MM` получает парный ID задачи спринта `TASK-NN.MM`:
   - `FEAT-NNN.01` → `TASK-NN.01`
   - `FEAT-NNN.02` → `TASK-NN.02`
   - `FEAT-NNN.99` → `TASK-NN.99` *(обязательная финальная задача Doctor Checklist)*
4. Статус фичи `FEAT-NNN` в `docs/backlog.md` меняется с `📋 в бэклоге` на `🗓 запланирована`.

---

## ШАГ 1: Прочитай входные файлы

Вызови `Read` для файлов:
1. `docs/ideas.md`
2. `docs/backlog.md`
3. `docs/roadmap.md` *(если файла ещё нет — прочитай `l1dder/templates/roadmap/roadmap-template.md`)*
4. `l1dder/templates/sprints/sprint-template.md`

---

## ШАГ 2: Собери все кандидаты и вычисли номера `SPRINT-NN` и `TASK-NN.MM`

1. Найди в `docs/backlog.md` все фичи со статусом `📋 в бэклоге` (готовы к постановке в спринт) и уже запланированные спринты (`🗓 запланирована` / `🚧 реализация`).
2. Найди в `docs/ideas.md` все идеи со статусом `📋 нереализована` (для очереди проработки `Discovery Queue`).
3. Определи последний использованный номер `SPRINT-NN` (включая архив завершённых спринтов в `docs/roadmap.md`) и назначь новым спринтам следующие номера по порядку (`SPRINT-01`, `SPRINT-02`...).

---

## ШАГ 3: Предложи проект `docs/roadmap.md` и ОСТАНОВИСЬ (`⛔ СТОП`)

Покажи пользователю в чате рекомендуемый порядок очередей (с кратким обоснованием приоритетов и зависимостей):

```markdown
### Проект обновления Роадмапа (`docs/roadmap.md`)

#### 1. Текущий фокус (`Active Pointer`)
- **Текущий спринт на реализацию (`/l1-task`):** `SPRINT-01` (`FEAT-001` ← `IDEA-001`)
- **Следующая идея на проработку спеки (`/l1-feature`):** `IDEA-002`

#### 2. Очередь реализации (`Delivery Queue`)
| Очередь | ID спринта | ID фичи (`FEAT-NNN`) | ID идеи (`IDEA-NNN`) | Приоритет | Цель спринта | Задачи (`TASK-NN.MM`) |
|:-------:|:----------:|:--------------------:|:--------------------:|:---------:|--------------|-----------------------|
| **1 (CURRENT)** | `SPRINT-01` | `FEAT-001` | `IDEA-001` | P0 | [Цель] | `TASK-01.01`, `TASK-01.02`, `TASK-01.99` (Doctor) |
| **2 (NEXT)** | `SPRINT-02` | `FEAT-002` | `IDEA-002` | P1 | [Цель] | `TASK-02.01`, `TASK-02.99` (Doctor) |

#### 3. Очередь проработки идей в спеки (`Discovery Queue`)
| Очередь | ID идеи (`IDEA-NNN`) | Название идеи | Приоритет | Статус |
|:-------:|:--------------------:|---------------|:---------:|--------|
| **1** | `IDEA-002` | [Название] | P1 | `📋 нереализована` |
| **2** | `IDEA-003` | [Название] | P2 | `📋 нереализована` |
```

⛔ **СТОП:** Спроси: *«Утверждаем такую очередь в `docs/roadmap.md` и номера `SPRINT-NN` / `TASK-NN.MM` (ок / перестроить)?»* и жди ответа.

---

## ШАГ 4: Запиши изменения строго в 4 места (ТОЛЬКО после слова «ок»)

### Место 1: Обнови `docs/roadmap.md`
Запиши согласованные таблицы `1. Текущий фокус`, `2. Очередь реализации (Delivery Queue)`, `3. Очередь проработки идей (Discovery Queue)` и добавь запись в `5. История изменений Роадмапа` по шаблону `l1dder/templates/roadmap/roadmap-template.md`.

### Место 2: Обнови `docs/backlog.md`
Для каждой запланированной фичи `FEAT-NNN`:
1. В **Таблице 1 («Реестр Фич»)** измени статус с `📋 в бэклоге` на `🗓 запланирована` и в колонке `Спринты` укажи ссылку `[`SPRINT-01`](./sprints/SPRINT-01-<slug>/README.md)`.
2. В **Разделе 2 («Декомпозиция Фич»)** замени `Кандидат спринта (SPRINT-??)` на `#### Спринт: SPRINT-01 — [Название]` и проставь в колонке `ID задачи спринта` коды `TASK-01.01`, `TASK-01.02`, ..., `TASK-01.99`.

### Место 3: Обнови `docs/specs/FEAT-NNN-<slug>/tasks.md` (и `requirements.md`)
В файле `docs/specs/FEAT-NNN-<slug>/tasks.md` впиши назначенный `SPRINT-NN` и коды задач `TASK-NN.01 .. TASK-NN.99` напротив соответствующих шагов `FEAT-NNN.01 .. FEAT-NNN.99`. В паспорте `requirements.md` обнови статус на `🗓 запланирована` и спринт `SPRINT-NN`.

### Место 4: Создай `docs/sprints/SPRINT-NN-<slug>/README.md`
Для спринта на позиции `1 (CURRENT)` (и при необходимости остальных запланированных спринтов) создай файл `docs/sprints/SPRINT-NN-<slug>/README.md` строго по шаблону `l1dder/templates/sprints/sprint-template.md`:
- Заполни паспорт спринта (`ID спринта: SPRINT-NN`, `ID фичи: FEAT-NNN`, `ID идеи: IDEA-NNN`).
- Заполни таблицу задач с двумя колонками ID (`TASK-NN.MM` и `FEAT-NNN.MM`), где последней строкой идёт `TASK-NN.99` (`FEAT-NNN.99`) — **Гигиена спринта и Doctor Checklist**.

---

## ШАГ 5: Чек-лист самопроверки перед ответом (Exit Gate)

Проверь все 5 пунктов:
- [ ] 1. В `docs/roadmap.md` ровно один спринт помечен как `1 (CURRENT)` в `Delivery Queue`?
- [ ] 2. В каждой строке `Delivery Queue` указаны все три ID: `SPRINT-NN`, `FEAT-NNN`, `IDEA-NNN`?
- [ ] 3. В `docs/backlog.md` и `docs/specs/FEAT-NNN-<slug>/tasks.md` проставлены коды `SPRINT-NN` и `TASK-NN.01 .. TASK-NN.99`, а статус фичи равен `🗓 запланирована`?
- [ ] 4. Создан файл `docs/sprints/SPRINT-NN-<slug>/README.md` (папка начинается с `SPRINT-NN-`)?
- [ ] 5. В таблице задач `SPRINT-NN` последней задачей стоит `TASK-NN.99` (`FEAT-NNN.99` — Doctor Checklist)?

После проверки сообщи пользователю:
- *«Роадмап (`docs/roadmap.md`) обновлён. Активный спринт: `SPRINT-NN` (фича `FEAT-NNN` ← идея `IDEA-NNN`).»*
- *«Следующий шаг: вызови `/l1-task`, чтобы взять в работу первую задачу `TASK-NN.01`.»*
