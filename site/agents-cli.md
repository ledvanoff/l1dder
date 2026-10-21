# 🤖 Поддерживаемые ИИ-агенты, Манифест скиллов и Справочник CLI

`L1DDER` спроектирован так, чтобы работать с любым современным ИИ-агентом из единой корневой папки `l1dder/` в твоём проекте.

---

## 1. Команды терминала (CLI)

### `npx l1dder init`
Устанавливает папку `l1dder/` (методология, шаблоны, правила, манифест `l1dder/skills.json` и **20 встроенных скиллов**) и генерирует конфигурационные файлы для всех выбранных ИИ-агентов.

```bash
# Интерактивный режим (спросит язык и список агентов):
npx l1dder init

# Установка без вопросов для Cursor и Claude Code на русском:
npx l1dder init --lang ru --agents cursor,claude --yes

# Установка сразу для всех поддерживаемых агентов на английском:
npx l1dder init --lang en --agents all --yes
```

### `npx l1dder@latest update` (или `npx l1dder sync`) — Обновить весь фреймворк с проверкой `BREAKING CHANGES`
Когда выходит новая версия `l1dder`, выполни одну команду:
```bash
npx l1dder@latest update
```
1. **Проверка чейнджлога и `BREAKING CHANGES`:** CLI сверяет версию из твоего `l1dder/config.json` с новой версией, показывает список изменений (`CHANGELOG`) и, если между версиями есть **ломающие изменения (`BREAKING CHANGES`)**, выводит заметное предупреждение и спрашивает:
   `❓ В новой версии есть ломающие изменения (BREAKING CHANGES). Продолжить обновление? (да/нет) [y/N]:`
   Только если ты отвечаешь **`да`** (или передаёшь флаг `--yes`), CLI выполняет обновление. Если ответить `нет` — ни один файл в проекте не меняется.
2. **Обновление фреймворка:** обновляет `00-methodology.mdc`, `10-conventions.mdc`, `20-workflow.mdc`, все 20 встроенных скиллов `/l1-*`, `ponytail*`, `mattpocock/skills`, шаблоны `templates/`, `user-guide/`, `METHODOLOGY.md` и синхронизирует папки всех агентов.

> 🔒 **Защита стека проекта:** При обновлении `npx l1dder@latest update` **никогда не перезаписывает** твой проектный стек (`l1dder/rules/30-tech-stack.mdc`, `l1dder/rules/40-skills-router.mdc`, `l1dder/ci/*` и секцию `"stack"` в `l1dder/skills.json`), а наоборот — сохраняет их и прокидывает во все подключённые агенты!
> Если нужно принудительно сбросить стек к заводскому шаблону — добавь флаг `--force`.

### `npx l1dder changelog`
Показывает полную историю версий `L1DDER`, список нововведений и все `BREAKING CHANGES`.

### `npx l1dder@latest update --skills` (или `npx l1dder skills update`) — Обновить ТОЛЬКО скиллы
Если ты хочешь подтянуть из новой версии `l1dder` **только скиллы** (`/l1-*`, `ponytail*`, `mattpocock/skills` и стек-скиллы из `l1dder/skills.json`), вообще не трогая ни правила `l1dder/rules/`, ни шаблоны `l1dder/templates/`, ни `AGENTS.md`/`CLAUDE.md`:
```bash
npx l1dder@latest update --skills
# (или: npx l1dder@latest update skills / npx l1dder@latest skills update)
```
Команда обновит только `l1dder/skills/**` и папки скиллов/команд в твоих ИИ-агентах (`.cursor/skills/`, `.claude/skills/`, `.claude/commands/`, `.agents/skills/` и т.д.).

### `npx l1dder skills` (`list | add | install | update`)
Управляет скиллами проекта по манифесту **`l1dder/skills.json`** (аналог `package.json` для скиллов ИИ-агентов):

```bash
# Показать список всех скиллов из l1dder/skills.json (l1dder, core, stack) и их статус:
npx l1dder skills list

# Добавить сторонний стек-скилл в секцию "stack" файла l1dder/skills.json, скачать его с GitHub в l1dder/skills/ и разложить во все активные агенты:
npx l1dder skills add vercel-labs/agent-skills --skill vercel-react-best-practices,vercel-composition-patterns
npx l1dder skills add anthropics/skills --skill frontend-design,webapp-testing

# Скачать все стек-скиллы, прописанные в секции "stack" файла l1dder/skills.json:
npx l1dder skills install

# Принудительно обновить из GitHub и стек-скиллы, и встроенные core-скиллы (ponytail + mattpocock/skills):
npx l1dder skills update
```

### `npx l1dder doctor`
Быстрая неблокирующая проверка целостности папки `l1dder/` и наличия трёх экранов управления (`docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`).

---

## 2. 📦 Манифест скиллов `l1dder/skills.json` («`package.json` для скиллов»)

Внутри папки `l1dder/` лежит файл **`l1dder/skills.json`**, который делит все скиллы проекта на 3 прозрачных слоя:

```json
{
  "l1dder": [
    "l1-onboard", "l1-idea", "l1-feature", "l1-planning", "l1-task", "l1-hotfix", "l1-evo"
  ],
  "core": [
    {
      "repo": "DietrichGebert/ponytail",
      "bundled": true,
      "skills": ["ponytail", "ponytail-review", "ponytail-audit", "ponytail-debt"]
    },
    {
      "repo": "mattpocock/skills",
      "bundled": true,
      "skills": [
        "grilling", "domain-modeling", "codebase-design", "tdd",
        "diagnosing-bugs", "code-review", "retro", "prototype", "writing-for-agents"
      ]
    }
  ],
  "stack": [
    {
      "repo": "anthropics/skills",
      "skills": ["frontend-design", "webapp-testing"]
    }
  ]
}
```

1. **`l1dder` (7 управляющих скиллов процесса):** собственные слэш-команды фреймворка (`/l1-onboard`, `/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task`, `/l1-hotfix`, `/l1-evo`).
2. **`core` (13 базовых инженерных дисциплин — уже в коробке `bundled: true`):**
   - **[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)**: `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`.
   - **[mattpocock/skills](https://github.com/mattpocock/skills)** (`Model-invoked` дисциплины): `grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `retro`, `prototype`, `writing-for-agents` (вместе со всеми их вспомогательными файлами `DEEPENING.md`, `DESIGN-IT-TWICE.md`, `tests.md`, `mocking.md`, `LOGIC.md`, `UI.md`, `GLOSSARY-FORMAT.md`, `ADR-FORMAT.md`).
   - Благодаря гибридному подходу (`bundled: true`) они **уже лежат внутри npm-пакета `l1dder`** и устанавливаются за долю секунды без интернета и VPN, но при желании легко обновляются из апстрима командой `npx l1dder skills update`.
3. **`stack` (скиллы под конкретный стек проекта):** настраиваются во время `/l1-onboard` (или командой `npx l1dder skills add <repo> --skill <name>`), сохраняются в `l1dder/skills.json` и не затираются при `npx l1dder sync`.

---

## 3. Куда именно устанавливаются файлы для каждого ИИ-агента

При вызове `npx l1dder init --agents ...` (или `npx l1dder sync` / `npx l1dder skills install`) инсталлятор раскладывает нативные форматы правил и всех 20+ скиллов под каждый инструмент:

| ИИ-Агент | Флаг `--agents` | Какие файлы создаются в проекте |
|----------|:---------------:|---------------------------------|
| **Cursor** | `cursor` | • `.cursor/rules/l1dder/*.mdc` (5 правил с `alwaysApply: true`)<br/>• `.cursor/skills/<skill>/*` (все 20+ скиллов `/l1-*`, `ponytail*`, `mattpocock/skills` и `stack`)<br/>• `AGENTS.md` (управляемый блок `<!-- l1dder:begin -->`) |
| **Claude Code** | `claude` | • `CLAUDE.md` (управляемый блок `<!-- l1dder:begin -->`)<br/>• `.claude/rules/l1dder/*.md` (модульные правила проекта)<br/>• `.claude/commands/<skill>.md` (слэш-команды)<br/>• `.claude/skills/<skill>/*` (полные папки всех скиллов) |
| **OpenAI Codex** | `codex` | • `AGENTS.md` (точка входа Codex)<br/>• `.agents/skills/<skill>/*` (полные папки всех 20+ скиллов) |
| **Windsurf** | `windsurf` | • `.windsurf/rules/l1dder.md` (сводные правила)<br/>• `.windsurf/workflows/<skill>.md` (слэш-воркфлоу)<br/>• `AGENTS.md` |
| **GitHub Copilot** | `copilot` | • `.github/copilot-instructions.md` (управляемый блок инструкций)<br/>• `.github/prompts/<skill>.prompt.md` (промт-команды) |
| **OpenCode** | `opencode` | • `AGENTS.md`<br/>• `.opencode/commands/<skill>.md`<br/>• `.agents/skills/<skill>/*` |
| **Cline / Roo Code** | `cline` | • `.clinerules/l1dder.md`<br/>• `.roo/rules/l1dder.md`<br/>• `AGENTS.md` |

> 💡 **Безопасное слияние (`Marker Block`):** Если у тебя в проекте уже были свои `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` или `.gitignore`, `L1DDER` **никогда не затирает** твой текст — он аккуратно обновляет только блок внутри маркеров `<!-- l1dder:begin --> ... <!-- l1dder:end -->`.
