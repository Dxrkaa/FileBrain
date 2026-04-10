import { Router, Request, Response } from "express";
import { getSqlite } from "../db";

export const graphRouter = Router();
const LOCAL_USER_ID = 1;

graphRouter.get("/", (_req: Request, res: Response): void => {
  const db = getSqlite();

  const nodes = db
    .prepare(
      `SELECT id, name, file_type, status, summary, tags
       FROM knowledge_files WHERE user_id = ?`
    )
    .all(LOCAL_USER_ID) as {
    id: number; name: string; file_type: string; status: string;
    summary: string | null; tags: string;
  }[];

  const edges = db
    .prepare(
      `SELECT DISTINCT
         CASE WHEN fr.source_file_id < fr.target_file_id THEN fr.source_file_id ELSE fr.target_file_id END as source,
         CASE WHEN fr.source_file_id < fr.target_file_id THEN fr.target_file_id ELSE fr.source_file_id END as target,
         fr.score, fr.reason
       FROM file_relations fr
       JOIN knowledge_files kf ON kf.id = fr.source_file_id
       WHERE kf.user_id = ?
       GROUP BY source, target`
    )
    .all(LOCAL_USER_ID) as { source: number; target: number; score: number; reason: string }[];

  res.json({
    nodes: nodes.map((n) => ({
      id: n.id, name: n.name, fileType: n.file_type, status: n.status,
      summary: n.summary, tags: JSON.parse(n.tags || "[]"),
    })),
    edges,
  });
});
