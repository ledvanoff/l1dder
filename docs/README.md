# Навигатор документации проекта `L1DDER` (Dogfooding)

Этот репозиторий (`L1DDER`) сам разрабатывается и поддерживается по собственной методологии **L1DDER** (100% Dogfooding).

---

## 1. Три главных экрана управления

| Экран | Файл | Назначение |
|-------|------|------------|
| 💡 **Банк Идей** | [`docs/ideas.md`](./ideas.md) | Реестр всех продуктовых и архитектурных идей (`IDEA-NNN`) |
| 📋 **Бэклог и Таск-трекер** | [`docs/backlog.md`](./backlog.md) | Реестр фич (`FEAT-NNN`), декомпозиция на спринты и задачи, журнал хотфиксов |
| 🔒 **Роадмап (Источник истины)** | [`docs/roadmap.md`](./roadmap.md) | Очередь реализации спринтов (`Delivery Queue`) и очередь проработки идей (`Discovery Queue`) |

---

## 2. Базовый концепт (`docs/concept/`)

- [`concept/idea.md`](./concept/idea.md) — суть продукта, аудитория и границы MVP `v1.0.0`.
- [`concept/vision.md`](./concept/vision.md) — техническое видение, роли и стек.
- [`concept/architecture.md`](./concept/architecture.md) — глубокие модули (`Deep Modules`) и публичные швы (`Seams`) CLI.
- [`concept/data-model.md`](./concept/data-model.md) — схемы `config.json`, `skills.json` и `releases.json`.

---

## 3. Спецификации фич и Спринты

- **Спецификации (`docs/specs/`):**
  - [`FEAT-002-release-hygiene-v1/`](./specs/FEAT-002-release-hygiene-v1/requirements.md) — Предрелизная гигиена, автотест на 2 моделях (`Composer` и `Grok`) в `playground/`, аудит `ponytail` и выкатка `v1.0.0`.
- **Спринты (`docs/sprints/`):**
  - [`SPRINT-01-release-hygiene-v1/README.md`](./sprints/SPRINT-01-release-hygiene-v1/README.md) — Активный предрелизный гигиенический спринт.
