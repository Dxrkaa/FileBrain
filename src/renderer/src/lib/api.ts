declare global {
  interface Window {
    electron: {
      getServerPort: () => Promise<number>;
      isSetupComplete: () => Promise<boolean>;
      markSetupComplete: () => Promise<void>;
      checkOllamaSetup: () => Promise<{
        ollamaInstalled: boolean;
        ollamaRunning: boolean;
        models: { name: string; pulled: boolean }[];
      }>;
      installOllama: () => Promise<{ ok: boolean; error?: string }>;
      startOllama: () => Promise<void>;
      pullModel: (modelName: string) => Promise<{ ok: boolean; error?: string }>;
      onInstallProgress: (
        callback: (data: { status: string; percent: number | null }) => void
      ) => () => void;
      onPullProgress: (
        callback: (data: { model: string; status: string; percent: number | null }) => void
      ) => () => void;
    };
  }
}

let port: number | null = null;

async function getPort(): Promise<number> {
  if (port !== null) return port;
  if (window.electron) {
    port = await window.electron.getServerPort();
  } else {
    port = 3847;
  }
  return port;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const p = await getPort();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`http://127.0.0.1:${p}${path}`, { ...options, headers });
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}
