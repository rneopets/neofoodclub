# Just recipes for development, testing, deployment, and automation

default:
	@just --summary

# Install dependencies (prefer clean, reproducible installs if lockfile exists)
install:
	@if [ -f bun.lock ]; then bun install --frozen-lockfile; else bun install; fi
	just wasm-setup

# One-time: install the wasm32 rustup target + init the neofoodclub.rs submodule
wasm-setup:
	rustup target add wasm32-unknown-unknown
	git submodule update --init --recursive wasm/neofoodclub_rs

# Build the wasm-bindgen math core (also wired into npm's prestart/prebuild/pretest hooks)
wasm-build:
	bun run build:wasm

# Clean build artifacts
clean:
	rm -rf build coverage .vite playwright-report

# Clean everything including node_modules (slower)
clean-all:
	rm -rf node_modules build coverage .vite playwright-report wasm/neofoodclub_rs/target wasm/pkg

# Start dev server
dev:
	bun run start

# Start dev server with react-scan disabled
dev-no-scan:
	bun run start:no-scan

# Build app
build:
	bun run build

# Build app (Vite automatically copies public assets)
build-assets:
	bun run build

# Preview production build locally
preview:
	bun run serve

# Type-check TypeScript
typecheck:
	bun run typecheck

# Lint source
lint:
	bun run lint

# Lint and auto-fix
lint-fix:
	bun run lint:fix

# Format source with Prettier
format:
	bun run format

# Run unit tests in watch mode
test:
	bun run test

# Run unit tests once (non-watch)
test-run:
	bunx vitest run

# Unit test coverage (CI-friendly)
test-coverage:
	bun run test:coverage

# Unit test coverage (watch)
test-coverage-watch:
	bun run test:coverage:watch

# Unit test coverage with UI
test-coverage-ui:
	bun run test:coverage:ui

# End-to-end tests
e2e:
	bun run test:e2e

# End-to-end tests with UI
e2e-ui:
	bun run test:e2e:ui

# End-to-end tests, headed
e2e-headed:
	bun run test:e2e:headed

# End-to-end tests in Chromium only
e2e-chromium:
	bun run test:e2e:chromium

# Install Playwright browsers
e2e-install:
	bunx --yes playwright install

# Quick check: typecheck + lint + unit tests (non-watch)
check:
	just typecheck
	just lint
	just test-run

# Chakra UI codegen CLI
chakra:
	bun run chakra

# Start dev server optimized for performance (no scan)
dev-perf:
	bun run start:performance
