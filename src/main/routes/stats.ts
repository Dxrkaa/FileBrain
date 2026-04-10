import { Router, Request, Response } from "express";
import { getSqlite } from "../db";

export const statsRouter = Router();
const LOCAL_USER_ID = 1;

statsRouter.get("/overview", (_req: Request, res: Response): void => {
  const db = getSqlite();

  const files = db
    .prepare("SELECT id, size_bytes, status, file_type, tags FROM knowledge_files WHERE user_id = ?")
    .all(LOCAL_USER_ID) as { id: number; size_bytes: number; status: string; file_type: string; tags: string }[];

  const totalFiles = files.length;
  const processedFiles = files.filter((f) => f.status === "ready").length;
  const storageBytes = files.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0);

  const allTags = new Set<string>();
  for (const f of files) {
    const tags = JSON.parse(f.tags || "[]") as string[];
    for (const t of tags) allTags.add(t);
  }

  const connections = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM file_relations fr
       JOIN knowledge_files kf ON kf.id = fr.source_file_id
       WHERE kf.user_id = ?`
    )
    .get(LOCAL_USER_ID) as { cnt: number };

  const fileTypeBreakdown: Record<string, number> = {};
  for (const f of files) {
    fileTypeBreakdown[f.file_type] = (fileTypeBreakdown[f.file_type] ?? 0) + 1;
  }

  res.json({
    totalFiles, processedFiles, totalTags: allTags.size,
    totalConnections: Math.floor(connections.cnt / 2),
    storageBytes, fileTypeBreakdown,
  });
});

statsRouter.get("/recent", (_req: Request, res: Response): void => {
  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT id, name, file_type, status, summary, tags, uploaded_at
       FROM knowledge_files WHERE user_id = ?
       ORDER BY uploaded_at DESC LIMIT 10`
    )
    .all(LOCAL_USER_ID) as Record<string, unknown>[];

  res.json(
    rows.map((r) => ({
      id: r.id, name: r.name, fileType: r.file_type, status: r.status,
      summary: r.summary, tags: JSON.parse((r.tags as string) || "[]"),
      uploadedAt: r.uploaded_at,
    }))
  );
});

statsRouter.get("/tags", (_req: Request, res: Response): void => {
  const db = getSqlite();
  const rows = db
    .prepare("SELECT tags FROM knowledge_files WHERE user_id = ? AND status = 'ready'")
    .all(LOCAL_USER_ID) as { tags: string }[];

  const tagCounts = new Map<string, number>();
  for (const row of rows) {
    const tags = JSON.parse(row.tags || "[]") as string[];
    for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const sorted = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([tag, count]) => ({ tag, count }));

  res.json(sorted);
});
