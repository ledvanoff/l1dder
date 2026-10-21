# L1DDER — Entry Point & ID Standard

Этот репозиторий использует методологию **L1DDER** (Spec-Driven & Roadmap-Gated AI Development).
Правила написаны в виде строгих пошаговых инструкций. **Не пропускай шаги, не придумывай свои форматы ID и не меняй файлы до слова «ок» от пользователя.**

---

## 1. Железный стандарт сквозных ID (`ID = Имя папки / Якорь`)

Каждая сущность имеет строгий формат ID. **Каждый дочерний документ обязан хранить все родительские ID вплоть до `IDEA-NNN` в своей таблице «Паспорт сущности» в начале файла:**

| Сущность | Точный формат ID | Где хранится (точный путь / якорь) | Обязательные родительские ID внутри |
|----------|------------------|------------------------------------|-------------------------------------|
| **Идея** | `IDEA-001` | `docs/ideas.md` (якорь `#idea-001`) | Хранит список связанных `FEAT-NNN` |
| **Фича и Спека** | `FEAT-001` | Запись в `docs/backlog.md` (`#feat-001`) + папка `docs/specs/FEAT-001-<slug>/` | `IDEA-001` |
| **Шаг спеки (до спринта)** | `FEAT-001.01`, ..., `FEAT-001.99` | `docs/specs/FEAT-001-<slug>/tasks.md` и `docs/backlog.md` | `FEAT-001`, `IDEA-001` |
| **Спринт** | `SPRINT-01` | `docs/roadmap.md` + `docs/sprints/SPRINT-01-<slug>/README.md` | `FEAT-001`, `IDEA-001` |
| **Задача спринта** | `TASK-01.01` | `docs/sprints/SPRINT-01-<slug>/tasks/TASK-01.01-<slug>/{plan,summary}.md` | `FEAT-001.01`, `SPRINT-01`, `FEAT-001`, `IDEA-001` |
| **Гигиена спринта (Doctor)** | `TASK-01.99` | `docs/sprints/SPRINT-01-<slug>/tasks/TASK-01.99-doctor/{plan,summary}.md` | `FEAT-001.99`, `SPRINT-01`, `FEAT-001`, `IDEA-001` |
| **Хотфикс** | `HOTFIX-001` | `docs/backlog.md` (Таблица 3, якорь `#hotfix-001`) | Опционально: `FEAT-NNN` / `TASK-NN.MM` |
| **Арх. решение** | `ADR-0001` | `docs/adrs/ADR-0001-<slug>.md` | `IDEA-NNN`, `FEAT-NNN` |

---

## 2. Управляющие скиллы `L1DDER`

При вызове пользователем любой из команд ниже — **сразу открой соответствующий `SKILL.md` в `l1dder/skills/<name>/SKILL.md` (или папке скиллов твоего агента) и выполняй его строго по шагам 1 → 2 → 3 → 4**:

| Команда | Скилл | Что делает цепочка |
|---------|-------|--------------------|
| **`/l1-onboard`** | `l1dder/skills/l1-onboard/SKILL.md` | Настраивает стек (`30-tech-stack.mdc`, `40-skills-router.mdc`, `Makefile`) и создаёт базовую документацию `docs/concept/`, `docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md` |
| **`/l1-idea`** | `l1dder/skills/l1-idea/SKILL.md` | Развивает идею → присваивает `IDEA-NNN` → записывает в `docs/ideas.md` |
| **`/l1-feature`** | `l1dder/skills/l1-feature/SKILL.md` | Берёт `IDEA-NNN` → создаёт `docs/specs/FEAT-NNN-<slug>/` → режет на шаги `FEAT-NNN.01 .. FEAT-NNN.99` → записывает в `docs/backlog.md` |
| **`/l1-planning`** | `l1dder/skills/l1-planning/SKILL.md` | Строит очередь в `docs/roadmap.md` → назначает `SPRINT-NN` и `TASK-NN.01 .. TASK-NN.99` → создаёт `docs/sprints/SPRINT-NN-<slug>/README.md` |
| **`/l1-task`** | `l1dder/skills/l1-task/SKILL.md` | Выполняет текущую задачу `TASK-NN.MM` из `docs/roadmap.md` (а в конце спринта — обязательный `TASK-NN.99` Doctor Checklist) |
| **`/l1-hotfix`** | `l1dder/skills/l1-hotfix/SKILL.md` | Чинит срочный баг в обход `docs/roadmap.md` → записывает `HOTFIX-NNN` в `docs/backlog.md` |
| **`/l1-evo`** | `l1dder/skills/l1-evo/SKILL.md` | Дорабатывает саму методологию `L1DDER` по `l1dder/evolution/METHODOLOGY-RULES.md`, ведёт `WORKLOG-CHANGELOG.md` и обновляет `HANDOFF.md` |

---

## 3. Состав правил в `l1dder/rules/` (Core vs Stack)

| Файл | Слой | Назначение |
|------|------|-----------|
| `00-methodology.mdc` | Core | Стандарт сквозных ID, точки входа `/l1-*`, структура `docs/` |
| `10-conventions.mdc` | Core | Универсальная инженерная дисциплина (`ponytail`, `codebase-design`, KISS/YAGNI), секреты, Make, тесты, Git |
| `20-workflow.mdc` | Core | Пошаговые инструкции по всем цепочкам, таблица переходов статусов и `Roadmap Gate` |
| `30-tech-stack.mdc` | **Stack** | Конкретный стек проекта, структура кода и команды `Makefile` |
| `40-skills-router.mdc` | **Stack** | Таблица выбора скиллов под задачу |

---

## 4. Структура `docs/` (Строгие имена файлов и папок)

```
docs/
├── README.md                                  # навигатор по всей документации
├── concept/                                   # долгосрочный фундамент (обновляется в TASK-NN.99)
│   ├── idea.md
│   ├── vision.md
│   ├── architecture.md
│   ├── data-model.md
│   ├── integrations.md
│   └── api-contracts.md
├── adrs/                                      # архитектурные решения: ADR-0001-<slug>.md
├── ideas.md                                   # 💡 БАНК ИДЕЙ (IDEA-001, IDEA-002...)
├── backlog.md                                 # 📋 БЭКЛОГ И ТАСК-ТРЕКЕР (FEAT-001, SPRINT-01, TASK-01.01, HOTFIX-001)
├── roadmap.md                                 # 🔒 РОАДМАП — ИСТОЧНИК ИСТИНЫ (Delivery Queue + Discovery Queue)
├── specs/                                     # папки спек строго начинаются с FEAT-NNN:
│   └── FEAT-001-<slug>/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md                           # содержит шаги FEAT-001.01 .. FEAT-001.99
└── sprints/                                   # папки спринтов строго начинаются с SPRINT-NN:
    └── SPRINT-01-<slug>/
        ├── README.md
        └── tasks/                             # папки задач строго начинаются с TASK-NN.MM:
            ├── TASK-01.01-<slug>/
            │   ├── plan.md
            │   └── summary.md
            └── TASK-01.99-doctor/             # обязательная финальная задача спринта
                ├── plan.md
                └── summary.md
```
