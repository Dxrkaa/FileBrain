import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Files, Search, Network, Brain, Cpu, Languages, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useT, Lang } from "@/i18n";
import { apiPost } from "@/lib/api";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { lang, setLang, t } = useT();
  const qc = useQueryClient();

  const [translating, setTranslating] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const prevLangRef = useRef<Lang | null>(null);

  const nav = [
    { href: "/", icon: LayoutDashboard, label: t("nav_dashboard") },
    { href: "/files", icon: Files, label: t("nav_files") },
    { href: "/search", icon: Search, label: t("nav_search") },
    { href: "/graph", icon: Network, label: t("nav_graph") },
  ];

  // Translate all processed files whenever the language changes (not on first render)
  useEffect(() => {
    if (prevLangRef.current === null) {
      prevLangRef.current = lang;
      return;
    }
    if (prevLangRef.current === lang) return;
    prevLangRef.current = lang;

    setTranslating(true);
    setJustDone(false);

    apiPost<{ ok: boolean; translated: number }>("/api/files/translate", { lang })
      .then(({ translated }) => {
        if (translated > 0) {
          // Refresh everything so the UI immediately shows translated content
          qc.invalidateQueries();
        }
        setJustDone(true);
        setTimeout(() => setJustDone(false), 3000);
      })
      .catch(() => {
        // Silent fail — Ollama may not be running yet
      })
      .finally(() => {
        setTranslating(false);
      });
  }, [lang, qc]);

  const handleLangSwitch = (l: Lang) => {
    if (l !== lang) setLang(l);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#f1f5f9] border-r border-[#e2e8f0] flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#0f172a] text-base">FileBrain</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Language switcher */}
        <div className="px-3 pb-2">
          <div className="flex rounded-lg overflow-hidden border border-[#e2e8f0] text-xs font-semibold">
            <button
              onClick={() => handleLangSwitch("en")}
              disabled={translating}
              className={`flex-1 py-1.5 transition-colors disabled:opacity-60 ${
                lang === "en"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-[#64748b] hover:bg-[#f1f5f9]"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLangSwitch("no")}
              disabled={translating}
              className={`flex-1 py-1.5 transition-colors disabled:opacity-60 ${
                lang === "no"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-[#64748b] hover:bg-[#f1f5f9]"
              }`}
            >
              NO
            </button>
          </div>

          {/* Translation status */}
          {translating && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
              <Languages className="w-3 h-3 text-blue-500 flex-shrink-0 animate-pulse" />
              <span className="text-[10px] text-blue-600 leading-none">
                {lang === "no" ? "Oversetter filer..." : "Translating files..."}
              </span>
            </div>
          )}
          {justDone && !translating && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="text-[10px] text-emerald-600 leading-none">
                {lang === "no" ? "Ferdig!" : "Done!"}
              </span>
            </div>
          )}
        </div>

        {/* Local AI badge */}
        <div className="px-3 py-3 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <Cpu className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-700 leading-none">{t("badge_local_ai")}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5 leading-none">{t("badge_on_device")}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
