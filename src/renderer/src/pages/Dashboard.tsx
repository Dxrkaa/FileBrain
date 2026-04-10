import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Tag, Network, HardDrive, ArrowRight, TrendingUp } from "lucide-react";
import { apiGet } from "@/lib/api";
import { FileTypeIcon, StatusBadge, formatSize } from "@/components/FileUtils";
import { useT } from "@/i18n";

interface Stats {
  totalFiles: number; processedFiles: number; totalTags: number;
  totalConnections: number; storageBytes: number; fileTypeBreakdown: Record<string, number>;
}
interface RecentFile { id: number; name: string; fileType: string; status: string; summary: string | null; tags: string[] }
interface TagStat { tag: string; count: number }
interface GraphData {
  nodes: { id: number; name: string; fileType: string; status: string }[];
  edges: { source: number; target: number }[];
}

function MiniGraph({ nodes, edges }: { nodes: GraphData["nodes"]; edges: GraphData["edges"] }) {
  const { t } = useT();
  if (nodes.length === 0) {
    return <div className="flex items-center justify-center h-full text-[#94a3b8] text-xs">{t("dash_graph_upload_hint")}</div>;
  }
  const W = 320, H = 180, pad = 28;
  const positions = nodes.map((_, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    const r = Math.min(W, H) / 2 - pad;
    return { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) };
  });
  const posMap = new Map(nodes.map((n, i) => [n.id, positions[i]]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {edges.map((e, i) => {
        const s = posMap.get(e.source), t2 = posMap.get(e.target);
        if (!s || !t2) return null;
        return <line key={i} x1={s.x} y1={s.y} x2={t2.x} y2={t2.y} stroke="#3b5bdb" strokeOpacity={0.2} strokeWidth={1.5} />;
      })}
      {nodes.map((n) => {
        const p = posMap.get(n.id);
        if (!p) return null;
        return (
          <g key={n.id}>
            <circle cx={p.x} cy={p.y} r={9} fill="#3b5bdb" opacity={0.85} />
            <text x={p.x} y={p.y + 18} textAnchor="middle" fontSize="7.5" fill="#64748b">
              {n.name.length > 14 ? n.name.slice(0, 12) + "…" : n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Dashboard() {
  const { t } = useT();
  const { data: stats, isLoading: sl } = useQuery({ queryKey: ["stats"], queryFn: () => apiGet<Stats>("/api/stats/overview") });
  const { data: recent, isLoading: rl } = useQuery({ queryKey: ["recent"], queryFn: () => apiGet<RecentFile[]>("/api/stats/recent") });
  const { data: tags, isLoading: tl } = useQuery({ queryKey: ["tags"], queryFn: () => apiGet<TagStat[]>("/api/stats/tags") });
  const { data: graph } = useQuery({ queryKey: ["graph"], queryFn: () => apiGet<GraphData>("/api/graph") });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">{t("dash_title")}</h1>
        <p className="text-[#64748b] text-sm mt-0.5">{t("dash_subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label={t("dash_stat_files")} value={sl ? "—" : String(stats?.totalFiles ?? 0)} sub={`${stats?.processedFiles ?? 0} ${t("dash_stat_processed")}`} color="#3b5bdb" />
        <StatCard icon={Tag} label={t("dash_stat_tags")} value={sl ? "—" : String(stats?.totalTags ?? 0)} sub={t("dash_stat_across")} color="#7c3aed" />
        <StatCard icon={Network} label={t("dash_stat_connections")} value={sl ? "—" : String(stats?.totalConnections ?? 0)} sub={t("dash_stat_relationships")} color="#059669" />
        <StatCard icon={HardDrive} label={t("dash_stat_storage")} value={sl ? "—" : formatSize(stats?.storageBytes ?? 0)} sub={t("dash_stat_total_size")} color="#d97706" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
            <h2 className="font-semibold text-sm text-[#0f172a]">{t("dash_recent")}</h2>
            <Link href="/files"><span className="text-xs text-blue-600 flex items-center gap-1 cursor-pointer hover:underline">{t("dash_view_all")} <ArrowRight className="w-3 h-3" /></span></Link>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {rl ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-[#f1f5f9]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[#f1f5f9] rounded w-40" />
                    <div className="h-2 bg-[#f1f5f9] rounded w-64" />
                  </div>
                </div>
              ))
            ) : recent?.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#94a3b8] text-sm">
                <Link href="/files"><span className="text-blue-600 cursor-pointer hover:underline">{t("dash_upload_prompt")}</span></Link> {t("dash_upload_prompt_suffix")}
              </div>
            ) : (
              recent?.map((f) => (
                <Link key={f.id} href={`/files/${f.id}`}>
                  <div className="px-4 py-3 flex items-center gap-3 hover:bg-[#f8fafc] transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <FileTypeIcon fileType={f.fileType} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0f172a] truncate">{f.name}</p>
                      <p className="text-xs text-[#64748b] truncate">{f.summary ?? t("dash_not_processed")}</p>
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
              <h2 className="font-semibold text-sm text-[#0f172a]">{t("dash_graph_title")}</h2>
              <Link href="/graph"><span className="text-xs text-blue-600 flex items-center gap-1 cursor-pointer hover:underline">{t("dash_graph_expand")} <ArrowRight className="w-3 h-3" /></span></Link>
            </div>
            <div className="h-[180px] p-2">
              {graph ? <MiniGraph nodes={graph.nodes} edges={graph.edges} /> : <div className="flex items-center justify-center h-full text-[#94a3b8] text-xs">{t("dash_loading")}</div>}
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <h2 className="font-semibold text-sm text-[#0f172a]">{t("dash_top_tags")}</h2>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {tl ? (
                Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-5 w-16 bg-[#f1f5f9] rounded-full animate-pulse" />)
              ) : tags?.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">{t("dash_process_tags_hint")}</p>
              ) : (
                tags?.slice(0, 15).map((tag) => (
                  <Link key={tag.tag} href={`/files?tag=${encodeURIComponent(tag.tag)}`}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#f1f5f9] text-[#475569] hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors">
                      {tag.tag}
                      <span className="text-[#94a3b8]">{tag.count}</span>
                    </span>
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

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#0f172a] tabular-nums">{value}</p>
      <p className="text-xs text-[#94a3b8] mt-0.5">{sub}</p>
    </div>
  );
}
