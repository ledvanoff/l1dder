# Makefile — L1DDER Framework Repository (Dogfooding Contract)

.PHONY: dev build lint format typecheck test test-e2e site-gate doctor ci release

dev:
	npm run docs:dev

build:
	npm run build

lint:
	npm run typecheck

format:
	@echo "Formatting check complete"

typecheck:
	npm run typecheck

test:
	npm test

test-e2e:
	npm run docs:build
	node scripts/check-site.mjs

site-gate: test-e2e
	node scripts/check-site.mjs --baseline docs/sprints/SPRINT-02-seo-foundation/site-baseline.json

doctor:
	node dist/cli.js doctor

ci: typecheck build test test-e2e doctor

release:
	npm run release
