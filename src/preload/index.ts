import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electron", {
  getServerPort: (): Promise<number> =>
    ipcRenderer.invoke("get-server-port"),

  isSetupComplete: (): Promise<boolean> =>
    ipcRenderer.invoke("is-setup-complete"),

  markSetupComplete: (): Promise<void> =>
    ipcRenderer.invoke("mark-setup-complete"),

  checkOllamaSetup: (): Promise<{
    ollamaInstalled: boolean;
    ollamaRunning: boolean;
    models: { name: string; pulled: boolean }[];
  }> => ipcRenderer.invoke("check-ollama-setup"),

  installOllama: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("install-ollama"),

  startOllama: (): Promise<void> =>
    ipcRenderer.invoke("start-ollama"),

  pullModel: (modelName: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("pull-model", modelName),

  onInstallProgress: (
    callback: (data: { status: string; percent: number | null }) => void
  ): (() => void) => {
    const handler = (_e: IpcRendererEvent, data: { status: string; percent: number | null }) =>
      callback(data);
    ipcRenderer.on("install-progress", handler);
    return () => ipcRenderer.removeListener("install-progress", handler);
  },

  onPullProgress: (
    callback: (data: { model: string; status: string; percent: number | null }) => void
  ): (() => void) => {
    const handler = (_e: IpcRendererEvent, data: { model: string; status: string; percent: number | null }) =>
      callback(data);
    ipcRenderer.on("pull-progress", handler);
    return () => ipcRenderer.removeListener("pull-progress", handler);
  },

  openFile: (filePath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("open-file", filePath),
});
