# Skills Router & Manifest (`l1dder/skills.json`)

Перед началом работы проверь таблицу ниже и прочитай нужные `SKILL.md` через `Read` tool.
Все скиллы проекта управляются через манифест **`l1dder/skills.json`** (аналог `package.json` для скиллов ИИ-агентов).

## Как использовать

1. Для управления процессом (онбординг, идеи, фичи, планирование роадмапа, запуск задач, хотфиксы) используй управляющие скиллы `L1DDER` (`/l1-*` — Раздел 0).
2. Для брейншторма, проектирования архитектуры, TDD, отладки багов и ревью спринта читай через `Read` инженерные скиллы из Раздела 1 (`ponytail` + `mattpocock/skills` — **все они уже лежат в коробке `l1dder/skills/`!**).
3. Перед реализацией кода в `/l1-task` или `/l1-hotfix` прочитай профильные скиллы стека из Раздела 2 (управляются через секцию `"stack"` в `l1dder/skills.json` и команду `npx l1dder skills install`).

**Важно:** если skill найден — его `SKILL.md` нужно прочитать через `Read` и применить, а не просто упомянуть в `plan.md`.

---

## 0. Управляющие скиллы процесса `L1DDER` (секция `"l1dder"` в `skills.json`)

| Когда использовать | Слэш-команда / Skill | Путь в проекте (`l1dder/skills/`) |
|--------------------|----------------------|-----------------------------------|
| Стартовать проект (`from-scratch` или `existing-code`), настроить `30-tech-stack.mdc`, `l1dder/skills.json` и создать базовый `docs/` | `/l1-onboard` | `l1dder/skills/l1-onboard/SKILL.md` |
| Есть новая задумка: развить идею (`grilling`) и положить в Банк Идей (`docs/ideas.md`) | `/l1-idea` | `l1dder/skills/l1-idea/SKILL.md` |
| Проработать спеку (`docs/specs/FEAT-NNN/`) по идее (`grilling` + `codebase-design`) и нарезать на шаги `FEAT-NNN.01..99` в `docs/backlog.md` | `/l1-feature` | `l1dder/skills/l1-feature/SKILL.md` |
| Спланировать или изменить очередь в Роадмапе (`docs/roadmap.md`), назначить `SPRINT-NN` и `TASK-NN.01..99` | `/l1-planning` | `l1dder/skills/l1-planning/SKILL.md` |
| Выполнить очередную задачу `TASK-NN.MM` по Роадмапу или финальный `TASK-NN.99` (`Doctor Checklist`: E2E + `code-review` + `retro` + Docs Sync + UAT) | `/l1-task` | `l1dder/skills/l1-task/SKILL.md` |
| Срочно починить баг в обход Роадмапа (`diagnosing-bugs` RED-first gate) с записью `HOTFIX-NNN` в `docs/backlog.md` | `/l1-hotfix` | `l1dder/skills/l1-hotfix/SKILL.md` |
| Доработать саму методологию `L1DDER`, записать итерацию в `WORKLOG-CHANGELOG.md` или подготовить `HANDOFF.md` | `/l1-evo` | `l1dder/skills/l1-evo/SKILL.md` |

---

## 1. Базовая инженерная дисциплина (секция `"core"` в `skills.json` — УЖЕ В КОРОБКЕ!)

> Эти 13 скиллов из `DietrichGebert/ponytail` и `mattpocock/skills` поставляются внутри пакета `l1dder` (включая их вспомогательные файлы `DEEPENING.md`, `DESIGN-IT-TWICE.md`, `tests.md`, `mocking.md`, `LOGIC.md`, `UI.md`, `GLOSSARY-FORMAT.md`, `ADR-FORMAT.md`) и автоматически раскладываются во все твои ИИ-агенты при `npx l1dder init`. Обновить их до свежей версии с GitHub можно командой `npx l1dder skills update`.

| Тип работы / Этап L1DDER | Skill | Источник (GitHub) | Локальный путь (всегда доступен) |
|--------------------------|-------|-------------------|----------------------------------|
| Любое написание кода, багфикс, рефакторинг, выбор зависимостей (6-ступенчатая лестница «Lazy Senior Dev», маркеры `shortcut:`, 2-строчный футер `Skipped / Risk`) | `ponytail` | `DietrichGebert/ponytail` | `l1dder/skills/ponytail/SKILL.md` |
| Качественное ревью диффа перед `⛔ СТОП №2` в `/l1-task` (баги, память, нагрузка, тесты, что можно удалить) | `ponytail-review` | `DietrichGebert/ponytail` | `l1dder/skills/ponytail-review/SKILL.md` |
| Полный аудит репозитория на оверинжиниринг и лишние обёртки (в рамках `TASK-NN.99` Doctor Checklist) | `ponytail-audit` | `DietrichGebert/ponytail` | `l1dder/skills/ponytail-audit/SKILL.md` |
| Сбор всех комментариев `// shortcut:` и `// ponytail:` в реестр техдолга с проверкой триггеров апгрейда (в рамках `TASK-NN.99` Doctor Checklist) | `ponytail-debt` | `DietrichGebert/ponytail` | `l1dder/skills/ponytail-debt/SKILL.md` |
| Стресс-тестирование идеи (`/l1-idea`) или спеки (`/l1-feature`) через дерево решений раундами (`❓ Q1 ... ➡️ Рекомендация`) | `grilling` | `mattpocock/skills` | `l1dder/skills/grilling/SKILL.md` |
| Ведение единого доменного словаря (`Ubiquitous Language` в `GLOSSARY.md`) и фиксация ADR (`GLOSSARY-FORMAT.md`, `ADR-FORMAT.md`) | `domain-modeling` | `mattpocock/skills` | `l1dder/skills/domain-modeling/SKILL.md` |
| Проектирование глубоких модулей (`Deep Modules`), выбор публичных швов (`Seams`), `Deletion Test` (`DEEPENING.md`, `DESIGN-IT-TWICE.md`) | `codebase-design` | `mattpocock/skills` | `l1dder/skills/codebase-design/SKILL.md` |
| Разработка через тестирование вертикальными срезами (`Red → Green`) по согласованным публичным швам (`tests.md`, `mocking.md`) | `tdd` | `mattpocock/skills` | `l1dder/skills/tdd/SKILL.md` |
| 6-фазная диагностика сложных багов и регрессий с жёстким гейтом воспроизведения (`RED command first` — для `/l1-hotfix` и `/l1-task`) | `diagnosing-bugs` | `mattpocock/skills` | `l1dder/skills/diagnosing-bugs/SKILL.md` |
| Двухосевое ревью диффа спринта (`Axis 1: Standards + Fowler Smells` vs `Axis 2: Spec` — для `TASK-NN.99` Doctor Checklist) | `code-review` | `mattpocock/skills` | `l1dder/skills/code-review/SKILL.md` |
| Ретроспектива сессии в конце спринта (`TASK-NN.99`): улучшение правил (`*.mdc`), проверок `Makefile` и навигации | `retro` | `mattpocock/skills` | `l1dder/skills/retro/SKILL.md` |
| Быстрое создание одноразового интерактивного прототипа логики или UI (`LOGIC.md`, `UI.md`) до утверждения спеки | `prototype` | `mattpocock/skills` | `l1dder/skills/prototype/SKILL.md` |
| Написание и улучшение правил, скиллов и `AGENTS.md` / `CLAUDE.md` (используется в `/l1-evo` и `retro`) | `writing-for-agents` | `mattpocock/skills` | `l1dder/skills/writing-for-agents/SKILL.md` |

---

## 2. Профильные скиллы стека проекта (секция `"stack"` в `l1dder/skills.json`)

> При настройке проекта через `/l1-onboard` агент добавляет нужные скиллы под твой стек в `l1dder/skills.json` и устанавливает их во все подключённые ИИ-агенты одной командой:

```bash
# Добавить стек-скилл в l1dder/skills.json, скачать в l1dder/skills/ и разложить по агентам:
npx l1dder skills add anthropics/skills --skill frontend-design,webapp-testing
npx l1dder skills add vercel-labs/agent-skills --skill vercel-react-best-practices,vercel-composition-patterns

# Установить все стек-скиллы, прописанные в l1dder/skills.json:
npx l1dder skills install

# Посмотреть статус всех скиллов проекта:
npx l1dder skills list
```

| Тип работы | Skill | Репозиторий (`skills.json`) | Путь после `npx l1dder skills install` |
|-----------|-------|-----------------------------|----------------------------------------|
| Дизайн интерфейсов и фронтенд | `frontend-design` | `anthropics/skills` | `l1dder/skills/frontend-design/SKILL.md` |
| Браузерное и E2E-тестирование | `webapp-testing` | `anthropics/skills` | `l1dder/skills/webapp-testing/SKILL.md` |
| React / Next.js Best Practices | `vercel-react-best-practices` | `vercel-labs/agent-skills` | `l1dder/skills/vercel-react-best-practices/SKILL.md` |
