# Модель данных и конфигурационных файлов L1DDER

> В `L1DDER` отсутствует скрытый `state.yml`. Все конфигурационные структуры представляют собой простые, прозрачные JSON-файлы и таблицы `ID Passport` в Markdown.

---

## 1. Конфигурация установки (`l1dder/config.json`)

Хранит выбранный язык, версию установленного фреймворка и список активных ИИ-агентов проекта:

```json
{
  "version": "1.0.0",
  "language": "ru",
  "rootDir": "l1dder",
  "agents": ["cursor", "claude", "codex"]
}
```

---

## 2. Манифест скиллов (`l1dder/skills.json`)

Аналог `package.json` для скиллов ИИ-агентов. Секции `l1dder` и `core` обновляются при выходе новых версий фреймворка, а секция `stack` принадлежит проекту и сохраняется при обновлениях:

```json
{
  "l1dder": ["l1-onboard", "l1-idea", "l1-feature", "l1-planning", "l1-task", "l1-hotfix", "l1-evo"],
  "core": [
    { "repo": "DietrichGebert/ponytail", "bundled": true, "skills": ["ponytail", "ponytail-review", "ponytail-audit", "ponytail-debt"] },
    { "repo": "mattpocock/skills", "bundled": true, "skills": ["grilling", "domain-modeling", "codebase-design", "tdd", "diagnosing-bugs", "code-review", "retro", "prototype", "writing-for-agents"] }
  ],
  "stack": []
}
```

---

## 3. Реестр релизов и ломающих изменений (`assets/releases.json`)

Используется модулем `src/changelog.ts` при вызове `npx l1dder@latest update` для вывода списка изменений и запроса подтверждения при наличии `breaking`:

| Поле | Тип | Описание |
|------|-----|----------|
| `version` | `string` (`semver`) | Версия релиза (`"1.0.0"`) |
| `date` | `string` (`YYYY-MM-DD`) | Дата выпуска |
| `summary` | `{ ru: string, en: string }` | Краткая суть релиза |
| `changes` | `{ ru: string[], en: string[] }` | Список новых возможностей и улучшений |
| `breaking` | `{ ru: string[], en: string[] }` | Список ломающих изменений (`BREAKING CHANGES`), требующих подтверждения `да/нет` при обновлении |
