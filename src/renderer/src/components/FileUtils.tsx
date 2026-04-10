import { FileText, Image, Code, FileSpreadsheet, Archive, File } from "lucide-react";
import { useT } from "@/i18n";

export function FileTypeIcon({ fileType, className }: { fileType: string; className?: string }) {
  switch (fileType) {
    case "pdf": case "document": case "presentation": case "text":
      return <FileText className={className} />;
    case "image":       return <Image className={className} />;
    case "code":        return <Code className={className} />;
    case "spreadsheet": return <FileSpreadsheet className={className} />;
    case "archive":     return <Archive className={className} />;
    default:            return <File className={className} />;
  }
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT();

  const map: Record<string, { bg: string; text: string; key: "status_ready" | "status_processing" | "status_error" | "status_pending" }> = {
    ready:      { bg: "#dcfce7", text: "#16a34a", key: "status_ready" },
    processing: { bg: "#dbeafe", text: "#2563eb", key: "status_processing" },
    error:      { bg: "#fee2e2", text: "#dc2626", key: "status_error" },
    pending:    { bg: "#f1f5f9", text: "#64748b", key: "status_pending" },
  };
  const s = map[status] ?? map.pending;

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.text }}>
      {t(s.key)}
    </span>
  );
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}
