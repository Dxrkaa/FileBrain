import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/api";
import { FileTypeIcon, StatusBadge, formatDate } from "@/components/FileUtils";
import { useT } from "@/i18n";

interface SearchResult {
  file: { id: number; name: string; fileType: string; summary: string | null; tags: string[]; status: string; uploadedAt: string };
  relevance: number; matchReason: string; highlights: string[];
}

function useDebounce<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export function Search() {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");
  const dq = useDebounce(query, 400);
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", dq],
    queryFn: () => apiGet<SearchResult[]>(`/api/search?q=${encodeURIComponent(dq)}&limit=20`),
    enabled: !!dq.trim(),
  });

  // AI-generated suggestions based on actual processed files.
  // staleTime of 5 min so we don't regenerate on every page visit,
  // but we invalidate this key after processing a new file.
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["search-suggestions", lang],
    queryFn: () => apiGet<string[]>(`/api/search/suggestions?lang=${lang}`),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loading = (isLoading || isFetching) && !!dq.trim();
  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">{t("search_title")}</h1>
        <p className="text-[#64748b] text-sm mt-0.5">{t("search_subtitle")}</p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#e2e8f0] bg-white text-sm text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-blue-400 transition-all"
          autoFocus
        />
        {loading && <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-pulse" />}
      </div>

      {!dq.trim() && (
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">{t("search_try")}</p>

          {suggestionsLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded-full bg-[#f1f5f9] animate-pulse" style={{ width: `${70 + i * 20}px` }} />
              ))}
            </div>
          ) : hasSuggestions ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-3 py-1.5 text-sm rounded-full bg-[#f1f5f9] text-[#475569] hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {["climate change data", "python scripts", "financial analysis", "charts and graphs"].map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-3 py-1.5 text-sm rounded-full bg-[#f1f5f9] text-[#475569] hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-[#94a3b8] mt-4 leading-relaxed">{t("search_powered")}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-[#f1f5f9] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#f1f5f9] rounded w-40" />
                  <div className="h-2 bg-[#f1f5f9] rounded w-72" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && dq.trim() && data !== undefined && (
        <>
          <p className="text-sm text-[#64748b]">
            {data.length === 0
              ? `${t("search_no_results")} "${dq}"`
              : `${data.length} ${data.length !== 1 ? t("search_results_plural") : t("search_results")} ${t("search_for")} "${dq}"`}
          </p>
          <div className="space-y-3">
            {data.map((r) => (
              <Link key={r.file.id} href={`/files/${r.file.id}`}>
                <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <FileTypeIcon fileType={r.file.fileType} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-[#0f172a] group-hover:text-blue-600 transition-colors">{r.file.name}</h3>
                        <StatusBadge status={r.file.status} />
                        <div className="flex items-center gap-1 ml-auto">
                          <div className="w-16 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(r.relevance * 100)}%` }} />
                          </div>
                          <span className="text-xs font-mono text-[#94a3b8]">{Math.round(r.relevance * 100)}%</span>
                        </div>
                      </div>
                      {r.matchReason && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 flex-shrink-0" /> {r.matchReason}
                        </p>
                      )}
                      {r.highlights.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {r.highlights.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-xs text-[#64748b] bg-[#f8fafc] rounded px-2 py-1 italic">"{h}"</p>
                          ))}
                        </div>
                      )}
                      {r.file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.file.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[#f1f5f9] text-[#64748b]">{tag}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-[#94a3b8] mt-1">{formatDate(r.file.uploadedAt)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
