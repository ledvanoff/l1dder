# Git-конвенции (L1DDER)

---

## Ветки

### Формат

```
<type>/<scope>-TASK-NN.MM-<short-description>
```

**Типы:**

| Тип | Когда использовать |
|-----|--------------------|
| `feat` | Новая функциональность |
| `fix` | Исправление бага |
| `chore` | Инфраструктура, зависимости, CI/CD, гигиена спринта |
| `docs` | Только документация и спецификации |
| `refactor` | Рефакторинг без изменения функциональности |

**Примеры:**
- `feat/search-TASK-01.01-query-parser`
- `feat/ui-TASK-01.02-filter-bar`
- `chore/sprint-01-TASK-01.99-doctor`
- `fix/auth-HOTFIX-001-token-refresh`

---

## Commit-сообщения

### Формат

```
<type>(<scope>): <описание в повелительном наклонении>
```

Описание начинается со строчной буквы, без точки в конце.

**Примеры:**
```
feat(search): add query filter parser and url serializer
feat(ui): connect tag filter bar to catalog list
fix(auth): refresh expired session token before retry
test(search): add seam tests for multi-tag filtering
```

---

## Pull Requests

### Процесс

1. Создать ветку от `main`.
2. Сделать коммиты по теме задачи.
3. Открыть PR в `main`.
4. После ревью — **Squash and Merge**.
5. После merge — удалить ветку.

### Шаблон описания PR

```markdown
## Паспорт ID
- **Задача:** `TASK-NN.MM` (`FEAT-NNN.MM`)
- **Спринт:** `SPRINT-NN`
- **Фича:** `FEAT-NNN` ← **Идея:** `IDEA-NNN`

## Что сделано
- [1–3 пункта: что реализовано]

## Как проверить
- `make ci`

## Связанные документы
- Plan: [ссылка на plan.md]
- Summary: [ссылка на summary.md]
```

---

## Правила безопасности

1. **Никогда не пушить напрямую в `main` без проверки `make ci`.**
2. Один PR = одна задача (один `plan.md`).
3. `.env`, токены, приватные ключи (`*.pem`, `*.key`, `*.p12`) — **никогда** не коммитятся.
4. В репозитории хранится только `.env.example` с пустыми плейсхолдерами.
