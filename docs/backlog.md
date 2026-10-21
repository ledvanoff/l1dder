# Бэклог и Таск-трекер — L1DDER

> **Методология:** L1DDER (100% Dogfooding)
> **Скиллы управления:** пополняется через `/l1-feature`, привязывается к спринтам через `/l1-planning`, статусы задач обновляются через `/l1-task` и `/l1-hotfix`.
> **Источник истины по очерёдности:** [`docs/roadmap.md`](./roadmap.md)
> **Последнее обновление:** 2026-10-21

---

## 1. Реестр Фич (Feature Backlog)

| ID фичи / спеки | Название фичи | ID идеи (`IDEA-NNN`) | Приоритет | Статус | Папка спеки | Спринты (`SPRINT-NN`) |
|-----------------|---------------|:--------------------:|:---------:|--------|-------------|-----------------------|
| [`FEAT-001`](#feat-001) | Базовое ядро L1DDER v1.0.0 (CLI, 20 скиллов, skills.json, RU/EN, VitePress Docs) | [`IDEA-001`](./ideas.md#idea-001) | P0 | ✅ реализована | — | Завершено |
| [`FEAT-002`](#feat-002) | Предрелизный гигиенический спринт, полигон на 2 моделях (Composer и Grok), аудит ponytail и релиз v1.0.0 | [`IDEA-002`](./ideas.md#idea-002) | P0 | ✅ реализована | [`FEAT-002`](./specs/FEAT-002-release-hygiene-v1/) | [`SPRINT-01`](./sprints/SPRINT-01-release-hygiene-v1/README.md) |

---

## 2. Декомпозиция Фич, Спринты и Задачи (Task Tracker)

### FEAT-001: Базовое ядро L1DDER v1.0.0 {#feat-001}

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-001` |
| **Родительская идея** | [`IDEA-001`](./ideas.md#idea-001) |
| **Приоритет** | `P0` |
| **Статус фичи** | `✅ реализована` |

---

### FEAT-002: Предрелизный гигиенический спринт, полигон на 2 моделях (Composer и Grok), аудит ponytail и релиз v1.0.0 {#feat-002}

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-002` |
| **Родительская идея** | [`IDEA-002`](./ideas.md#idea-002) |
| **Папка спецификации** | [`docs/specs/FEAT-002-release-hygiene-v1/`](./specs/FEAT-002-release-hygiene-v1/) |
| **Приоритет** | `P0` |
| **Статус фичи** | `✅ реализована` |
| **Назначенные спринты** | `SPRINT-01` |

#### Спринт: `SPRINT-01` — Гигиенический спринт и выкатка `v1.0.0` (`✅ реализована`)
- **ID спринта:** `SPRINT-01`
- **Родительские ID:** `FEAT-002` → `IDEA-002`
- **Цель спринта:** Подготовить `playground/`, автоматически протестировать `L1DDER` на двух моделях (`Composer` и `Grok`), провести ревизию через `ponytail` и все скиллы, и подготовить релиз `v1.0.0`.
- **Документ спринта:** [`docs/sprints/SPRINT-01-release-hygiene-v1/README.md`](./sprints/SPRINT-01-release-hygiene-v1/README.md)

| ID шага спеки | ID задачи спринта | Название задачи | Тип | Статус | Plan | Summary |
|:-------------:|:-----------------:|-----------------|:---:|--------|------|---------|
| `FEAT-002.01` | `TASK-01.01` | Подготовка `playground/` и полностью автоматический тест методологии на 2 моделях (`Composer` и `Grok`) | `feat` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.01-playground-dual-model-test/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.01-playground-dual-model-test/summary.md) |
| `FEAT-002.02` | `TASK-01.02` | Прогонка кодовой базы и всех 20 скиллов через `ponytail` (`ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`) и исправление косяков | `refactor` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.02-ponytail-skills-audit/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.02-ponytail-skills-audit/summary.md) |
| `FEAT-002.03` | `TASK-01.03` | Подготовка и выкатка релиза `l1dder@1.0.0` (`npm pack`, `CHANGELOG.md`, `releases.json`, git и деплой) | `chore` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.03-release-v1-0-0/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.03-release-v1-0-0/summary.md) |
| `FEAT-002.99` | `TASK-01.99` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная)* | `chore` | ✅ реализована | [plan](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.99-doctor/plan.md) | [summary](./sprints/SPRINT-01-release-hygiene-v1/tasks/TASK-01.99-doctor/summary.md) |

---

## 3. Журнал Хотфиксов (`HOTFIX-NNN`)

| ID хотфикса | Связанный ID (`FEAT-NNN` / `TASK-NN.MM` или `—`) | Дата | Проблема / Симптом | Что исправлено | Статус | Коммит / PR |
|-------------|:------------------------------------------------:|------|--------------------|----------------|--------|:-----------:|
| — | — | — | — | — | — | — |
