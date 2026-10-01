# Architecture & Design Decisions

This document outlines the architectural rationale, design decisions, and synchronization mechanisms for the `obsidian-plugin-template` repository.

---

## 1. Upstream Tracking via `.upstream-commit` and Clean Patch Synchronization

- **Design Philosophy**:
  - The template starts from a clean, single initial root commit to provide a fresh foundation without historical baggage or unintended commit noise.
  - Rather than relying on recursive 3-way `git merge` which can cause `unrelated histories` conflicts or re-introduce old upstream commits, official upstream tracking is managed via `.upstream-commit`.
- **How it Works**:
  1. The latest tracked commit SHA from `https://github.com/obsidianmd/obsidian-sample-plugin.git` is stored in `.upstream-commit`.
  2. The automated workflow (`.github/workflows/sync-upstream.yml`) fetches `upstream/master` and compares the latest upstream SHA against `.upstream-commit`.
  3. When new commits are detected, it generates a clean git diff patch (`git diff $CURRENT_SHA..$LATEST_SHA`), applies it, updates `.upstream-commit`, and opens an automated Pull Request.
- **Benefits**:
  - Zero risk of merge conflict lockups or commit tree pollution.
  - Transparent upstream tracking: the exact official commit level is always visible in `.upstream-commit`.

---

## 2. Docker Container Isolation & Worktree Scalability

- **Problem**: Running Node.js, npm scripts, linters, and test runners directly on the host pollutes developer environments with global dependencies, potential cache drift, and disparate Node/npm engine versions. Furthermore, running multiple git worktrees concurrently can cause container and volume collisions if names are hardcoded.
- **Decision**: All building, testing, linting, and package installations are strictly executed inside Docker containers (`node:22-alpine`).
- **Parallel Worktree Safety**: Containers rely on Docker Compose project naming (directory-based) without fixed container names, and named volumes (`node_modules`) are project-scoped. This allows multiple agents and worktrees to execute `docker compose run` and `up` concurrently without conflict.

---

## 3. One-Command Customization (`init-plugin.sh`)

- **Scope**:
  - Automatically converts human-readable plugin names to PascalCase class names (e.g. `Page Flow` -> `PageFlowPlugin`).
  - Rewrites `manifest.json`, `package.json`, `docker-compose.yml`, `src/main.ts`, `src/settings.ts`, `tests/main.test.ts`, and `README.md`.
- **Result**: Immediate zero-friction start where `npm run build` and `npm test` work instantly under the new plugin identity.

---

## 4. Testing Framework (Vitest + Comprehensive Obsidian Mock)

- **Problem**: Obsidian plugins run inside Electron/Mobile with native runtime globals (`app`, `Plugin`, `Notice`, `Modal`, `Setting`, `PluginSettingTab`). Without mocks, unit testing plugin logic outside the Obsidian runtime fails.
- **Decision**: Vitest is configured with a path alias mapping `obsidian` to `tests/__mocks__/obsidian.ts`. TypeScript compiler options in `tsconfig.json` include `tests/**/*.ts` to enforce strict type checking across both production and test suites.
