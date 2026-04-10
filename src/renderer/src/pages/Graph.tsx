import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { apiGet } from "@/lib/api";
import { FileTypeIcon, StatusBadge } from "@/components/FileUtils";
import { useT } from "@/i18n";

interface GraphData {
  nodes: { id: number; name: string; fileType: string; status: string; summary: string | null; tags: string[] }[];
  edges: { source: number; target: number; score: number; reason: string }[];
}

function useForceLayout(nodes: { id: number }[], edges: { source: number; target: number }[], W: number, H: number) {
  const [positions, setPositions] = useState<Map<number, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (!nodes.length) return;
    const states = nodes.map((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      const r = Math.min(W, H) * 0.33;
      return { id: n.id, x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle), vx: 0, vy: 0 };
    });
    let frame: number;
    let iter = 0;
    const tick = () => {
      iter++;
      const k = Math.sqrt((W * H) / nodes.length) * 1.2;
      for (let i = 0; i < states.length; i++) {
        states[i].vx = 0; states[i].vy = 0;
        for (let j = 0; j < states.length; j++) {
          if (i === j) continue;
          const dx = states[i].x - states[j].x, dy = states[i].y - states[j].y;
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const f = (k * k * 2) / (d * d);
          states[i].vx += (dx / d) * f; states[i].vy += (dy / d) * f;
        }
      }
      for (const e of edges) {
        const s = states.find((n) => n.id === e.source), t2 = states.find((n) => n.id === e.target);
        if (!s || !t2) continue;
        const dx = t2.x - s.x, dy = t2.y - s.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = (d - k * 2) * 0.08;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        s.vx += fx; s.vy += fy; t2.vx -= fx; t2.vy -= fy;
      }
      for (const n of states) {
        n.x = Math.max(50, Math.min(W - 50, n.x + n.vx * 0.85));
        n.y = Math.max(50, Math.min(H - 50, n.y + n.vy * 0.85));
      }
      setPositions(new Map(states.map((n) => [n.id, { x: n.x, y: n.y }])));
      if (iter < 250) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [nodes.length, edges.length, W, H]);

  return positions;
}

export function Graph() {
  const { t } = useT();
  const { data: graph, isLoading } = useQuery({ queryKey: ["graph"], queryFn: () => apiGet<GraphData>("/api/graph") });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const W = 750, H = 560;
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const positions = useForceLayout(nodes, edges, W, H);

  const connCount = new Map<number, number>();
  for (const e of edges) {
    connCount.set(e.source, (connCount.get(e.source) ?? 0) + 1);
    connCount.set(e.target, (connCount.get(e.target) ?? 0) + 1);
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest("[data-node]")) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan((p) => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { isPanning.current = false; };
  const onWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001))); }, []);

  const selectedNode = selected !== null ? nodes.find((n) => n.id === selected) : null;

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="h-6 w-48 bg-[#f1f5f9] rounded" /><div className="h-[480px] bg-[#f1f5f9] rounded-xl" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">{t("graph_title")}</h1>
          <p className="text-[#64748b] text-sm mt-0.5">{nodes.length} {t("nav_files").toLowerCase()} · {edges.length} {t("graph_connections")}</p>
        </div>
        <div className="flex items-center gap-2">
          {[{ action: () => setZoom((z) => Math.min(3, z + 0.2)), icon: ZoomIn }, { action: () => setZoom((z) => Math.max(0.3, z - 0.2)), icon: ZoomOut }, { action: () => { setZoom(1); setPan({ x: 0, y: 0 }); }, icon: RotateCcw }].map(({ action, icon: Icon }) => (
            <button key={Icon.name} onClick={action} className="p-2 rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] transition-colors text-[#475569]">
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white border border-[#e2e8f0] rounded-xl overflow-hidden" style={{ height: 480 }}>
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[#94a3b8]">
              <p className="text-sm font-medium">{t("graph_empty")}</p>
              <Link href="/files"><button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{t("graph_upload_btn")}</button></Link>
            </div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full cursor-grab active:cursor-grabbing"
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}>
              <defs>
                <radialGradient id="ng" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#6693f5" /><stop offset="100%" stopColor="#3b5bdb" />
                </radialGradient>
                <radialGradient id="ngs" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" />
                </radialGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} style={{ transformOrigin: `${W/2}px ${H/2}px` }}>
                {edges.map((e, i) => {
                  const s = positions.get(e.source), tgt = positions.get(e.target);
                  if (!s || !tgt) return null;
                  const hi = hovered === e.source || hovered === e.target || selected === e.source || selected === e.target;
                  return <line key={i} x1={s.x} y1={s.y} x2={tgt.x} y2={tgt.y} stroke={hi ? "#3b5bdb" : "#e2e8f0"} strokeWidth={hi ? 2 : 1} strokeOpacity={hi ? 0.8 : 1} />;
                })}
                {nodes.map((node) => {
                  const pos = positions.get(node.id);
                  if (!pos) return null;
                  const r = 12 + Math.min((connCount.get(node.id) ?? 0) * 2, 10);
                  const isSel = selected === node.id;
                  const isHov = hovered === node.id;
                  return (
                    <g key={node.id} data-node="true" transform={`translate(${pos.x},${pos.y})`}
                      onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)}
                      onClick={() => setSelected(isSel ? null : node.id)} style={{ cursor: "pointer" }}>
                      {(isHov || isSel) && <circle r={r + 5} fill={isSel ? "#05966920" : "#3b5bdb15"} />}
                      <circle r={r} fill={isSel ? "url(#ngs)" : "url(#ng)"} opacity={node.status === "ready" ? 1 : 0.45} filter={(isHov || isSel) ? "url(#glow)" : undefined} />
                      <text textAnchor="middle" dy={r + 13} fontSize="9" fill="#64748b" style={{ pointerEvents: "none", userSelect: "none" }}>
                        {node.name.length > 16 ? node.name.slice(0, 14) + "…" : node.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>

        <div className="space-y-3">
          {selectedNode ? (
            <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-4 py-3 border-b border-[#e2e8f0]">
                <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wide">{t("graph_selected")}</p>
                <h3 className="text-sm font-semibold text-[#0f172a] mt-0.5 break-words">{selectedNode.name}</h3>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <FileTypeIcon fileType={selectedNode.fileType} className="w-4 h-4 text-[#94a3b8]" />
                  <StatusBadge status={selectedNode.status} />
                </div>
                {selectedNode.summary && <p className="text-xs text-[#64748b] leading-relaxed">{selectedNode.summary}</p>}
                {selectedNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[#f1f5f9] text-[#64748b]">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#94a3b8]">{connCount.get(selectedNode.id) ?? 0} {t("graph_connections")}</p>
                <Link href={`/files/${selectedNode.id}`}>
                  <button className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors mt-1">{t("graph_open_file")}</button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-6 text-center">
              <p className="text-xs text-[#94a3b8]">{t("graph_click_hint")}</p>
            </div>
          )}

          <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">{t("graph_legend")}</p>
            <div className="space-y-1.5 text-xs text-[#64748b]">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 opacity-40" /><span>{t("graph_not_processed")}</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600" /><span>{t("graph_processed")}</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-600 opacity-80" /><span>{t("graph_more_connections")}</span></div>
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] text-center">{t("graph_pan_hint")}</p>
        </div>
      </div>
    </div>
  );
}
