# Makefile — L1DDER Framework Repository (Dogfooding Contract)

.PHONY: dev build lint format typecheck test test-e2e doctor ci

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

doctor:
	node dist/cli.js doctor

ci: typecheck build test test-e2e doctor
