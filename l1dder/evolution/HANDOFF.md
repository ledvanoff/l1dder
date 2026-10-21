# 🤝 HANDOFF — Состояние методологии `L1DDER` (v1.0.0)

> **Дата актуальности:** 2026-10-21
> **Версия методологии:** `L1DDER v1.0.0`
> **Назначение файла:** Этот документ позволяет любому AI-агенту в новой сессии за 30 секунд полностью войти в контекст без чтения истории прошлых чатов.

---

## 1. Что такое `L1DDER` в одном абзаце

**L1DDER** — это самодостаточный фреймворк для Spec-driven / AI-driven разработки (**Zero Hidden State**), спроектированный так, чтобы:
1. **Человек (даже вайбкодер без погружения в код)** управлял всем жизненным циклом продукта через **6 слэш-команд** (`/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task`, `/l1-hotfix`) и подтверждение словом **«ок»** на точках остановки (`⛔ СТОП`).
2. **Любая модель ИИ и любой агент (`Cursor`, `Claude Code`, `Codex`, `Windsurf`, `Copilot`, `OpenCode`, `Cline`)** работали предсказуемо благодаря линейным пошаговым алгоритмам (`ШАГ 1 → ШАГ 2 → ⛔ СТОП → ШАГ 4 → Exit Gate`), готовым образцам заполнения (`Few-Shot`) и **жёсткой сквозной связке ID в шапке каждого документа (`ID Passport`)**.
3. **Методология за 1 секунду ставилась через `npx l1dder init` (`--lang ru|en`)** и легко переносилась между проектами с разным стеком за счёт чёткого разделения на универсальное ядро (`Core`) и изолированную конфигурацию стека (`Stack`).

---

## 2. Ключевые архитектурные инварианты

1. **Три главных экрана управления в `docs/`:**
   - `docs/ideas.md` (**Банк Идей**) — реестр и карточки всех задумок `IDEA-NNN` со статусами (`📋 нереализована`, `🚧 реализация`, `✅ реализована`, `❌ отклонена`) и приоритетами (`P0..P3`).
   - `docs/backlog.md` (**Бэклог и Таск-трекер**) — реестр проработанных фич `FEAT-NNN`, декомпозиция на спринты и задачи, а также журнал экстренных хотфиксов `HOTFIX-NNN`.
   - `docs/roadmap.md` (**Роадмап — Единый источник истины**) — содержит две очереди: `Delivery Queue` (очередь реализации спринтов `SPRINT-NN`) и `Discovery Queue` (очередь проработки идей `IDEA-NNN` в спеки). Действует железный **Roadmap Gate**: ничего не берётся в `/l1-task`, если этого нет на строке `1 (CURRENT)` в `docs/roadmap.md`.
2. **Железная сквозная цепочка ID (`ID = Имя папки / Якорь`):**
   - `IDEA-001` (`docs/ideas.md#idea-001`)
   - `FEAT-001` (`docs/backlog.md#feat-001` + папка спеки `docs/specs/FEAT-001-<slug>/`)
   - `FEAT-001.01 .. FEAT-001.99` (шаги внутри фичи до планирования спринта)
   - `SPRINT-01` (`docs/roadmap.md` + папка `docs/sprints/SPRINT-01-<slug>/README.md`)
   - `TASK-01.01 .. TASK-01.99` (папки задач `docs/sprints/SPRINT-01-<slug>/tasks/TASK-01.01-<slug>/` и `TASK-01.99-doctor/`)
   - `HOTFIX-001` (`docs/backlog.md`) и `ADR-0001` (`docs/adrs/ADR-0001-<slug>.md`).
3. **Обязательный финал каждого спринта — `TASK-NN.99` (`Doctor Checklist`):**
   - Ни один спринт не может быть закрыт без прохождения задачи `.99` (`l1dder/templates/tasks/doctor-checklist-template.md`), включающей 4 блока:
     1. *Code & Repo Doctor* (`make ci` + двухосевой `code-review` `Standards vs Spec` + `ponytail-audit` + сбор `shortcut:` через `ponytail-debt`);
     2. *Agent E2E Verification* (максимальный прогон автотестов и всех сценариев спринта агентом);
     3. *Living Docs Sync + `retro`* (**обязательное** обновление `docs/concept/*`, `docs/specs/*`, `docs/adrs/*` и правил `l1dder/rules/*.mdc` по итогам спринта);
     4. *Human UAT* (пошаговый гайд для ручной проверки человеком и ожидание «ок» перед каскадным закрытием `TASK-NN.99 ✅ → SPRINT-NN ✅ → FEAT-NNN ✅ → IDEA-NNN ✅`).

---

## 3. Карта файлов пакета `l1dder/`

| Путь | Слой | Описание |
|------|------|----------|
| `l1dder/README.md` | Core | Входная страница пакета и инструкция CLI |
| `l1dder/METHODOLOGY.md` | Core | Полное техническое описание `L1DDER` |
| `l1dder/GLOSSARY.md` | Core | Словарь терминов и статусных моделей |
| `l1dder/user-guide/` | Core | **Пользовательский путеводитель для вайбкодера** (`README.md`, `01-QUICKSTART.md`, `02-FLOWS-IN-DETAIL.md`, `03-CHEATSHEET.md`) |
| `l1dder/evolution/` | Meta | **Папка эволюции самой методологии:** `METHODOLOGY-RULES.md`, `WORKLOG-CHANGELOG.md`, `HANDOFF.md` |
| `l1dder/rules/00-methodology.mdc` | Core | Стандарт сквозных ID, список скиллов `/l1-*`, структура `docs/` |
| `l1dder/rules/10-conventions.mdc` | Core | Универсальная философия кода (`ponytail` + `codebase-design`), секреты, `Makefile`, `diagnosing-bugs`, `tdd`, Git |
| `l1dder/rules/20-workflow.mdc` | Core | Пошаговые алгоритмы всех цепочек, `Roadmap Gate`, матрица статусов |
| `l1dder/rules/30-tech-stack.mdc` | **Stack** | Конкретный стек проекта (заполняется в `/l1-onboard`, не затирается при `npx l1dder sync`) |
| `l1dder/rules/40-skills-router.mdc` | **Stack** | Маршрутизатор управляющих, инженерных и стек-скиллов |
| `l1dder/skills/l1-*/SKILL.md` | Core | 7 скиллов `L1DDER`: `l1-onboard`, `l1-idea`, `l1-feature`, `l1-planning`, `l1-task`, `l1-hotfix`, `l1-evo` |
| `l1dder/skills/ponytail*/SKILL.md` | Core | 4 скилла `ponytail`: `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt` |
| `l1dder/templates/` | Core | Шаблоны с `ID Passport`: `ideas/`, `backlog/`, `roadmap/`, `specs/`, `sprints/`, `tasks/`, `concept/`, `adrs/` |
| `l1dder/onboarding/` | Core | Сценарии старта: `from-scratch.md`, `existing-code.md`, `continue-project.md` |
| `l1dder/ci/` | **Stack** | GitHub Actions шаблон, `.gitignore` и Git-конвенции |
