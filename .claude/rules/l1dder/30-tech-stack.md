# Технологический стек проекта L1DDER (Stack Rules — Dogfooding)

> Этот файл определяет стек самого репозитория `L1DDER`. Шаблон для внешних проектов хранится в `assets/i18n/{ru,en}/rules/30-tech-stack.mdc`. При вызове `npx l1dder update` / `sync` этот файл защищён от перезаписи (`STACK_PROTECTED_FILES`) и автоматически синхронизируется в `.cursor/rules/l1dder/` и `.claude/rules/l1dder/`.

---

## 1. Сводная матрица стека

| Слой | Выбор | Назначение и ключевые ограничения |
|------|-------|-----------------------------------|
| **Язык и рантайм** | `TypeScript 5.7+` (`strict: true`), `Node.js >= 20` (`.nvmrc = 22`) | Строгая типизация (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`). 0 внешних runtime-зависимостей в CLI. |
| **Сборщик CLI** | `tsup` (ESM bundle → `dist/cli.js`) | Единый исполняемый бандл без внешних пакетов (`node:fs`, `node:path`, `node:readline/promises`). |
| **Ассеты и Релизы** | `assets/i18n/{ru,en}/` + `assets/releases.json` | Двуязычный каталог правил (`rules/`), 20 скиллов (`skills/`), шаблонов (`templates/`), гайдов (`user-guide/`). **`assets/releases.json` — единственный источник истины для версии пакета и `CHANGELOG.md`**. |
| **Сайт документации** | `VitePress` + `vitepress-plugin-mermaid` (`site/`) | Двуязычный (`/` RU и `/en/` EN) статический сайт для GitHub Pages с рендером диаграмм Mermaid. |
| **Тестирование и полигон** | `Vitest` (`tests/*.test.ts`) + `playground/` | Unit/Integration-тесты CLI и полигон `playground/` для автоматического прогона сценариев на реальных моделях ИИ (`Composer`, `Grok`). |

---

## 2. Архитектура репозитория `L1DDER`

```
L!DDER-REBORN/
├── src/                        # Исходный код тонкого CLI (Deep Modules):
│   ├── types.ts                # Типы конфигурации, манифеста скиллов и отчётов
│   ├── assets.ts               # Загрузка двуязычных ассетов из assets/i18n/{ru,en}/ и защита Stack-файлов
│   ├── agents.ts               # Генерация и дедупликация файлов для 7 ИИ-агентов (Cursor, Claude, Codex, Windsurf, Copilot, OpenCode, Cline)
│   ├── skills-manager.ts       # Управление манифестом l1dder/skills.json и скачивание стек-скиллов
│   ├── changelog.ts            # Проверка версий semver, вывод чейнджлога и защита от BREAKING CHANGES
│   ├── installer.ts            # Операции init, update/sync (включая skills-only) и doctor
│   └── cli.ts                  # Парсер аргументов и точка входа CLI
├── assets/
│   ├── releases.json           # ЕДИНСТВЕННЫЙ источник истины по версиям, чейнджлогу и BREAKING CHANGES (RU + EN)
│   └── i18n/{ru,en}/           # Эталонные шаблоны, правила, 20 скиллов и документация
├── scripts/
│   ├── sync-release-meta.mjs   # Автосинхронизация version в package.json и генерация CHANGELOG.md из assets/releases.json
│   ├── sync-root-l1dder.mjs    # Синхронизация догфудинг-инстанса ./l1dder/ и папок агентов
│   ├── sync-site-docs.mjs      # Синхронизация страниц VitePress сайта ./site/ из assets/i18n/{ru,en}/
│   ├── check-site.mjs          # Проверка готовой сборки сайта: ссылки, якоря, файлы, sitemap.xml, llms.txt, SEO-теги и сравнение со снимком
│   ├── render-release-notes.mjs # Заметки GitHub Release (EN + RU) для одной версии из assets/releases.json
│   └── release.mjs             # Автоматический выпуск релиза (make ci -> merge dev into main -> tag vX.Y.Z -> push)
├── l1dder/                     # Догфудинг-инстанс методологии самого проекта L1DDER
├── docs/                       # Догфудинг-документация самого проекта L1DDER (concept/, ideas.md, backlog.md, roadmap.md, specs/, sprints/)
├── playground/                 # Изолированный полигон для автотестирования методологии на моделях (Composer, Grok)
├── site/                       # Исходники сайта документации VitePress (RU + EN)
└── tests/                      # Автотесты CLI, дедупликации скиллов, skills.json и BREAKING CHANGES
```

---

## 3. Makefile проекта и цикл `Edit → Sanitize → Verify`

```makefile
make dev            # npm run docs:dev (локальный сервер сайта документации)
make build          # npm run build (sync-release-meta + tsup + sync-root-l1dder + sync-site-docs)
make lint           # npm run typecheck (проверка типов tsc --noEmit)
make typecheck      # npm run typecheck
make test           # npm test (vitest run)
make test-e2e       # npm run docs:build + scripts/check-site.mjs (сборка сайта и проверка ссылок, якорей, файлов, sitemap.xml, llms.txt и тегов)
make site-gate      # make test-e2e + сравнение сайта со снимком docs/site-baseline.json (запускается внутри make release)
make site-baseline  # make test-e2e + запись нового снимка (только осознанно, с причиной в коммите)
make doctor         # node dist/cli.js doctor (проверка целостности l1dder/ и docs/)
make ci             # typecheck + build + test + test-e2e + doctor
make release        # npm run release (выкатка новой версии из assets/releases.json в main, GitHub Pages и npm)
```

---

## 4. Git-флоу (`dev` → `main`) и Правила версионирования / релиза

1. **Ежедневная работа в ветке `dev` (без поднятия версии):**
   - Вся разработка (`/l1-idea`, `/l1-feature`, `/l1-planning`, `/l1-task`, `/l1-evo`, `/l1-hotfix`) и внутренние инфраструктурные правки (`scripts/`, `Makefile`, `tests/`, `playground/`, `docs/`) ведутся в ветке **`dev`**.
   - Внутренние изменения репозитория, не меняющие поведение опубликованного пакета `l1dder`, **не требуют** добавления новой версии в `assets/releases.json` — они просто коммитятся в `dev`.
2. **Как выпустить новую версию пакета (`make release`):**
   - **`assets/releases.json` — единственный файл, где задаётся версия и пишется чейнджлог.** Никогда не правь `"version"` в `package.json` и `CHANGELOG.md` руками — их автоматически перезаписывает `scripts/sync-release-meta.mjs` при `npm run build`!
   - Шаг 1: Добавь новый объект релиза на самый верх массива `"releases"` в `assets/releases.json` (`version`, `date`, `summary`, `changes`, `breaking` на `ru` и `en`).
   - Шаг 2: Запусти в терминале (находясь на ветке `dev`):
     ```bash
     make release
     ```
   - Скрипт `scripts/release.mjs` автоматически проверит, что тега `vX.Y.Z` ещё нет, прогонит `make ci` (обновив `package.json` и `CHANGELOG.md`) и `make site-gate`, закоммитит их в `dev`, переключится на `main`, смержит `dev`, поставит тег `vX.Y.Z`, запушит `main`, `dev` и теги в `origin` и вернёт ветку обратно на `dev`.
   - На пуш в `main` с тегом `vX.Y.Z` GitHub Actions автоматически деплоит сайт на GitHub Pages (`docs.yml`) и публикует пакет в npmjs через OIDC (`publish.yml`).
3. **Как выкатить только сайт, без релиза:**
   - Любой пуш в `main`, даже без тега, сразу деплоит сайт (`docs.yml`) и меняет README на GitHub. В npm публикует только тег `v*`. Деплой сайта разрешён только из `main`.
   - Выполняется только по прямой просьбе пользователя в текущем диалоге. Просьбы «закоммить», «запушь», «доделай» её не заменяют.
   - **Обязательная проверка перед пушем.** Покажи пользователю, что накопилось в `dev`, и дождись его подтверждения:
     ```bash
     git fetch origin
     git log --oneline origin/main..origin/dev
     git diff --stat origin/main origin/dev
     ```
   - В отчёте назови список коммитов, что изменится на сайте и в README, и есть ли правки в `src/` и `assets/`. Сайт собирается из `assets/i18n/`, поэтому такие правки опишут на сайте поведение, которого ещё нет в npm. В этом случае предложи релиз, а не выкатку только сайта.
   - Перед пушем `make ci` и `make site-gate` должны пройти без ошибок.
   - Только перемотка и только ветка, без тегов. Значение `site-only` не подходит ни к одному тегу, поэтому пуш `v*` хук всё равно заблокирует:
     ```bash
     git switch main
     git merge --ff-only origin/dev
     L1DDER_RELEASE_CONFIRM=site-only git push origin main
     git switch dev
     ```
   - После деплоя проверь живой сайт и убедись, что версия в npm и список тегов не изменились.

---

## 5. Сайт документации и SEO

1. Новая страница сайта добавляется в таблицу `site/.vitepress/seo.mts` со своими заголовком (до 70 символов) и описанием (до 160 символов) на языке страницы. Без записи сборка падает, и это не обходится.
2. Поисковики могут показывать свой заголовок вместо нашего. Это не баг сайта и не чинится правкой разметки: заголовок должен соответствовать содержанию страницы, а расхождения смотрятся в панелях поисковиков.
3. Заголовок, описание, канонический адрес, `hreflang`, Open Graph и `llms.txt` собираются из `site/.vitepress/seo.mts`. Во frontmatter страниц их не добавляй: часть страниц перезаписывается из `assets/i18n/`.
4. `make ci` проверяет готовую сборку через `scripts/check-site.mjs`: ссылки, якоря, файлы, `sitemap.xml`, `llms.txt` и теги.
5. `make site-gate` сравнивает сайт со снимком `docs/site-baseline.json` и запускается внутри `make release`, поэтому ухудшение сайта останавливает выпуск. Если страница, текст или меню изменились намеренно, обнови снимок через `make site-baseline` и укажи причину в коммите.
6. Корень `https://ledvanoff.github.io/` живёт в отдельном репозитории `ledvanoff/ledvanoff.github.io`: личная страница автора, теги подтверждения Google и Яндекса, `robots.txt` и корневой `llms.txt`. Теги оттуда не удаляй: поисковики периодически их перепроверяют.
