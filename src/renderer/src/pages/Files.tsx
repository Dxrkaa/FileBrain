import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Upload, Trash2, Cpu, X, Filter } from "lucide-react";
import { apiGet, apiFetch, apiPost, apiDelete } from "@/lib/api";
import { FileTypeIcon, StatusBadge, formatSize, formatDate } from "@/components/FileUtils";
import { useT } from "@/i18n";

interface KnowledgeFile {
  id: number; name: string; fileType: string; mimeType: string; sizeBytes: number;
  summary: string | null; tags: string[]; keyTopics: string[]; status: string;
  uploadedAt: string; processedAt: string | null; relatedFileIds: number[];
}

function useToast() {
  return {
    success: (msg: string) => console.log("✓", msg),
    error: (msg: string) => alert("Error: " + msg),
  };
}

export function Files() {
  const { t, lang } = useT();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [tagFilter, setTagFilter] = useState(params.get("tag") ?? "");
  const [typeFilter, setTypeFilter] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const { data: files, isLoading } = useQuery({
    queryKey: ["files", tagFilter, typeFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (tagFilter) p.set("tag", tagFilter);
      if (typeFilter) p.set("type", typeFilter);
      return apiGet<KnowledgeFile[]>(`/api/files${p.size ? `?${p}` : ""}`);
    },
  });

  const handleFiles = useCallback(async (fileList: FileList) => {
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      // Electron extends the browser File API with a `.path` property that holds
      // the absolute path on the user's disk. We store it so "Open File" can
      // launch the file in the OS default app later.
      const electronPath = (file as unknown as { path?: string }).path;
      if (electronPath) fd.append("filePath", electronPath);
      try {
        const res = await apiFetch("/api/files/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(await res.text());
        qc.invalidateQueries({ queryKey: ["files"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
        qc.invalidateQueries({ queryKey: ["recent"] });
        toast.success(`${file.name} uploaded`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [qc]);

  const processFile = async (id: number) => {
    setProcessingIds((s) => new Set([...s, id]));
    try {
      await apiPost(`/api/files/${id}/process`, { lang });
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["graph"] });
      qc.invalidateQueries({ queryKey: ["search-suggestions"] });
      toast.success("Processing complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Processing failed");
    } finally {
      setProcessingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const deleteFile = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await apiDelete(`/api/files/${id}`);
      qc.invalidateQueries({ queryKey: ["files"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["recent"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["graph"] });
    } catch {
      toast.error("Delete failed");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">{t("files_title")}</h1>
          <p className="text-[#64748b] text-sm mt-0.5">{files?.length ?? 0} {t("files_subtitle_count")}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Upload className="w-4 h-4" /> {t("files_upload_btn")}
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-blue-400 bg-blue-50" : "border-[#e2e8f0] hover:border-blue-300 hover:bg-[#f8fafc]"}`}
      >
        <Upload className="w-8 h-8 text-[#94a3b8] mx-auto mb-2" />
        <p className="text-sm font-medium text-[#475569]">{t("files_drop_hint")}</p>
        <p className="text-xs text-[#94a3b8] mt-1">{t("files_drop_types")}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-[#94a3b8]" />
        <div className="relative">
          <input
            placeholder={t("files_filter_tag")}
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-8 text-sm px-3 pr-7 rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-blue-400 w-36"
          />
          {tagFilter && (
            <button onClick={() => setTagFilter("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 text-sm px-2 rounded-lg border border-[#e2e8f0] bg-white outline-none focus:border-blue-400"
        >
          <option value="">{t("files_filter_all_types")}</option>
          <option value="pdf">PDF</option>
          <option value="image">{t("filetype_image")}</option>
          <option value="text">{t("filetype_text")}</option>
          <option value="code">{t("filetype_code")}</option>
          <option value="spreadsheet">{t("filetype_spreadsheet")}</option>
          <option value="document">{t("filetype_document")}</option>
          <option value="presentation">{t("filetype_presentation")}</option>
          <option value="archive">{t("filetype_archive")}</option>
          <option value="other">{t("filetype_other")}</option>
        </select>
        {(tagFilter || typeFilter) && (
          <button onClick={() => { setTagFilter(""); setTypeFilter(""); }} className="text-xs text-blue-600 hover:underline">{t("files_filter_clear")}</button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-[#f1f5f9]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[#f1f5f9] rounded w-40" />
                <div className="h-2 bg-[#f1f5f9] rounded w-72" />
              </div>
            </div>
          ))
        ) : files?.length === 0 ? (
          <div className="text-center py-12 text-[#94a3b8] text-sm">{t("files_no_files")}</div>
        ) : (
          files?.map((file) => (
            <div key={file.id} className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow group">
              <Link href={`/files/${file.id}`}>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 cursor-pointer hover:bg-blue-100 transition-colors">
                  <FileTypeIcon fileType={file.fileType} className="w-5 h-5" />
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/files/${file.id}`}>
                    <span className="text-sm font-semibold text-[#0f172a] hover:text-blue-600 cursor-pointer transition-colors">{file.name}</span>
                  </Link>
                  <StatusBadge status={processingIds.has(file.id) ? "processing" : file.status} />
                </div>
                <p className="text-xs text-[#64748b] mt-0.5 line-clamp-2">
                  {file.summary ?? <em>{t("detail_process_to_generate")}</em>}
                </p>
                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {file.tags.slice(0, 5).map((tag) => (
                      <button key={tag} onClick={() => setTagFilter(tag)}
                        className="px-2 py-0.5 rounded-full text-xs bg-[#f1f5f9] text-[#475569] hover:bg-blue-50 hover:text-blue-700 transition-colors">
                        {tag}
                      </button>
                    ))}
                    {file.tags.length > 5 && <span className="px-2 py-0.5 rounded-full text-xs bg-[#f1f5f9] text-[#94a3b8]">+{file.tags.length - 5}</span>}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-xs text-[#94a3b8]">
                  <span>{formatSize(file.sizeBytes)}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                  {file.relatedFileIds.length > 0 && <><span>•</span><span>{file.relatedFileIds.length} {t("files_related")}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(file.status === "pending" || file.status === "error") && !processingIds.has(file.id) && (
                  <button onClick={() => processFile(file.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-medium text-[#475569] hover:border-blue-400 hover:text-blue-600 transition-colors">
                    <Cpu className="w-3.5 h-3.5" /> {t("files_process_ai")}
                  </button>
                )}
                {processingIds.has(file.id) && (
                  <span className="text-xs text-blue-600 animate-pulse px-3">{t("files_processing")}</span>
                )}
                <button
                  onClick={() => deleteFile(file.id, file.name)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#94a3b8] hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
