import { app } from "electron";
import { join } from "path";
import { existsSync, writeFileSync, createWriteStream } from "fs";
import { tmpdir, platform } from "os";
import { execFile, exec, spawn, ChildProcess } from "child_process";
import { is } from "@electron-toolkit/utils";
import https from "https";
import http from "http";

const SETUP_FLAG_PATH = is.dev
  ? join(process.cwd(), ".setup-complete")
  : join(app.getPath("userData"), ".setup-complete");

export function isSetupComplete(): boolean {
  return existsSync(SETUP_FLAG_PATH);
}

export function markSetupComplete(): void {
  writeFileSync(SETUP_FLAG_PATH, new Date().toISOString(), "utf-8");
}

const OLLAMA_BASE = "http://localhost:11434";
const REQUIRED_MODELS = ["llama3.2", "nomic-embed-text"];

// Track the Ollama process we started so we can shut it down cleanly
let ollamaProcess: ChildProcess | null = null;
let ollamaPid: number | undefined;

export interface OllamaCheckResult {
  ollamaInstalled: boolean;
  ollamaRunning: boolean;
  models: { name: string; pulled: boolean }[];
}

function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

async function isOllamaInPath(): Promise<boolean> {
  const checkCmd = platform() === "win32" ? "where ollama" : "which ollama";
  try { await runCommand(checkCmd); return true; } catch { return false; }
}

function getOllamaWinPath(): string | null {
  const candidates = [
    join(process.env["LOCALAPPDATA"] ?? "", "Programs", "Ollama", "ollama.exe"),
    join(process.env["USERPROFILE"] ?? "", "AppData", "Local", "Programs", "Ollama", "ollama.exe"),
    join(process.env["PROGRAMFILES"] ?? "", "Ollama", "ollama.exe"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Remove Ollama from Windows startup registry so it only runs when FileBrain opens it */
async function disableOllamaStartup(): Promise<void> {
  if (platform() !== "win32") return;
  await new Promise<void>((resolve) => {
    exec(
      'reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Ollama" /f',
      () => resolve() // resolve regardless — key may not exist yet
    );
  });
}

/** Kill any Ollama GUI / tray window that auto-started */
async function killOllamaGui(): Promise<void> {
  if (platform() !== "win32") return;
  await new Promise<void>((resolve) => {
    exec(
      'taskkill /F /IM "ollama app.exe" 2>nul & taskkill /F /IM "Ollama.exe" 2>nul',
      () => resolve()
    );
  });
}

/**
 * Kill the Ollama server process that FileBrain started.
 * Called when the app is about to quit.
 */
export async function stopOllama(): Promise<void> {
  const os = platform();

  if (os === "win32") {
    // Always force-kill all ollama.exe processes — cleanest approach on Windows
    await new Promise<void>((resolve) => {
      exec('taskkill /F /IM "ollama.exe" /T 2>nul', () => resolve());
    });
  } else {
    // On macOS / Linux, kill the specific PID we spawned if we have it
    if (ollamaPid) {
      try { process.kill(ollamaPid, "SIGTERM"); } catch { /* already dead */ }
      // Give it a moment, then force-kill if needed
      await new Promise((r) => setTimeout(r, 1000));
      try { process.kill(ollamaPid, "SIGKILL"); } catch { /* already dead */ }
    } else {
      exec("pkill -f 'ollama serve'");
    }
  }

  ollamaProcess = null;
  ollamaPid = undefined;
}

export async function checkOllamaSetup(): Promise<OllamaCheckResult> {
  const ollamaInstalled =
    platform() === "win32"
      ? getOllamaWinPath() !== null || (await isOllamaInPath())
      : await isOllamaInPath();

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const pulledNames: string[] = (data.models ?? []).map((m: { name: string }) =>
        m.name.split(":")[0]
      );
      return {
        ollamaInstalled: true,
        ollamaRunning: true,
        models: REQUIRED_MODELS.map((n) => ({ name: n, pulled: pulledNames.includes(n) })),
      };
    }
  } catch { /* not running */ }

  return {
    ollamaInstalled,
    ollamaRunning: false,
    models: REQUIRED_MODELS.map((n) => ({ name: n, pulled: false })),
  };
}

function downloadFile(
  url: string,
  destPath: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (redirectUrl: string, depth = 0) => {
      if (depth > 10) { reject(new Error("Too many redirects")); return; }
      const lib = redirectUrl.startsWith("https") ? https : http;
      lib.get(redirectUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location, depth + 1);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const total = parseInt(res.headers["content-length"] ?? "0", 10);
        let received = 0;
        const file = createWriteStream(destPath);
        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (total > 0) onProgress(Math.round((received / total) * 100));
        });
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", reject);
        res.on("error", reject);
      }).on("error", reject);
    };
    follow(url);
  });
}

export async function installOllama(
  onProgress: (status: string, percent: number | null) => void
): Promise<void> {
  const os = platform();

  if (os === "win32") {
    const tmpDir = tmpdir();
    const installerPath = join(tmpDir, "OllamaSetup.exe");

    onProgress("Downloading Ollama installer...", 0);
    await downloadFile("https://ollama.com/download/OllamaSetup.exe", installerPath, (pct) => {
      onProgress(`Downloading Ollama... ${pct}%`, pct);
    });

    onProgress("Installing Ollama silently...", null);
    await new Promise<void>((resolve, reject) => {
      execFile(installerPath, ["/S"], { timeout: 120000 }, (err) => {
        if (err) reject(new Error(`Ollama install failed: ${err.message}`));
        else resolve();
      });
    });

    // Kill any GUI window the installer auto-started, and disable startup
    onProgress("Configuring Ollama...", null);
    await killOllamaGui();
    await disableOllamaStartup();
    await new Promise((r) => setTimeout(r, 1000));
    return;
  }

  if (os === "darwin") {
    const tmpDir = tmpdir();
    const zipPath = join(tmpDir, "Ollama.zip");
    onProgress("Downloading Ollama for macOS...", 0);
    await downloadFile("https://ollama.com/download/Ollama-darwin.zip", zipPath, (pct) => {
      onProgress(`Downloading Ollama... ${pct}%`, pct);
    });
    onProgress("Extracting Ollama...", null);
    await new Promise<void>((resolve, reject) => {
      execFile("unzip", ["-o", zipPath, "-d", "/Applications"], (err) => {
        if (err) reject(err); else resolve();
      });
    });
    return;
  }

  if (os === "linux") {
    onProgress("Installing Ollama for Linux...", null);
    await new Promise<void>((resolve, reject) => {
      exec("curl -fsSL https://ollama.com/install.sh | sh", { timeout: 300000 }, (err) => {
        if (err) reject(new Error(`Ollama install failed: ${err.message}`));
        else resolve();
      });
    });
    return;
  }

  throw new Error(`Unsupported platform: ${os}`);
}

export async function startOllamaServe(): Promise<void> {
  const os = platform();

  // Kill any GUI tray window first
  await killOllamaGui();

  try {
    if (os === "win32") {
      const ollamaExe = getOllamaWinPath() ?? "ollama";
      // Use PowerShell Start-Process to launch Ollama with no visible window.
      // This is more reliable than spawn's windowsHide flag in Electron.
      const child = spawn(
        "powershell.exe",
        [
          "-WindowStyle", "Hidden",
          "-NonInteractive",
          "-Command",
          `Start-Process -FilePath '${ollamaExe}' -ArgumentList 'serve' -WindowStyle Hidden`,
        ],
        { windowsHide: true, stdio: "ignore" }
      );
      ollamaProcess = child;
      ollamaPid = child.pid;
      // PowerShell exits immediately after launching Ollama; we still
      // kill Ollama by name (taskkill) on shutdown, so we don't need the PID.
    } else if (os === "darwin") {
      const child = spawn("open", ["-a", "Ollama", "--hide"], {
        detached: true,
        stdio: "ignore",
      });
      ollamaProcess = child;
      ollamaPid = child.pid;
    } else {
      const child = spawn("ollama", ["serve"], {
        detached: true,
        stdio: "ignore",
      });
      ollamaProcess = child;
      ollamaPid = child.pid;
    }
  } catch { /* ignore — may already be running */ }

  // Give Ollama time to bind to the port
  await new Promise((r) => setTimeout(r, 3000));
}

export async function pullModel(
  modelName: string,
  onProgress: (status: string, percent: number | null) => void
): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: modelName, stream: true }),
    signal: AbortSignal.timeout(600000),
  });

  if (!res.ok) throw new Error(`Failed to start pull: ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const status = String(obj.status ?? "");
        let percent: number | null = null;
        if (obj.total && obj.completed) {
          percent = Math.round((obj.completed / obj.total) * 100);
        }
        onProgress(status, percent);
        if (status === "success") return;
      } catch { /* skip */ }
    }
  }
}
