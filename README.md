# FileBrain Desktop

A universal file understanding system that runs entirely on your PC. No cloud, no subscriptions — all AI processing stays local using Ollama.

## Features
- **Local AI** — Uses Ollama (`llama3.2` + `nomic-embed-text`) for all analysis. Your files never leave your computer.
- **No login required** — Single-user, local app. Just open and use.
- **Semantic search** — Find files by meaning, not just filename.
- **Knowledge graph** — Automatically discovers connections between documents.
- **Auto-tagging** — AI generates tags, summaries, and key topics for every file.

---

## Distribution formats

There are two ways to distribute FileBrain:

| Format | File | How it works |
|--------|------|--------------|
| **Installer** | `FileBrain-Setup-1.0.0.exe` | Standard Windows installer. Installs to `%LOCALAPPDATA%\Programs`. On first launch, FileBrain auto-downloads and installs Ollama + AI models. Uninstaller lets you remove Ollama and model files too. |
| **Portable ZIP** | `FileBrain-Portable-1.0.0-win.zip` | No installer needed. Unzip anywhere (USB drive, desktop, etc.) and double-click `FileBrain.exe`. On first launch, FileBrain auto-installs Ollama + AI models — same automatic setup as the installer version. |

Both versions behave identically after the first launch.

---

## Building from source

> **You must build on Windows** to produce `.exe` files (electron-builder uses platform-native tooling).
> macOS and Linux builds must be done on their respective platforms.

### Requirements

Before building, install on your Windows PC:
- [Node.js v20+](https://nodejs.org/) — runtime and build tool
- [Git](https://git-scm.com/) — to clone the repo
- **Visual Studio Build Tools** (for compiling the SQLite native module):
  - Run: `npm install --global windows-build-tools`
  - Or install "Desktop development with C++" from [Visual Studio](https://visualstudio.microsoft.com/downloads/)

### Step 1 — Install dependencies

```bash
cd filebrain-desktop
npm install
```

This also compiles the SQLite native module automatically (`postinstall` script).

### Step 2 — Build

**Both formats at once (recommended):**
```bash
npm run dist:win:all
```

**Installer only:**
```bash
npm run dist:win:setup
```

**Portable ZIP only:**
```bash
npm run dist:win:portable
```

### Step 3 — Find your files

Both output to the `release/` folder:
```
release/
  FileBrain-Setup-1.0.0.exe       ← installer
  FileBrain-Portable-1.0.0-win.zip ← portable ZIP
```

---

## Development (live hot-reload)

```bash
cd filebrain-desktop
npm install
npm run dev
```

---

## How the automatic first-launch setup works

Both the installer and portable versions do this automatically on first open:

1. Checks if Ollama is already installed/running
2. If not installed → silently downloads and installs `OllamaSetup.exe` (no GUI window pops up)
3. Starts the Ollama background service (hidden, no taskbar window)
4. Downloads `llama3.2` (~2 GB) with a live progress bar
5. Downloads `nomic-embed-text` (~270 MB) with a live progress bar
6. Marks setup complete — this wizard never appears again

**Total first-launch time:** ~5–15 minutes depending on internet speed and whether Ollama is already installed.

---

## Uninstalling (installer version only)

Run the standard Windows uninstaller. You'll be offered optional cleanup:
- Uninstall Ollama (the AI engine)
- Delete downloaded AI model files (~2–3 GB)
- Delete FileBrain's local file database

For the **portable version**, just delete the unzipped folder. To also remove Ollama:
- Uninstall via Windows Settings → Apps
- Delete `%USERPROFILE%\.ollama\models` to reclaim disk space

---

## Data storage

Your file index (SQLite database) is stored at:
- **Installer version:** `%APPDATA%\FileBrain\filebrain.db`
- **Portable version:** `%APPDATA%\FileBrain\filebrain.db` (same location — data persists even if you move the portable folder)

To back up your data, copy that file.

---

## Troubleshooting

**Setup wizard gets stuck** — Click "Retry". If it keeps failing, click "Skip" — the app works with keyword search even without Ollama.

**Processing is slow** — `llama3.2` runs on CPU without a GPU. Each file takes 30–120 seconds. For faster results, use a smaller model like `llama3.2:1b` and update `TEXT_MODEL` in `src/main/ollama.ts`.

**"Model not found" error** — Run `ollama pull llama3.2` and `ollama pull nomic-embed-text` in a terminal.
