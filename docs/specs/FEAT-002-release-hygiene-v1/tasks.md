# FEAT-002: Предрелизный гигиенический спринт — Декомпозиция на шаги (`FEAT-002.MM`)

| Поле паспорта | Значение |
|---------------|----------|
| **ID фичи / спеки** | `FEAT-002` |
| **Родительская идея (`IDEA-NNN`)** | [`IDEA-002`](../../ideas.md#idea-002) |
| **Запись в Бэклоге** | [`docs/backlog.md#feat-002`](../../backlog.md#feat-002) |

---

## Спринт: `SPRINT-01` — Гигиенический спринт, тест на 2 моделях (Composer и Grok), аудит `ponytail` и выкатка `v1.0.0`

**Цель спринта:** Автоматически проверить работу методологии `L1DDER` на двух разных моделях (`Composer` и `Grok`) в `playground/`, вычистить код и скиллы через `ponytail` и выкатить релиз `v1.0.0`.

| Статус | ID шага спеки | ID задачи спринта (`SPRINT-01`) | Тип | Название задачи | Ключевые артефакты |
|:------:|:-------------:|:-------------------------------:|:---:|-----------------|--------------------|
| [x] | `FEAT-002.01` | `TASK-01.01` | `feat` | Подготовка `playground/` и полностью автоматический тест методологии на 2 моделях (`Composer` и `Grok`) | `playground/prepare.mjs`, `playground/verify.mjs`, `.gitignore`, `package.json` |
| [x] | `FEAT-002.02` | `TASK-01.02` | `refactor` | Прогонка кодовой базы и всех 20 скиллов через `ponytail` (`ponytail-audit`, `ponytail-review`, `ponytail-debt`, `code-review`) и исправление косяков | `src/*`, `assets/i18n/{ru,en}/*`, `tests/*` |
| [x] | `FEAT-002.03` | `TASK-01.03` | `chore` | Подготовка и выкатка релиза `l1dder@1.0.0` (проверка тарбола `npm pack`, `CHANGELOG.md`, `releases.json`, git и деплой) | `package.json`, `CHANGELOG.md`, `assets/releases.json` |
| [x] | `FEAT-002.99` | `TASK-01.99` | `chore` | **Гигиена спринта и Doctor Checklist (E2E + UAT + Docs Sync)** *(Обязательная финальная задача)* | `docs/`, `site/`, `l1dder/` |
