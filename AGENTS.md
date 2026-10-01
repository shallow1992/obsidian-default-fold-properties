# AI Agent Guidelines (AGENTS.md)

Guidelines and operational principles for AI coding agents and human contributors working on Obsidian plugins derived from this template.

---

## 1. Development Environment & Docker Isolation (Mandatory)

To keep the host environment clean, isolated, and fully reproducible:
- **Execute all project commands inside Docker containers**:
  - `docker compose run --rm obsidian-plugin-template npm run build` (Type check & bundle)
  - `docker compose run --rm obsidian-plugin-template npm test` (Run unit tests with Vitest)
  - `docker compose run --rm obsidian-plugin-template npm run lint` (Official ESLint check)
  - `docker compose run --rm obsidian-plugin-template npm install <package>` (Dependency management)
- **Zero Host Execution**: Never install dependencies or run uncontained build/test scripts directly on the host machine.
- **Single-Command Execution**: When running shell commands, execute each command individually (avoid chaining with `&&`, `;`, or `||`) to preserve command auto-approval allowlists.

---

## 2. Git Worktree & Multi-Agent Isolation Workflow

To safely coordinate multiple AI agents (Claude Code, Antigravity, etc.) operating in the same repository:
- **1 Issue = 1 Branch = 1 Worktree Isolation**:
  - Never perform parallel feature work directly on `master`.
- **Namespace Separation**:
  - **Claude Code**: `<repo>/.claude/worktrees/issue-<number>-<short-desc>/`
  - **Antigravity**: `<repo>/.gemini/worktrees/issue-<number>-<short-desc>/`
- **Creation from Fresh Base**:
  ```bash
  # Fetch latest remote references
  git fetch origin
  # Example for Antigravity:
  git worktree add -b issue-<num>-<desc> .gemini/worktrees/issue-<num>-<desc> origin/master
  ```
- **Post-Merge Cleanup Protocol**:
  1. Tear down container volumes if any: `docker compose down -v`
  2. Pull latest master on root: `git pull --ff-only`
  3. Remove worktree: `git worktree remove .gemini/worktrees/issue-<num>-<desc>`
  4. Delete local branch: `git branch -d issue-<num>-<desc>`
  5. Prune remote tracking: `git fetch --prune`

---

## 3. Upstream Synchronization with Official Sample Plugin

This template maintains a shared Git commit history with the official [obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin):
- An automated GitHub Actions workflow (`.github/workflows/sync.yml`) runs weekly to detect upstream changes.
- When official updates occur, a Pull Request (`sync-official-upstream`) is automatically opened for review and merge.

---

## 4. Project Structure & Organization

- Single-file plugins: for very small plugins, a single `main.ts` may be acceptable.
- Multi-file plugins: organize by feature or layer under `src/`:
  ```text
  src/
    main.ts          # Plugin entry point (minimal lifecycle only)
    settings.ts      # Settings interface, defaults, and settings tab
    commands/        # Command registrations and handlers
    ui/              # UI components, modals, views
    utils/           # Utility functions, helpers
    types.ts         # TypeScript interfaces and types
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control.
- Generated output should be placed at the plugin root or `dist/` depending on your build setup. Release artifacts must end up at the top level of the plugin folder in the vault (`main.js`, `manifest.json`, `styles.css`).

---

## 5. Cross-Platform Compatibility & Security Principles

- **Mobile-First Compatibility (Strict)**:
  - **NEVER** use Node.js built-in modules (`fs`, `path`, `crypto`, `child_process`). They crash on mobile (iOS/Android).
  - Use standard Web APIs (`crypto.subtle`, `fetch`) and Obsidian APIs (`app.vault.adapter`).
  - Use `requestUrl` for HTTP/HTTPS requests to avoid CORS and ensure mobile networking compatibility.
- **Keychain Security (Zero Plaintext Secrets)**:
  - **NEVER** store API keys, passwords, client secrets, or OAuth tokens in `data.json` or `localStorage`.
  - Store sensitive credentials using Obsidian's official `app.secretStorage` (OS Keychain).
- **Resource Lifecycle**:
  - Register all DOM event listeners, intervals, and workspace events using `this.registerEvent()`, `this.registerDomEvent()`, and `this.registerInterval()`.
  - Ensure all non-managed resources are cleaned up in `onunload()`.
- **CSS Scoping**:
  - Scope all custom styles in `styles.css` under the plugin's unique root selector to prevent polluting other UI elements.

---

## 6. Security, Privacy, and Compliance

Follow Obsidian's Developer Policies and Community Plugin Guidelines:
- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. Explicit opt-in required for optional analytics.
- Minimize scope: read/write only what is necessary inside the vault. Do not access files outside the vault.
- Normalize and guard paths to prevent directory traversal (`..`).
- **Zero Host Environment Leaks**: Never hardcode host machine names, OS usernames, absolute local paths, or personal email addresses.

---

## 7. Git Workflow, Conventional Commits & Releases

- **Conventional Commits**:
  - Use standard prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`, `sec:`.
- **Squash and Merge**:
  - All PRs must be squash-merged into `master` to maintain a clean linear commit graph.
- **Remote CI Verification Obligation (Mandatory)**:
  - Check GitHub Actions CI status using `gh pr checks` or `gh run view`. Ensure all checks pass before merging.
- **Release Automation**:
  - Run `npm run version` to bump versions across `manifest.json`, `package.json`, and `versions.json`.
  - Push a Git tag (`git tag 1.0.0 && git push origin 1.0.0`) to trigger `.github/workflows/release.yml`, which creates a GitHub release attaching `main.js`, `manifest.json`, and `styles.css`.
  - Tags with pre-release suffixes (e.g. `1.0.0-beta.1`) are automatically flagged as pre-release for BRAT testing.
