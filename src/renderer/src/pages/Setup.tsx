import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, CheckCircle, Loader2, XCircle, RefreshCw } from "lucide-react";
import { useT } from "@/i18n";

interface Props { onComplete: () => void }

interface StepState {
  id: string; labelKey: string; status: "waiting" | "active" | "done" | "error";
  detail: string; percent: number | null;
}

const INITIAL_STEPS: StepState[] = [
  { id: "check",            labelKey: "setup_step_check",   status: "waiting", detail: "", percent: null },
  { id: "install",          labelKey: "setup_step_install", status: "waiting", detail: "", percent: null },
  { id: "start",            labelKey: "setup_step_start",   status: "waiting", detail: "", percent: null },
  { id: "llama3.2",         labelKey: "setup_step_llama",   status: "waiting", detail: "", percent: null },
  { id: "nomic-embed-text", labelKey: "setup_step_nomic",   status: "waiting", detail: "", percent: null },
];

export function Setup({ onComplete }: Props) {
  const { t } = useT();
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [errorMsg, setErrorMsg] = useState("");
  const [running, setRunning] = useState(false);
  const ranRef = useRef(false);

  const setStep = useCallback(
    (id: string, patch: Partial<StepState>) =>
      setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    []
  );

  const run = useCallback(async () => {
    setRunning(true);
    setErrorMsg("");
    setSteps(INITIAL_STEPS);

    try {
      setStep("check", { status: "active", detail: "Looking for Ollama..." });
      const status = await window.electron.checkOllamaSetup();
      setStep("check", { status: "done", detail: "" });

      if (!status.ollamaInstalled && !status.ollamaRunning) {
        setStep("install", { status: "active", detail: "Downloading Ollama installer..." });
        const unsubInstall = window.electron.onInstallProgress(({ status: s, percent }) => {
          setStep("install", { detail: s, percent });
        });
        const installResult = await window.electron.installOllama();
        unsubInstall();
        if (!installResult.ok) throw new Error(installResult.error ?? "Ollama install failed");
        setStep("install", { status: "done", detail: "", percent: null });
      } else {
        setStep("install", { status: "done", detail: t("setup_already_installed") });
      }

      if (!status.ollamaRunning) {
        setStep("start", { status: "active", detail: "Starting Ollama service..." });
        await window.electron.startOllama();
        let ready = false;
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const check = await window.electron.checkOllamaSetup();
            if (check.ollamaRunning) { ready = true; break; }
          } catch { /* keep waiting */ }
          setStep("start", { detail: `${t("setup_waiting")} (${i + 1}s)` });
        }
        if (!ready) throw new Error(t("setup_not_responding"));
        setStep("start", { status: "done", detail: "" });
      } else {
        setStep("start", { status: "done", detail: t("setup_already_running") });
      }

      const latestStatus = await window.electron.checkOllamaSetup();
      const unsubPull = window.electron.onPullProgress(({ model, status: s, percent }) => {
        setStep(model, { detail: s, percent });
      });

      for (const model of latestStatus.models) {
        if (model.pulled) {
          setStep(model.name, { status: "done", detail: t("setup_already_downloaded") });
          continue;
        }
        setStep(model.name, { status: "active", detail: "Starting download...", percent: 0 });
        const result = await window.electron.pullModel(model.name);
        if (!result.ok) throw new Error(`Failed to download ${model.name}: ${result.error}`);
        setStep(model.name, { status: "done", detail: "", percent: null });
      }

      unsubPull();
      await window.electron.markSetupComplete();
      setTimeout(onComplete, 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "error", detail: "" } : s))
      );
    } finally {
      setRunning(false);
    }
  }, [onComplete, setStep, t]);

  useEffect(() => {
    if (!ranRef.current) { ranRef.current = true; run(); }
  }, [run]);

  const allDone = steps.every((s) => s.status === "done");
  const hasError = !!errorMsg;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Brain className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f172a]">
            {allDone ? t("setup_done_title") : t("setup_title")}
          </h1>
          <p className="text-[#64748b] text-sm mt-1">
            {allDone ? t("setup_done_subtitle") : t("setup_subtitle")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f1f5f9]">
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest">{t("setup_progress")}</p>
          </div>
          <div className="divide-y divide-[#f8fafc]">
            {steps.map((step) => (
              <StepRow key={step.id} step={step} label={t(step.labelKey as Parameters<typeof t>[0])} />
            ))}
          </div>
        </div>

        {hasError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
            <div className="flex items-start gap-2 mb-3">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 leading-relaxed">{errorMsg}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={run} disabled={running}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> {t("setup_retry")}
              </button>
              <button onClick={async () => { await window.electron.markSetupComplete(); onComplete(); }}
                className="px-4 py-2 border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] rounded-lg text-sm transition-colors">
                {t("setup_skip")}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#94a3b8] mt-5 leading-relaxed">
          {t("setup_privacy")}<br />{t("setup_privacy2")}
        </p>
      </div>
    </div>
  );
}

function StepRow({ step, label }: { step: StepState; label: string }) {
  const { status, detail, percent } = step;
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {status === "done"    && <CheckCircle className="w-5 h-5 text-emerald-500" />}
          {status === "active"  && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
          {status === "error"   && <XCircle className="w-5 h-5 text-red-500" />}
          {status === "waiting" && <div className="w-4 h-4 rounded-full border-2 border-[#e2e8f0]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${status === "done" ? "text-[#0f172a]" : status === "active" ? "text-blue-700" : status === "error" ? "text-red-600" : "text-[#94a3b8]"}`}>
              {label}
            </span>
            {status === "active" && percent !== null && (
              <span className="text-xs font-mono text-blue-600 ml-2 flex-shrink-0">{percent}%</span>
            )}
            {status === "done" && detail && (
              <span className="text-xs text-[#94a3b8] ml-2 flex-shrink-0">{detail}</span>
            )}
          </div>
          {status === "active" && (
            <>
              <div className="mt-1.5 w-full h-1 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: percent !== null ? `${percent}%` : "100%",
                    background: percent !== null ? "#3b5bdb" : "transparent",
                    animation: percent === null ? "pulse 1.5s ease-in-out infinite" : "none",
                    backgroundImage: percent === null ? "repeating-linear-gradient(90deg,#3b5bdb 0%,#6693f5 50%,#3b5bdb 100%)" : "none",
                    backgroundSize: "200% 100%",
                  }} />
              </div>
              {detail && <p className="text-xs text-[#94a3b8] mt-0.5 truncate">{detail}</p>}
            </>
          )}
          {status === "done" && percent === null && !detail && (
            <div className="mt-1.5 w-full h-1 bg-emerald-100 rounded-full">
              <div className="h-full bg-emerald-400 rounded-full w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
