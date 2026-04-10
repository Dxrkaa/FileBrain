import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Cpu, Trash2, Network, FolderOpen } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { FileTypeIcon, StatusBadge, formatSize, formatDate } from "@/components/FileUtils";
import { useT } from "@/i18n";

interface KnowledgeFile {
  id: number; name: string; fileType: string; mimeType: string; sizeBytes: number;
  content: string | null; summary: string | null; tags: string[]; keyTopics: string[];
  status: string; uploadedAt: string; processedAt: string | null; relatedFileIds: number[];
  filePath: string | null;
}
interface RelatedFile { score: number; reason: string; file: KnowledgeFile }

export function FileDetail() {
  const { t, lang } = useT();
  const { id } = useParams<{ id: string }>();
  const fileId = parseInt(id ?? "0", 10);
  const qc = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [openError, setOpenError] = useState("");

  const { data: file, isLoading } = useQuery({
    queryKey: ["file", fileId],
    queryFn: () => apiGet<KnowledgeFile>(`/api/files/${fileId}`),
    enabled: !!fileId,
  });

  const { data: related } = useQuery({
    queryKey: ["related", fileId],
    queryFn: () => apiGet<RelatedFile[]>(`/api/files/${fileId}/related`),
    enabled: !!fileId && file?.status === "ready",
  });

  const process = async () => {
    setProcessing(true);
    setError("");
    try {
      await apiPost(`/api/files/${fileId}/process`, { lang });
      qc.invalidateQueries({ queryKey: ["file", fileId] });
      qc.invalidateQueries({ queryKey: ["related", fileId] });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["graph"] });
      qc.invalidateQueries({ queryKey: ["search-suggestions"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const deleteFile = async () => {
    if (!file || !confirm(`Delete "${file.name}"?`)) return;
    await apiDelete(`/api/files/${fileId}`);
    qc.invalidateQueries({ queryKey: ["files"] });
    window.history.back();
  };

  const openFile = async () => {
    if (!file?.filePath) return;
    setOpenError("");
    const result = await (window as unknown as { electron: { openFile: (p: string) => Promise<{ ok: boolean; error?: string }> } }).electron.openFile(file.filePath);
    if (!result.ok) setOpenError(result.error ?? t("detail_open_file_error"));
  };

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-24 bg-[#f1f5f9] rounded" />
      <div className="h-8 w-64 bg-[#f1f5f9] rounded" />
      <div className="h-32 bg-[#f1f5f9] rounded-xl" />
    </div>
  );

  if (!file) return (
    <div className="text-center py-16 text-[#94a3b8]">
      <p className="text-sm">{t("detail_not_found")}</p>
      <Link href="/files"><button className="mt-4 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm">{t("detail_back_to_files")}</button></Link>
    </div>
  );

  const effectiveStatus = processing ? "processing" : file.status;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/files">
            <button className="mt-1 p-1.5 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#475569] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#0f172a]">{file.name}</h1>
              <StatusBadge status={effectiveStatus} />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#94a3b8] mt-0.5">
              <span className="capitalize">{file.fileType}</span>
              <span>•</span><span>{formatSize(file.sizeBytes)}</span>
              <span>•</span><span>{formatDate(file.uploadedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {file.filePath && (
            <button
              onClick={openFile}
              title={file.filePath}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e2e8f0] hover:border-blue-300 hover:bg-blue-50 text-[#475569] hover:text-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <FolderOpen className="w-4 h-4" /> {t("detail_open_file")}
            </button>
          )}
          {(file.status === "pending" || file.status === "error") && !processing && (
            <button onClick={process} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Cpu className="w-4 h-4" /> {t("detail_process_ai")}
            </button>
          )}
          {processing && <span className="text-sm text-blue-600 animate-pulse px-2">{t("detail_processing")}</span>}
          <button onClick={deleteFile} className="p-2 rounded-lg text-[#94a3b8] hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      {openError && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">{openError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Section title={t("detail_ai_summary")}>
            {file.summary ? (
              <p className="text-sm text-[#475569] leading-relaxed">{file.summary}</p>
            ) : (
              <p className="text-sm text-[#94a3b8] italic">
                {file.status === "pending"
                  ? <>{t("detail_no_summary")} <button className="text-blue-600 hover:underline" onClick={process}>{t("detail_process_to_generate")}</button></>
                  : t("detail_still_processing")}
              </p>
            )}
          </Section>

          {file.tags.length > 0 && (
            <Section title={t("detail_tags")}>
              <div className="flex flex-wrap gap-1.5">
                {file.tags.map((tag) => (
                  <Link key={tag} href={`/files?tag=${encodeURIComponent(tag)}`}>
                    <span className="px-2.5 py-1 rounded-full text-xs bg-[#f1f5f9] text-[#475569] hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors">{tag}</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {file.keyTopics.length > 0 && (
            <Section title={t("detail_key_topics")}>
              <div className="flex flex-wrap gap-1.5">
                {file.keyTopics.map((topic) => (
                  <span key={topic} className="px-2.5 py-1 rounded-full text-sm border border-[#e2e8f0] text-[#475569]">{topic}</span>
                ))}
              </div>
            </Section>
          )}

          {file.content && (
            <Section title={t("detail_extracted")}>
              <div className="max-h-60 overflow-y-auto rounded-lg bg-[#f8fafc] p-3 font-mono text-xs text-[#64748b] whitespace-pre-wrap break-words border border-[#e2e8f0]">
                {file.content}
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section title={t("detail_file_info")}>
            <div className="space-y-2">
              {[
                [t("detail_type"), file.fileType],
                [t("detail_mime"), file.mimeType],
                [t("detail_size"), formatSize(file.sizeBytes)],
                [t("detail_status"), file.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-[#94a3b8]">{k}</span>
                  <span className="text-[#475569] font-mono text-xs capitalize">{v}</span>
                </div>
              ))}
            </div>
          </Section>

          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e2e8f0]">
              <Network className="w-3.5 h-3.5 text-blue-600" />
              <h3 className="text-sm font-semibold text-[#0f172a]">{t("detail_related_files")}</h3>
              {related && related.length > 0 && <span className="ml-auto text-xs text-[#94a3b8]">{related.length}</span>}
            </div>
            <div className="divide-y divide-[#f8fafc]">
              {!related || related.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-[#94a3b8]">
                  {file.status === "ready" ? t("detail_no_related_ready") : t("detail_no_related_pending")}
                </div>
              ) : (
                related.map((r) => (
                  <Link key={r.file.id} href={`/files/${r.file.id}`}>
                    <div className="px-4 py-3 hover:bg-[#f8fafc] transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <FileTypeIcon fileType={r.file.fileType} className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0" />
                        <span className="text-xs font-medium text-[#0f172a] truncate">{r.file.name}</span>
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-0.5 ml-5">{r.reason}</p>
                      <div className="flex items-center gap-1.5 mt-1 ml-5">
                        <div className="flex-1 h-1 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(r.score * 100)}%` }} />
                        </div>
                        <span className="text-xs text-[#94a3b8]">{Math.round(r.score * 100)}%</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#0f172a] mb-3">{title}</h3>
      {children}
    </div>
  );
}
