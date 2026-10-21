# L1DDER — AI-Driven & Spec-Driven Development Framework

Самодостаточный методологический пакет **L1DDER** для итеративной AI-driven / Spec-driven разработки с ИИ-агентами (**Cursor, Claude Code, OpenAI Codex, Windsurf, GitHub Copilot, OpenCode, Cline**).

Никаких скрытых стейт-машин (`state.yml`) и хрупких блокировок: **сами Markdown-документы в `docs/` с паспортами сквозных ID являются единственным источником истины**.

---

## Что внутри папки `l1dder/`

```
l1dder/
├── config.json             # Конфигурация установки (язык ru/en и активные агенты)
├── user-guide/             # 📖 ПОНЯТНЫЙ ПУТЕВОДИТЕЛЬ ДЛЯ ЧЕЛОВЕКА (Vibe-Coder Friendly, со схемами!)
├── evolution/              # 🧬 САМОРАЗВИТИЕ МЕТОДОЛОГИИ: правила доработки, WORKLOG-CHANGELOG.md и HANDOFF.md
├── METHODOLOGY.md          # Цельное описание L1DDER: артефакты, потоки, Roadmap Gate, Doctor Checklist
├── GLOSSARY.md             # Словарь терминов и статусных моделей
├── rules/                  # Правила процесса и стека (Core + Stack)
├── skills/                 # Управляющие скиллы (/l1-*) + скиллы инженерной дисциплины (ponytail-*)
├── templates/              # Шаблоны с ID Passport для концепта, банка идей, бэклога, роадмапа, спек, спринтов и задач
├── onboarding/             # Сценарии старта проекта (from-scratch, existing-code, continue-project)
└── ci/                     # Стартер CI/Git (.gitignore и GitHub Actions)
```

---

## ⚡ Установка и быстрый старт (2 шага)

### Шаг 1. Инициализировать `L1DDER` в проекте

```bash
# Интерактивная установка (выбор языка ru/en и агентов)
npx l1dder init

# Или в одну команду без вопросов (например, русский язык для Cursor и Claude Code):
npx l1dder init --lang ru --agents cursor,claude --yes
```

Поддерживаемые агенты (`--agents`):
- `cursor` — Cursor IDE (`.cursor/rules/l1dder/*.mdc` + `.cursor/skills/*` + `AGENTS.md`)
- `claude` — Claude Code (`CLAUDE.md` + `.claude/rules/l1dder/*.md` + `.claude/commands/*` + `.claude/skills/*`)
- `codex` — OpenAI Codex (`AGENTS.md` + `.agents/skills/*`)
- `windsurf` — Windsurf (`.windsurf/rules/l1dder.md` + `.windsurf/workflows/*`)
- `copilot` — GitHub Copilot / VS Code (`.github/copilot-instructions.md` + `.github/prompts/*.prompt.md`)
- `opencode` — OpenCode (`AGENTS.md` + `.opencode/commands/*` + `.agents/skills/*`)
- `cline` — Cline / Roo Code (`.clinerules/l1dder.md` + `.roo/rules/l1dder.md`)
- `all` — установить сразу для всех популярных агентов

### Шаг 2. Запустить онбординг в чате агента

Открой чат своего агента и введи:
```text
/l1-onboard
```
Агент сам определит, пустой ли это проект (`from-scratch`) или проект с существующим кодом (`existing-code`), поможет настроить файл стека `l1dder/rules/30-tech-stack.mdc` под твои технологии и пошагово создаст базовую документацию в `docs/`.

---

## 🎮 Управляющие команды `L1DDER`

| Слэш-команда | Поток | Что делает |
|--------------|-------|-----------|
| **`/l1-onboard`** | Старт проекта | Определяет стек (`30-tech-stack.mdc`), создаёт `docs/concept/`, Банк Идей (`docs/ideas.md`), Бэклог (`docs/backlog.md`) и Роадмап (`docs/roadmap.md`). |
| **`/l1-idea`** | Флоу «Идея» | Помогает развить идею (`grilling`) и сохраняет её в **Банк Идей** (`docs/ideas.md`) с кодом `IDEA-NNN`, приоритетом и статусом `📋 нереализована`. |
| **`/l1-feature`** | Флоу «Фича» | Берёт идею `IDEA-NNN`, создаёт полную спеку (`docs/specs/FEAT-NNN-<slug>/`), грумит фичу на шаги `FEAT-NNN.01..99` и кладёт в **Бэклог** (`docs/backlog.md`). |
| **`/l1-planning`** | Флоу «Планирование» | Формирует и обновляет **Роадмап** (`docs/roadmap.md` — Единый источник истины): планирует спринты (`Delivery Queue`) и очередь идей (`Discovery Queue`). |
| **`/l1-task`** | Флоу «Задача» | Берёт строго следующую задачу из Роадмапа (`Plan → Implement → Self-check → Summary`), а в конце каждого спринта проводит обязательную задачу **`TASK-NN.99` (`Doctor Checklist`)**. |
| **`/l1-hotfix`** | Флоу «Хотфикс» | Единственное исключение из Роадмапа: быстрая починка критического бага (`RED → GREEN`) и запись `HOTFIX-NNN` в `docs/backlog.md`. |
| **`/l1-evo`** | Эволюция `L1DDER` | Доработка самой методологии по правилам [`evolution/METHODOLOGY-RULES.md`](evolution/METHODOLOGY-RULES.md), ведение [`WORKLOG-CHANGELOG.md`](evolution/WORKLOG-CHANGELOG.md) и [`HANDOFF.md`](evolution/HANDOFF.md). |

---

## 📖 С чего начать человеку (Документация для вайбкодера)

Начни с папки **[`user-guide/`](user-guide/README.md)**:
- **[`user-guide/README.md`](user-guide/README.md)** — Главная визуальная схема всех цепочек и связки ID за 3 минуты.
- **[`user-guide/01-QUICKSTART.md`](user-guide/01-QUICKSTART.md)** — Установка `npx l1dder init` и живой пример диалога от идеи до спринта.
- **[`user-guide/02-FLOWS-IN-DETAIL.md`](user-guide/02-FLOWS-IN-DETAIL.md)** — Разбор каждой кнопки (`/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task`, `/l1-hotfix`) и `Doctor Checklist`.
- **[`user-guide/03-CHEATSHEET.md`](user-guide/03-CHEATSHEET.md)** — Шпаргалка на 1 экран «Что нажать, если...» и FAQ.

---

## Справочник CLI-команд и манифест `l1dder/skills.json`

В коробку `l1dder/` уже вшиты **20 скиллов** (7 управляющих `/l1-*` + 4 скилла `DietrichGebert/ponytail` + 9 инженерных скиллов `mattpocock/skills`: `grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `retro`, `prototype`, `writing-for-agents`), которые описаны в манифесте **`l1dder/skills.json`**.

| Команда в терминале | Что делает |
|---------------------|-----------|
| `npx l1dder init` | Устанавливает `l1dder/`, `skills.json`, все 20 встроенных скиллов и правила для выбранных агентов (`--lang ru\|en`, `--agents cursor,claude,codex`, `--yes`). |
| `npx l1dder@latest update` | **Обновляет весь фреймворк** (правила `Core`, шаблоны, гайды и скиллы), **сохраняя нетронутыми** твой проектный стек (`30-tech-stack.mdc`, `40-skills-router.mdc`, `stack` в `skills.json`) и `docs/`. |
| `npx l1dder@latest update --skills` | **Обновляет только скиллы** (`l1dder/skills/**` и папки скиллов в агентах), не трогая правила и шаблоны. |
| `npx l1dder skills list` | Показывает все скиллы из `l1dder/skills.json` (`l1dder`, `core`, `stack`) и статус их установки. |
| `npx l1dder skills add <repo> --skill <name>` | Добавляет стек-скилл в `l1dder/skills.json`, скачивает с GitHub в `l1dder/skills/` и раскладывает во все активные агенты. |
| `npx l1dder doctor` | Проверяет целостность структуры `l1dder/` и `docs/` (без блокировок). |
