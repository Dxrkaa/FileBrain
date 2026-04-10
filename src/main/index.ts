import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { startServer } from "./server";
import {
  isSetupComplete,
  markSetupComplete,
  checkOllamaSetup,
  installOllama,
  startOllamaServe,
  stopOllama,
  pullModel,
} from "./setup";

let mainWindow: BrowserWindow | null = null;
let serverPort = 0;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "FileBrain",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.filebrain.app");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  serverPort = await startServer();

  // Auto-start Ollama silently on every launch once setup has been completed.
  // During first-run setup the wizard calls start-ollama via IPC instead.
  if (isSetupComplete()) {
    startOllamaServe().catch(() => {
      // Non-fatal — Ollama may already be running or install may be missing.
      // The app still works for keyword search without it.
    });
  }

  ipcMain.handle("get-server-port", () => serverPort);
  ipcMain.handle("is-setup-complete", () => isSetupComplete());
  ipcMain.handle("mark-setup-complete", () => { markSetupComplete(); return true; });

  // Open a file with the OS default application (e.g. PowerPoint opens .pptx).
  // shell.openPath returns an empty string on success, or an error message.
  ipcMain.handle("open-file", async (_event, filePath: string) => {
    const err = await shell.openPath(filePath);
    return err ? { ok: false, error: err } : { ok: true };
  });
  ipcMain.handle("check-ollama-setup", () => checkOllamaSetup());
  ipcMain.handle("start-ollama", () => startOllamaServe());

  ipcMain.handle("install-ollama", async (event) => {
    try {
      await installOllama((status, percent) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("install-progress", { status, percent });
        }
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle("pull-model", async (event, modelName: string) => {
    try {
      await pullModel(modelName, (status, percent) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("pull-progress", { model: modelName, status, percent });
        }
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Shut Ollama down before the app exits — runs on X button, Alt+F4, taskbar close, etc.
app.on("before-quit", async (event) => {
  event.preventDefault();
  try {
    await stopOllama();
  } catch { /* ignore errors during shutdown */ }
  app.exit(0);
});

app.on("window-all-closed", () => {
  app.quit();
});
