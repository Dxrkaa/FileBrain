# FileBrain

**Your personal knowledge base — powered by AI that runs entirely on your computer.**

FileBrain lets you upload any kind of file — PDFs, Word documents, PowerPoint presentations, spreadsheets, images, code files, text files — and uses artificial intelligence to read, summarise, and tag them automatically. You can then search across everything you have uploaded using plain language, explore how your files connect to each other, and open any file directly from within the app.

Everything happens locally on your computer. No cloud services, no account, no subscription, and no internet required after the initial setup.

---

## Table of contents

- [What FileBrain does](#what-filebrain-does)
- [System requirements](#system-requirements)
- [Installing FileBrain](#installing-filebrain)
- [What happens during first launch](#what-happens-during-first-launch)
- [Using FileBrain](#using-filebrain)
- [Uninstalling FileBrain](#uninstalling-filebrain)
- [Privacy](#privacy)
- [Where your data is stored](#where-your-data-is-stored)
- [Frequently asked questions](#frequently-asked-questions)
- [For developers — building from source](#for-developers--building-from-source)

---

## What FileBrain does

- **Understands your files** — Upload a file and ask FileBrain to process it. The AI reads the content and writes a plain-language summary, assigns up to four descriptive tags, and identifies the key topics covered.
- **Semantic search** — Search for files by meaning, not just by filename or keyword. Ask something like *"quarterly revenue with charts"* and FileBrain will find the relevant files even if those exact words do not appear in the filename.
- **Smart tagging** — Tags are kept consistent across similar files. If you upload a new report that is similar to ones you have already processed, FileBrain will reuse the same tags so your knowledge base stays organised.
- **Knowledge graph** — A visual map shows how your files are connected to each other based on their content and topics, making it easy to spot relationships you might not have noticed.
- **AI-powered search suggestions** — The search page generates short prompts based on what is actually in your knowledge base, so you always have a useful starting point.
- **Open files directly** — Click "Open File" on any file to launch it in the program Windows normally uses for that file type. For example, a `.pptx` file will open in PowerPoint.
- **English and Norwegian** — Switch the interface and all AI-generated content between English and Norwegian at any time. Switching back restores the original without any loss or drift.

---

## System requirements

- Windows 10 or Windows 11 (64-bit)
- At least 8 GB of RAM (16 GB recommended for smooth AI processing)
- At least 6 GB of free disk space for the AI models
- An internet connection during first-time setup only

---

## Installing FileBrain

Two versions are available. Both work identically after installation.

### Option 1 — Installer (recommended)

1. Download `FileBrain-Setup.exe`.
2. Double-click it to run the installer.
3. Follow the on-screen steps. The installer does not require administrator rights and installs FileBrain for your Windows user account only.
4. Once complete, launch FileBrain from the Start menu or the desktop shortcut.

### Option 2 — Portable ZIP

1. Download `FileBrain-Portable.zip`.
2. Extract the ZIP to any folder you like — your desktop, a USB drive, or anywhere else.
3. Open the extracted folder and double-click `FileBrain.exe`.
4. No installation step is needed. You can move or delete the folder at any time.

> The portable version stores your knowledge base in the standard Windows user data folder (`%APPDATA%\FileBrain`), not inside the app folder itself. This means your data stays safe even if you move or update the app files.

---

## What happens during first launch

The very first time you open FileBrain, a setup screen appears and walks through the following steps automatically. This only ever happens once.

**Step 1 — Checking for Ollama**
FileBrain looks to see whether Ollama is already installed on your computer. Ollama is a free, open-source program that runs AI models locally. If it is already installed, this step completes instantly.

**Step 2 — Installing Ollama** *(skipped if already installed)*
If Ollama is not found, FileBrain downloads and installs it silently. No separate windows or prompts appear. Ollama is installed to `%LOCALAPPDATA%\Programs\Ollama`.

**Step 3 — Starting Ollama**
FileBrain starts the Ollama engine in the background so it is ready to process files. It runs hidden — there is no taskbar icon or console window.

**Step 4 — Downloading the AI models**
Two AI models are downloaded to your computer:

| Model | Size | Purpose |
|-------|------|---------|
| llama3.2 | ~2 GB | Reads and understands text; writes summaries and tags |
| nomic-embed-text | ~300 MB | Enables semantic search by understanding meaning |

A progress bar shows the download status for each model. The total download is around 2–3 GB, so the time this takes depends on your internet speed. A fast broadband connection typically takes 5–15 minutes.

**Step 5 — Ready**
FileBrain opens automatically. The setup screen will never appear again. From this point on, FileBrain launches in a few seconds and works completely offline.

---

## Using FileBrain

**Uploading files**
Go to the Files page and drag files onto the drop area, or click the upload button to browse. FileBrain accepts PDFs, Word documents, PowerPoint files, Excel spreadsheets, images, text files, code files, and more, up to 50 MB per file.

**Processing files with AI**
After uploading, click "Process with AI" on a file to have the AI read it and generate a summary, tags, and key topics. This takes between 30 seconds and 2 minutes per file depending on the file size and your computer's speed. You can continue using the rest of the app while a file is being processed.

**Searching**
Go to the Search page and type a question or description in plain language. FileBrain compares the meaning of your query against all processed files and returns the most relevant results, along with a relevance score and a brief explanation of why each file matched.

**Opening a file**
On any file's detail page, click "Open File" to launch it in its default Windows application. If the file has been moved or deleted from its original location, a message will let you know.

**Switching language**
Use the language toggle in the top navigation bar to switch between English and Norwegian. All summaries, tags, and key topics are translated automatically. Switching back restores the original AI-generated content exactly — it does not retranslate from the translated version.

---

## Uninstalling FileBrain

### If you used the installer

1. Open **Windows Settings** and go to **Apps** (or **Add or Remove Programs** on older Windows versions).
2. Find **FileBrain** in the list and click **Uninstall**.

The uninstaller will:
- Stop the Ollama engine if it is currently running.
- Delete your FileBrain knowledge base and all data the app has stored (file summaries, tags, and the database).
- Delete the downloaded AI model files (freeing approximately 2–3 GB of disk space).
- Ask whether you also want to uninstall Ollama itself.

**About the Ollama question:**
Ollama is installed as a standalone program and may be used by other applications besides FileBrain. If FileBrain is the only program that uses it and you want a completely clean removal, choose **Yes**. If you use Ollama with other tools or are not sure, choose **No** — FileBrain will be fully removed and Ollama will be left as it is.

> The Ollama question only appears during a manual uninstall from Windows Settings. It will not appear if you reinstall or upgrade FileBrain.

### If you used the portable version

1. Close FileBrain.
2. Delete the folder you extracted the ZIP into.
3. To also remove your knowledge base data, press `Win + R`, type `%APPDATA%\FileBrain`, press Enter, and delete that folder.
4. To remove Ollama, go to **Windows Settings → Apps**, find **Ollama**, and uninstall it from there.
5. To reclaim the disk space used by AI models, press `Win + R`, type `%USERPROFILE%\.ollama\models`, press Enter, and delete the folder.

---

## Privacy

FileBrain is designed from the ground up to keep your files and data on your device. Here is what that means in practice:

**No account required.**
There is no sign-up, no login, and no user profile. FileBrain is a single-user local application. It does not know who you are.

**No internet connection after setup.**
Once the AI models are downloaded during first-time setup, FileBrain runs entirely offline. No part of the app communicates with any external server during normal use.

**No telemetry or analytics.**
FileBrain does not collect usage statistics, error reports, or any information about your files, your searches, or how you use the application.

**Your files stay on your computer.**
When you upload a file, its content is saved to a local database on your hard drive. Nothing is uploaded to any server, ever.

**The AI runs on your hardware.**
The AI that reads your files, writes summaries, generates tags, and powers search runs entirely inside Ollama on your own machine. Your file contents are never sent to OpenAI, Google, Microsoft, or any other external service.

**Your search queries are private.**
When you search, the query is processed by the local AI model running on your computer. It does not leave your device.

**Ollama is open source.**
The AI engine FileBrain uses, [Ollama](https://ollama.com), is free and open-source software. Its code is publicly available and can be inspected by anyone.

**The only time FileBrain uses the internet** is during the initial setup, to download the Ollama installer and the two AI model files. After that, no network access is needed or used.

---

## Where your data is stored

| What | Location |
|------|----------|
| App files (installer version) | `%LOCALAPPDATA%\Programs\FileBrain` |
| Knowledge base database | `%APPDATA%\FileBrain\filebrain.db` |
| AI model files | `%USERPROFILE%\.ollama\models` |
| Ollama engine | `%LOCALAPPDATA%\Programs\Ollama` |

To navigate to any of these locations, press `Win + R`, paste the path shown above, and press Enter.

To back up your knowledge base, copy the file at `%APPDATA%\FileBrain\filebrain.db` to a safe location.

---

## Frequently asked questions

**Do I need an internet connection to use FileBrain?**
Only during the initial setup to download Ollama and the AI models. After that, FileBrain works entirely offline.

**How long does it take to process a file?**
Between 30 seconds and 2 minutes per file, depending on the file size and your computer's speed. Processing uses your CPU (or GPU if available). You can continue using the rest of the app while a file is being processed.

**Will FileBrain slow down my computer?**
Processing files is the most demanding task and may briefly use a significant portion of your CPU. Browsing, searching, and viewing files within the app is lightweight.

**Can I use FileBrain if Ollama is already installed?**
Yes. FileBrain detects an existing Ollama installation and uses it without reinstalling or changing anything.

**What happens to my files if I uninstall and reinstall FileBrain?**
If you uninstall using the standard Windows uninstaller, your knowledge base is removed as part of the cleanup. If you reinstall, you start with an empty knowledge base and would need to upload your files again. To preserve your data across reinstalls, back up `%APPDATA%\FileBrain\filebrain.db` before uninstalling.

**Is my data backed up anywhere?**
No. FileBrain stores everything locally and does not back up your data automatically. To keep your knowledge base safe, copy `%APPDATA%\FileBrain\filebrain.db` to another location periodically.

**The "Open File" button does not appear for some of my files — why?**
The "Open File" button requires that FileBrain knows the original location of the file on your disk. Files uploaded before this feature was added do not have a stored path. Any file you upload now will have the button available.

**Can FileBrain open files that are stored on a network drive or USB?**
Yes, as long as the drive is connected and the file is still at the same path it was at when you uploaded it.

**Is FileBrain available for Mac or Linux?**
FileBrain is built and tested for Windows. The source code can be compiled for Mac and Linux, but no official installer is provided for those platforms at this time.

---

## For developers — building from source

> You must build on Windows to produce `.exe` files. macOS and Linux builds must be done on their respective platforms.

### Requirements

Install on your Windows PC before building:

- [Node.js v20+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- **Visual Studio Build Tools** (needed to compile the SQLite native module):
  - Install "Desktop development with C++" workload from [Visual Studio](https://visualstudio.microsoft.com/downloads/), or run `npm install --global windows-build-tools`

### Install dependencies

```bash
cd filebrain-desktop
npm install
```

The `postinstall` script compiles the native SQLite module automatically.

### Build

```bash
# Both formats at once (recommended)
npm run dist:win:all

# Installer only
npm run dist:win:setup

# Portable ZIP only
npm run dist:win:portable
```

Output is written to the `release/` folder:

```
release/
  FileBrain-Setup-1.0.0.exe
  FileBrain-Portable-1.0.0-win.zip
```

### Development with live reload

```bash
npm run dev
```

### Troubleshooting builds

**Setup wizard gets stuck** — Click "Retry". If it keeps failing, click "Skip" — the app continues to work with keyword search even without Ollama running.

**Processing is slow** — `llama3.2` runs on CPU if no compatible GPU is detected. Each file takes 30–120 seconds in that case. For faster results on low-spec machines, use a smaller model like `llama3.2:1b` and update `TEXT_MODEL` in `src/main/ollama.ts`.

**"Model not found" error** — Run `ollama pull llama3.2` and `ollama pull nomic-embed-text` in a terminal window.
