# 📜 Worklog & Changelog развития методологии `L1DDER`

> **Директория:** `l1dder/evolution/`
> **Правила доработки:** [`METHODOLOGY-RULES.md`](./METHODOLOGY-RULES.md)
> **Актуальный Handoff:** [`HANDOFF.md`](./HANDOFF.md)
> **Формат:** Каждая итерация доработки самой методологии фиксируется сверху вниз (свежие записи наверху).

---

## [v1.0.0] — 2026-10-21 — Релиз `L1DDER v1.0.0` (Zero Hidden State + Multi-Agent CLI + RU/EN)

### Итерация 6: Объединение `L1DDER` CLI и методологии `L1 METHOD` в `L1DDER v1.0.0`
- **Задача автора:**
  1. Переименовать корневую папку методологии в `l1dder/`.
  2. Сделать ультра-тонкий CLI (`npx l1dder init`, `npx l1dder sync`, `npx l1dder doctor`) без `state.yml` и хрупких блокировок.
  3. Добавить поддержку установки не только в Cursor, но и во все популярные ИИ-агенты (`Cursor`, `Claude Code`, `OpenAI Codex`, `Windsurf`, `GitHub Copilot`, `OpenCode`, `Cline`).
  4. Сделать полную двуязычную поставку (`ru` и `en`), универсальный шаблон стека без привязки к конкретному проекту, скилл `/l1-onboard` и сайт документации на GitHub Pages.
- **Что сделано:**
  - `Added`: Мульти-агентный инсталлятор и синхронизатор `npx l1dder init` / `npx l1dder sync` с поддержкой `--lang ru|en` и `--agents cursor,claude,codex,windsurf,copilot,opencode,cline,all`.
  - `Added`: Скилл `/l1-onboard` для автоматической настройки стека (`30-tech-stack.mdc`, `40-skills-router.mdc`, `Makefile`) и пошагового старта `from-scratch` / `existing-code`.
  - `Added`: Полная локализация всех правил, скиллов, шаблонов и путеводителя на русский (`ru`) и английский (`en`) языки.
  - `Added`: Двуязычный сайт документации на VitePress с поддержкой Mermaid-диаграмм и автодеплоем на GitHub Pages.

---

### Итерации 1–5: Формирование ядра методологии
- Разделение `Core vs Stack`, введение 3 экранов управления (`docs/ideas.md`, `docs/backlog.md`, `docs/roadmap.md`), сквозной цепочки ID с `ID Passport`, обязательной задачи `TASK-NN.99` (`Doctor Checklist`), интеграция `ponytail` и практик `mattpocock/skills` (`grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `retro`), создание `user-guide/` и контура саморазвития `/l1-evo`.
