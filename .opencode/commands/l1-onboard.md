---
description: "Initializes a new (from-scratch) or existing (existing-code) project on L1DDER: configures the project tech stack in l1dder/rules/30-tech-stack.mdc and 40-skills-router.mdc, syncs agent rules, and step-by-step creates docs/concept/, docs/ideas.md, docs/backlog.md, and docs/roadmap.md with human \"ок\" approvals. Use when the user invokes /l1-onboard or starts a project after npx l1dder init."
---

# L1DDER — Цепочка 0: Онбординг проекта и настройка стека (`/l1-onboard`)

> **ПРАВИЛО ДЛЯ МОДЕЛИ:** Выполняй инструкцию строго по шагам 1 → 2 → 3 → 4 → 5. Не пропускай шаги. На каждом шаге показывай пользователю черновик и останавливайся (`⛔ СТОП`) до явного слова «ок».

---

## ШАГ 1: Определи режим старта (`from-scratch` или `existing-code`) и изучи контекст

1. Проверь содержимое репозитория:
   - Если в проекте уже есть заполненный `docs/roadmap.md` — покажи пользователю краткую сводку активного спринта (`1 CURRENT`), следующей задачи `TASK-NN.MM` и следующей идеи в `Discovery Queue`, и предложи вызвать `/l1-task`, `/l1-feature` или `/l1-planning`.
   - Если в проекте **уже есть исходный код приложения** (`src/`, `app/`, `packages/`, `package.json`, `pyproject.toml`, `go.mod` и т.д.), но нет `docs/roadmap.md` → выбери режим **`existing-code` (Реверс-инжиниринг по коду)**.
   - Если проект **пустой** (или есть только входные заметки вроде `concept.md` / `README.md`) → выбери режим **`from-scratch` (Проект с нуля)**.
2. Прочитай `l1dder/METHODOLOGY.md`, `l1dder/rules/30-tech-stack.mdc` и `l1dder/rules/40-skills-router.mdc`.

---

## ШАГ 2: Согласование технологического стека (`30-tech-stack.mdc` + `Makefile`) и `⛔ СТОП №1`

1. **Если режим `existing-code`:** изучи конфиги проекта (`package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Makefile`, структуру папок) и сам выпиши фактический стек.
2. **Если режим `from-scratch`:** если стек ещё не назван пользователем (или не указан в `concept.md`), задай 1–2 вопроса в формате `grilling` (`❓ Q1 — Технологический стек ➡️ Рекомендация по принципу ponytail`).
3. Покажи пользователю проект настройки стека:
   - Сводная таблица стека для `l1dder/rules/30-tech-stack.mdc` (Язык, Frontend/UI, Backend/Core, Данные, Тесты/Линтер);
   - Архитектурная структура папок проекта;
   - Цели `Makefile` (`make dev`, `make build`, `make lint`, `make typecheck`, `make test`, `make ci`);
   - Рекомендуемые профильные скиллы для `l1dder/skills.json` (секция `"stack"`) и `l1dder/rules/40-skills-router.mdc`.
4. ⛔ **СТОП №1:** Спроси: *«Утверждаем стек проекта для записи в `l1dder/rules/30-tech-stack.mdc`, `l1dder/skills.json` и `Makefile` (ок / правки)?»* и жди ответа.
5. **После «ок»:**
   - Запиши заполненный `l1dder/rules/30-tech-stack.mdc`, добавь выбранные стек-скиллы в секцию `"stack"` файла `l1dder/skills.json` и обнови раздел 2 в `l1dder/rules/40-skills-router.mdc`.
   - Создай (или обнови) корневой `Makefile` с контрактом команд.
   - Запусти `npx l1dder skills install` и `npx l1dder sync`, чтобы скачать стек-скиллы и синхронизировать правила во все активные ИИ-агенты.

---

## ШАГ 3: Базовый фундамент концепта (`docs/concept/`) и `⛔ СТОП №2`

1. Прочитай шаблоны в `l1dder/templates/concept/`.
2. Подготовь проект базовых документов концепта (в режиме `existing-code` — строго по тому, как система устроена сейчас; в режиме `from-scratch` — по ответам пользователя и `grilling`):
   - `docs/concept/idea.md` — суть продукта, для кого, какую задачу решает, границы MVP.
   - `docs/concept/vision.md` — роли, ключевые сценарии, компоненты, стек и принципы.
   - `docs/concept/architecture.md` — слои, контейнеры, потоки данных (если компонентов ≥ 2).
   - `docs/concept/data-model.md` — сущности и схемы хранения/конфигов (если применимо).
   - `docs/concept/integrations.md` и `docs/concept/api-contracts.md` (если применимо).
3. ⛔ **СТОП №2:** Покажи пользователю сводку концепта и спроси: *«Утверждаем базовый концепт для записи в `docs/concept/` (ок / правки)?»*
4. **После «ок»:** создай согласованные файлы в `docs/concept/`.

---

## ШАГ 4: Инициализация Банка Идей (`docs/ideas.md`), Бэклога (`docs/backlog.md`) и Роадмапа (`docs/roadmap.md`) + `⛔ СТОП №3`

1. Прочитай шаблоны `l1dder/templates/ideas/ideas-template.md`, `l1dder/templates/backlog/backlog-template.md` и `l1dder/templates/roadmap/roadmap-template.md`.
2. Сформируй стартовый набор идей `IDEA-001`, `IDEA-002`, `IDEA-003`... с приоритетами `P0..P3` и статусом `📋 нереализована` (в режиме `existing-code` уже работающую функциональность можно отметить как `✅ реализована`, а новые планы — как `📋 нереализована`).
3. Покажи пользователю список первых `IDEA-NNN` и порядок очереди `Discovery Queue` для `docs/roadmap.md`.
4. ⛔ **СТОП №3:** Спроси: *«Утверждаем стартовый Банк Идей (`docs/ideas.md`), Бэклог (`docs/backlog.md`) и Роадмап (`docs/roadmap.md`) (ок / правки)?»*
5. **После «ок»:**
   - Создай `docs/ideas.md` со стартовыми карточками `IDEA-NNN`.
   - Создай `docs/backlog.md` и `docs/roadmap.md`.
   - Создай навигатор `docs/README.md` со ссылками на все документы.

---

## ШАГ 5: Завершение онбординга (Exit Gate)

Проверь, что все файлы на месте (`l1dder/rules/30-tech-stack.mdc`, `docs/concept/idea.md`, `docs/concept/vision.md`, `docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`, `docs/README.md`), и напиши пользователю:
- *«Онбординг проекта на `L1DDER` завершён! Стек настроен, база `docs/` создана.»*
- *«Следующий шаг: вызови `/l1-feature IDEA-001` для проработки первой спецификации фичи (или `/l1-idea`, чтобы добавить ещё идей).»*
