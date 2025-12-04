# Just recipes for development, testing, deployment, and automation

default:
	@just --summary

# Install dependencies (prefer clean, reproducible installs if lockfile exists)
install:
	@if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Clean build artifacts
clean:
	rm -rf build coverage .vite playwright-report

# Clean everything including node_modules (slower)
clean-all:
	rm -rf node_modules build coverage .vite playwright-report

# Start dev server
dev:
	npm start

# Start dev server with react-scan disabled
dev-no-scan:
	npm run start:no-scan

# Build app
build:
	npm run build

# Build app (Vite automatically copies public assets)
build-assets:
	npm run build

# Preview production build locally
preview:
	npm run serve

# Type-check TypeScript
typecheck:
	npm run typecheck

# Lint source
lint:
	npm run lint

# Lint and auto-fix
lint-fix:
	npm run lint:fix

# Format source with Prettier
format:
	npm run format

# Run unit tests in watch mode
test:
	npm test

# Run unit tests once (non-watch)
test-run:
	npx vitest run

# Unit test coverage (CI-friendly)
test-coverage:
	npm run test:coverage

# Unit test coverage (watch)
test-coverage-watch:
	npm run test:coverage:watch

# Unit test coverage with UI
test-coverage-ui:
	npm run test:coverage:ui

# End-to-end tests
e2e:
	npm run test:e2e

# End-to-end tests with UI
e2e-ui:
	npm run test:e2e:ui

# End-to-end tests, headed
e2e-headed:
	npm run test:e2e:headed

# End-to-end tests in Chromium only
e2e-chromium:
	npm run test:e2e:chromium

# Install Playwright browsers
e2e-install:
	npx --yes playwright install

# Quick check: typecheck + lint + unit tests (non-watch)
check:
	just typecheck
	just lint
	just test-run

# Run Vercel build helper (Vite automatically copies public assets)
vercel-build:
	just build-assets

# Vercel: local dev
vercel-dev:
	npx --yes vercel dev

# Vercel: link project to current directory
vercel-link:
	npx --yes vercel link --yes

# Vercel: login (interactive)
vercel-login:
	npx --yes vercel login

# Vercel: deploy preview
vercel-deploy-preview:
	npx --yes vercel deploy --prebuilt --yes

# Vercel: deploy production
vercel-deploy-prod:
	npx --yes vercel deploy --prebuilt --prod --yes

# Automation: run dockerized monthly updater via compose
automation-update:
	cd automation && docker compose run --rm nfc_values
	cp automation/output/typescript.ts src/app/constants_logit.ts

# Automation: build compose image
automation-build:
	cd automation && docker compose -f docker-compose.yml build

# Automation: run compose job directly
automation-run:
	cd automation && docker compose -f docker-compose.yml run --rm nfc_values

# Chakra UI codegen CLI
chakra:
	npm run chakra

# Start dev server optimized for performance (no scan)
dev-perf:
	npm run start:performance
