import { Router, Request, Response } from "express";
import { getSqlite } from "../db";
import { semanticSearch, checkOllama, generateSearchSuggestions } from "../ollama";

export const searchRouter = Router();
const LOCAL_USER_ID = 1;

// Returns AI-generated short search prompts based on the user's processed files.
// Must be before the "/:q?" catch-all to avoid route conflicts.
searchRouter.get("/suggestions", async (req: Request, res: Response): Promise<void> => {
  const lang = typeof req.query.lang === "string" ? req.query.lang : "en";
  const db = getSqlite();

  const files = db
    .prepare(
      `SELECT tags, key_topics FROM knowledge_files
       WHERE user_id = ? AND status = 'ready'`
    )
    .all(LOCAL_USER_ID) as { tags: string; key_topics: string }[];

  if (files.length === 0) { res.json([]); return; }

  const ollamaStatus = await checkOllama();
  if (!ollamaStatus.available || !ollamaStatus.textModel) { res.json([]); return; }

  const allTags: string[] = [];
  const allTopics: string[] = [];
  for (const f of files) {
    allTags.push(...(JSON.parse(f.tags || "[]") as string[]));
    allTopics.push(...(JSON.parse(f.key_topics || "[]") as string[]));
  }

  const suggestions = await generateSearchSuggestions(allTags, allTopics, lang);
  res.json(suggestions);
});

searchRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const { q, limit } = req.query as Record<string, string>;
  if (!q?.trim()) { res.json([]); return; }

  const db = getSqlite();
  const files = db
    .prepare(
      `SELECT id, name, file_type, mime_type, size_bytes, summary, tags, key_topics, status, uploaded_at, content
       FROM knowledge_files WHERE user_id = ? AND status = 'ready'
       ORDER BY uploaded_at DESC LIMIT 50`
    )
    .all(LOCAL_USER_ID) as {
    id: number; name: string; file_type: string; mime_type: string; size_bytes: number;
    summary: string | null; tags: string; key_topics: string; status: string;
    uploaded_at: string; content: string | null;
  }[];

  if (files.length === 0) { res.json([]); return; }

  const ollamaStatus = await checkOllama();
  let results: { id: number; relevance: number; matchReason: string; highlights: string[] }[];

  if (ollamaStatus.available && ollamaStatus.textModel) {
    results = await semanticSearch(
      q.trim(),
      files.map((f) => ({
        id: f.id, name: f.name, summary: f.summary ?? "",
        tags: JSON.parse(f.tags || "[]"), content: f.content,
      }))
    );
  } else {
    const qLower = q.toLowerCase();
    results = files
      .map((f) => {
        const tags: string[] = JSON.parse(f.tags || "[]");
        const score =
          (f.name.toLowerCase().includes(qLower) ? 0.5 : 0) +
          (f.summary?.toLowerCase().includes(qLower) ? 0.4 : 0) +
          (tags.some((t) => t.includes(qLower)) ? 0.3 : 0) +
          (f.content?.toLowerCase().includes(qLower) ? 0.2 : 0);
        return {
          id: f.id, relevance: Math.min(1, score),
          matchReason: score > 0 ? "Keyword match in filename, summary, or tags" : "",
          highlights: [],
        };
      })
      .filter((r) => r.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);
  }

  const maxResults = Math.min(parseInt(limit ?? "15", 10), 50);
  const fileMap = new Map(
    files.map((f) => [
      f.id,
      {
        id: f.id, name: f.name, fileType: f.file_type, mimeType: f.mime_type,
        sizeBytes: f.size_bytes, summary: f.summary,
        tags: JSON.parse(f.tags || "[]"), keyTopics: JSON.parse(f.key_topics || "[]"),
        status: f.status, uploadedAt: f.uploaded_at,
      },
    ])
  );

  res.json(
    results.slice(0, maxResults).map((r) => ({
      file: fileMap.get(r.id), relevance: r.relevance,
      matchReason: r.matchReason, highlights: r.highlights,
    }))
  );
});
