# Obsidian Fold Properties

An Obsidian plugin that folds frontmatter properties by default when opening notes, eliminating layout shift (CLS = 0) with seamless state management.

---

## ✨ Features

- **Fold Frontmatter by Default**: Automatically opens notes with their Properties (YAML frontmatter) folded, keeping your note view clean and uncluttered.
- **Zero Layout Shift (CLS = 0)**: Intercepts Obsidian's pre-render fold manager, ensuring notes open collapsed on the very first frame without animations, delayed pop-ins, or jarring jumps.
- **Two Customizable Modes**:
  - **Remember state (default folded)** *(Default)*: Notes start folded by default. If you manually expand properties on a note, your choice is remembered and respected when reopening.
  - **Always fold**: Properties are always collapsed upon opening, even if you previously expanded them during a session.
- **Safe & Clean State Reset**: A dedicated **Reset all fold states** setting cleanly strips frontmatter fold markers from Obsidian storage without affecting headings or lists, ensuring Obsidian's vanilla behavior can be fully restored at any time.
- **Zero External Dependencies**: Operates entirely offline with standard Obsidian APIs. No telemetry, no background network calls, and no unnecessary data bloat.

---

## ⚙️ Settings

Go to **Settings** -> **Fold Properties**:

| Setting | Options / Action | Description |
| :--- | :--- | :--- |
| **Fold behavior** | `Remember state (default folded)` / `Always fold` | Choose whether to remember manually opened properties or always fold properties when opening a note. |
| **Reset all fold states** | `Reset fold states` (Button) | Selectively clears frontmatter fold states from Obsidian's storage while keeping heading and list folds intact. |

---

## 🚀 Installation

### Via BRAT (Beta Reviewers Auto-update Tester)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in Obsidian.
2. In BRAT settings, add beta plugin: `shallow1992/obsidian-fold-properties`.
3. Enable **Fold Properties** in Community Plugins.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [Latest Release](https://github.com/shallow1992/obsidian-fold-properties/releases/latest).
2. Create a folder named `obsidian-fold-properties` in `<vault>/.obsidian/plugins/`.
3. Copy the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in **Settings** -> **Community Plugins**.

---

## 🛠️ Development

This project uses Docker to guarantee an isolated and reproducible build environment.

```bash
# Run unit tests (Vitest)
docker compose run --rm obsidian-fold-properties npm test

# Run ESLint (official obsidianmd ruleset)
docker compose run --rm obsidian-fold-properties npm run lint

# Production build
docker compose run --rm obsidian-fold-properties npm run build
```

---

## 📄 License

[0-BSD](./LICENSE)
