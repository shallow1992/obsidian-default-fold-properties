# Obsidian Plugin Template (Batteries-Included)

A robust, production-grade template repository for building [Obsidian](https://obsidian.md) plugins.

It builds directly upon the official [obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) while adding **Docker isolation**, **Vitest unit testing**, **automated upstream synchronization**, and **GitHub Actions CI/CD**.

---

## 🚀 Key Features

- **Official Upstream Synchronization**: Shares Git commit history with `obsidianmd/obsidian-sample-plugin`. A weekly GitHub Actions workflow (`sync-upstream.yml`) automatically checks for official updates and opens Pull Requests.
- **Docker Container Isolation**: Zero dependencies on host runtime. Build, lint, and test entirely inside Docker containers (`node:22-alpine`).
- **Automated Unit Testing**: Pre-configured with [Vitest](https://vitest.dev) and a comprehensive Obsidian API mock (`tests/__mocks__/obsidian.ts`).
- **CI/CD Pipeline**: GitHub Actions for automated type checking, official ESLint linting (`eslint-plugin-obsidianmd`), Vitest test suite execution, and automatic GitHub Releases on tag push.
- **AI Agent-Friendly**: Includes `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` defining strict single source of truth guidelines.
- **One-Command Setup**: Run `./init-plugin.sh` to customize plugin ID, name, description, and Docker namespace in seconds.

---

## 🛠️ Quick Start

### 1. Create a Repository from this Template
Click the green **"Use this template"** button on GitHub to create your new plugin repository.

### 2. Initialize Plugin Configuration
Clone your new repository, then run the initialization script:
```bash
./init-plugin.sh
```
This prompts for your plugin ID, name, and author, then automatically configures `manifest.json`, `package.json`, and `docker-compose.yml`.

### 3. Development Workflow (Docker)

All commands are executed inside Docker to keep your host environment clean:

```bash
# 1. Install dependencies
docker compose run --rm obsidian-plugin-template npm install

# 2. Start development mode (watch mode)
docker compose up obsidian-plugin-template

# 3. Run automated tests (Vitest)
docker compose run --rm obsidian-plugin-template npm test

# 4. Run linting (official ruleset)
docker compose run --rm obsidian-plugin-template npm run lint

# 5. Production build
docker compose run --rm obsidian-plugin-template npm run build
```

---

## 🧪 Testing & Mocks

Unit tests reside in the `tests/` directory and run via Vitest. The `obsidian` module is automatically aliased to `tests/__mocks__/obsidian.ts`, allowing you to mock and assert calls to `app`, `Plugin`, `Notice`, `Modal`, `Setting`, and `PluginSettingTab` without needing a live Electron instance.

Run tests:
```bash
docker compose run --rm obsidian-plugin-template npm test
```

---

## 🔄 Upstream Synchronization

The workflow `.github/workflows/sync-upstream.yml` runs every Monday (09:00 UTC) and can also be triggered manually (`Actions` -> `Sync Upstream` -> `Run workflow`).

When the official Obsidian team updates `obsidianmd/obsidian-sample-plugin`, the workflow will:
1. Fetch latest commits from upstream.
2. Merge them into a `sync-official-upstream` branch.
3. Automatically create a Pull Request against `master`.

---

## 📦 Releasing

1. Update your plugin version:
   ```bash
   docker compose run --rm obsidian-plugin-template npm run version
   ```
2. Commit and push the changes:
   ```bash
   git commit -am "chore: release version 1.0.0"
   git tag 1.0.0
   git push origin master --tags
   ```
3. GitHub Actions (`.github/workflows/release.yml`) will automatically create a GitHub Release and attach `main.js`, `manifest.json`, and `styles.css`.
