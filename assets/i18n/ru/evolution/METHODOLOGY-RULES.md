# 🧬 Правила эволюции, релизов и догфудинга методологии `L1DDER`

> **Директория:** `l1dder/evolution/`
> **Управляющий скилл:** `/l1-evo` (`l1dder/skills/l1-evo/SKILL.md`)
> **Главный принцип:** **100% Догфудинг (Dogfooding)** — методология `L1DDER` дорабатывается строго по собственной философии, собственным правилам (`00-methodology.mdc`, `10-conventions.mdc`, `20-workflow.mdc`), собственным флоу и скиллам (`ponytail`, `grilling`, `domain-modeling`, `codebase-design`, `code-review`, `retro`).

---

## 1. Принцип Догфудинга: два режима работы над `L1DDER`

### Режим А: Когда `L1DDER` развивается в собственном репозитории пакета (Standalone Framework Repo)
Когда фреймворк `l1dder` развивается как самостоятельный npm-пакет:
1. Крупные фичи проходят через цепочку `/l1-idea → /l1-feature → /l1-planning → /l1-task`, а быстрые правки методологии — через `/l1-evo`.
2. **ЖЕЛЕЗНОЕ ПРАВИЛО РЕЛИЗА И BREAKING CHANGES:**
   При подготовке каждой новой версии `l1dder` (`package.json` + `PACKAGE_VERSION` в `src/installer.ts`) агент **обязан** синхронно обновить **3 файла чейнджлога**:
   - **`assets/releases.json`** — машиночитаемый реестр релизов, который CLI проверяет перед выполнением `npx l1dder update`. В каждой записи релиза обязательно заполняются поля `version`, `date`, `summary` (`ru`/`en`), `changes` (`ru`/`en`) и **`breaking` (`ru`/`en`)**.
   - **`CHANGELOG.md`** — корневой чейнджлог пакета с явной секцией `### ⚠️ BREAKING CHANGES` (если есть ломающие изменения).
   - **`assets/i18n/{ru,en}/evolution/WORKLOG-CHANGELOG.md`** — подробный журнал эволюции методологии.

### Что считается `BREAKING CHANGE` (Ломающим изменением) в `L1DDER`:
Любое изменение из списка ниже **обязано** быть записано в массив `breaking` в `assets/releases.json` (тогда при вызове `npx l1dder@latest update` CLI сначала покажет пользователю список ломающих изменений и спросит подтверждение `да/нет`):
- Изменение формата сквозных ID (`IDEA-NNN`, `FEAT-NNN`, `SPRINT-NN`, `TASK-NN.MM`, `HOTFIX-NNN`) или обязательных полей `ID Passport`;
- Переименование или удаление слэш-команды (`/l1-*`), правила (`rules/*.mdc`) или ключевого документа в `docs/`;
- Изменение структуры `l1dder/config.json` или `l1dder/skills.json`, требующее действий от пользователя;
- Удаление или изменение поведения CLI-команд и флагов.

### Режим Б: Когда `l1dder/` лежит внутри продуктового проекта (Быстрый цикл через `/l1-evo`)
Чтобы не смешивать продуктовый `docs/roadmap.md` приложения с правками самого фреймворка, точечная доработка методологии внутри продуктового проекта идёт через скилл **`/l1-evo`**, который **внутри себя воспроизводит полный микро-цикл `L1DDER`**:
- **Фаза 1 (План + `grilling` + Фильтр `ponytail` → `⛔ СТОП №1`):** брейншторм с вопросами `❓ Q1 ➡️ Рекомендация`, проверка `Deletion Test` (не плодить лишние правила/файлы), явная оценка **есть ли `BREAKING CHANGES`**, и показ списка затрагиваемых файлов. Ожидание первого «ок».
- **Фаза 2 (Реализация по Матрице полной синхронизации):** синхронная правка `l1dder/rules/`, `l1dder/skills/`, `l1dder/templates/`, `l1dder/METHODOLOGY.md`, `l1dder/GLOSSARY.md`, `l1dder/user-guide/` + запуск `npx l1dder sync`.
- **Фаза 3 (Самопроверка `ponytail-review` + `code-review` → `⛔ СТОП №2`):** проверка целостности ссылок, совпадения копий скиллов и вывод обязательного 2-строчным футером `Ponytail skipped / Risk`. Ожидание второго «ок».
- **Фаза 4 (Фиксация в `WORKLOG-CHANGELOG.md`, `CHANGELOG.md`, `assets/releases.json` и `HANDOFF.md`):** запись итерации и ломающих изменений.

---

## 2. Главные архитектурные инварианты (Что нельзя нарушать)

### 2.1. Строгое разделение `Core` (Ядро) vs `Stack` (Стек проекта)
Методология обязана легко переноситься в любой проект (TypeScript, Python, Go, Rust, Mobile, Backend). Поэтому:
- **В файлы `Core` ЗАПРЕЩЕНО зашивать конкретный язык или фреймворк:**
  - `l1dder/rules/00-methodology.mdc`, `10-conventions.mdc`, `20-workflow.mdc`
  - `l1dder/skills/l1-*`, `ponytail*`, `mattpocock/skills`
  - `l1dder/templates/*`
  - `l1dder/METHODOLOGY.md`, `l1dder/GLOSSARY.md`, `l1dder/user-guide/*`
- **Весь конкретный стек живёт ТОЛЬКО в изолированных файлах (`Stack`):**
  1. `l1dder/skills.json` (секция `"stack"`)
  2. `l1dder/rules/30-tech-stack.mdc`
  3. `l1dder/rules/40-skills-router.mdc` (раздел 2)
  4. `l1dder/ci/` (`github-actions/default.yml.template`, `gitignore-additions.txt`)

### 2.2. Неприкосновенность сквозной цепочки ID
Любое изменение шаблонов или скиллов обязано сохранять 100% трассируемость ID и правило `ID = Имя папки / Якорь`:
`IDEA-NNN` → `FEAT-NNN` → `FEAT-NNN.MM` → `SPRINT-NN` → `TASK-NN.MM` (плюс обязательный финал спринта `TASK-NN.99` и исключение `HOTFIX-NNN`).

---

## 3. Матрица синхронного обновления (`Single Change = Full Sync`)

| Что меняется в методологии | Какие файлы обязательно обновить синхронно |
|----------------------------|--------------------------------------------|
| **Формат ID, статусы или переходы статусов** | 1. `l1dder/rules/00-methodology.mdc` и `20-workflow.mdc`<br/>2. Соответствующие `l1dder/skills/l1-*/SKILL.md`<br/>3. Шаблоны в `l1dder/templates/`<br/>4. `l1dder/GLOSSARY.md` и `l1dder/METHODOLOGY.md`<br/>5. `l1dder/user-guide/` + запись в `breaking` в `assets/releases.json` |
| **Шаги внутри скилла `/l1-*` или `ponytail*`** | 1. `l1dder/skills/<skill>/SKILL.md` (в `ru` и `en`)<br/>2. `l1dder/rules/20-workflow.mdc`<br/>3. `l1dder/user-guide/02-FLOWS-IN-DETAIL.md` + запуск `npx l1dder sync` |
| **Новая версия npm-пакета `l1dder`** | 1. `package.json` и `PACKAGE_VERSION` в `src/installer.ts`<br/>2. `assets/releases.json` (обязательно заполнить `changes` и `breaking` на `ru` и `en`)<br/>3. `CHANGELOG.md`<br/>4. `assets/i18n/{ru,en}/evolution/WORKLOG-CHANGELOG.md` |
