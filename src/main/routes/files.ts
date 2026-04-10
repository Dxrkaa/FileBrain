import { Router, Request, Response } from "express";
import multer from "multer";
import { getSqlite } from "../db";
import { analyzeFile, findRelatedFiles, generateEmbedding, checkOllama, translateFileContent } from "../ollama";

export const filesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const LOCAL_USER_ID = 1;
const TEXT_MODEL = "llama3.2";

function detectFileType(mimeType: string, name: string): string {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("spreadsheet") || name.match(/\.(xlsx?|csv|ods)$/i)) return "spreadsheet";
  if (mimeType.includes("presentation") || name.match(/\.(pptx?|odp|key)$/i)) return "presentation";
  if (mimeType.includes("word") || name.match(/\.(docx?|odt|rtf)$/i)) return "document";
  if (mimeType.startsWith("text/") || name.match(/\.(txt|md|rst|log)$/i)) return "text";
  if (name.match(/\.(js|ts|jsx|tsx|py|rb|go|rs|java|cs|c|cpp|h|php|swift|kt|sh|sql|json|yaml|yml|toml|xml|html|css)$/i)) return "code";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gzip") || name.match(/\.(zip|tar|gz|rar|7z)$/i)) return "archive";
  return "other";
}

filesRouter.post("/upload", upload.single("file"), (req: Request, res: Response): void => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: "No file provided" }); return; }

  const db = getSqlite();
  const name = (req.body.name as string | undefined) ?? file.originalname;
  const fileType = detectFileType(file.mimetype, name);

  let content: string | null = null;
  if (
    file.mimetype.startsWith("text/") ||
    name.match(/\.(txt|md|rst|log|csv|json|yaml|yml|toml|xml|html|css|js|ts|jsx|tsx|py|rb|go|rs|java|cs|c|cpp|h|php|sh|sql)$/i)
  ) {
    try { content = file.buffer.toString("utf-8").slice(0, 100000); } catch { content = null; }
  }

  // Electron extends the File API with .path on the renderer side.
  // The renderer sends this so we can open the original file later.
  const filePath = typeof req.body.filePath === "string" && req.body.filePath.trim()
    ? req.body.filePath.trim()
    : null;

  const result = db
    .prepare(
      `INSERT INTO knowledge_files (user_id, name, file_type, mime_type, size_bytes, content, file_path, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending') RETURNING id`
    )
    .get(LOCAL_USER_ID, name, fileType, file.mimetype, file.size, content, filePath) as { id: number };

  const row = db
    .prepare("SELECT * FROM knowledge_files WHERE id = ?")
    .get(result.id) as Record<string, unknown>;

  res.json(formatFile(row));
});

filesRouter.get("/", (req: Request, res: Response): void => {
  const db = getSqlite();
  const { tag, type } = req.query as Record<string, string>;

  let query = "SELECT * FROM knowledge_files WHERE user_id = ?";
  const params: unknown[] = [LOCAL_USER_ID];

  if (type) { query += " AND file_type = ?"; params.push(type); }
  query += " ORDER BY uploaded_at DESC";

  let rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  if (tag) {
    rows = rows.filter((row) => {
      const tags = JSON.parse((row.tags as string) || "[]") as string[];
      return tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()));
    });
  }

  res.json(rows.map(formatFile));
});

filesRouter.get("/:id", (req: Request, res: Response): void => {
  const db = getSqlite();
  const row = db
    .prepare("SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?")
    .get(req.params.id, LOCAL_USER_ID) as Record<string, unknown> | undefined;

  if (!row) { res.status(404).json({ error: "File not found" }); return; }
  res.json(formatFile(row));
});

filesRouter.delete("/:id", (req: Request, res: Response): void => {
  const db = getSqlite();
  const result = db
    .prepare("DELETE FROM knowledge_files WHERE id = ? AND user_id = ?")
    .run(req.params.id, LOCAL_USER_ID);

  if (result.changes === 0) { res.status(404).json({ error: "File not found" }); return; }
  res.json({ ok: true });
});

// Batch-translate all processed files into the given language.
// Must be defined before /:id routes so "translate" isn't treated as a file ID.
//
// Translation always reads from the *original* AI-generated values stored at
// first-processing time (original_summary / original_tags / original_key_topics).
// This prevents the "drift" problem where EN→NO→EN produces different tags each
// time because each round was translating from the last translated version.
//
// If the user switches back to the language the file was originally processed
// in, the originals are restored directly — no AI call needed, no variation.
filesRouter.post("/translate", async (req: Request, res: Response): Promise<void> => {
  const lang: string = typeof req.body?.lang === "string" ? req.body.lang : "en";
  const db = getSqlite();

  const ollamaStatus = await checkOllama();
  if (!ollamaStatus.available) {
    res.status(503).json({ error: "Ollama is not running" });
    return;
  }

  const files = db
    .prepare(
      `SELECT id, summary, tags, key_topics,
              original_summary, original_tags, original_key_topics, original_lang
       FROM knowledge_files
       WHERE user_id = ? AND status = 'ready' AND summary IS NOT NULL AND summary != ''`
    )
    .all(LOCAL_USER_ID) as {
      id: number;
      summary: string; tags: string; key_topics: string;
      original_summary: string | null; original_tags: string | null;
      original_key_topics: string | null; original_lang: string | null;
    }[];

  let translated = 0;
  for (const file of files) {
    try {
      // Use originals as the translation source.  Fall back to current values
      // for files processed before this feature was added (original_* will be null).
      const srcSummary   = file.original_summary   ?? file.summary;
      const srcTagsRaw   = file.original_tags      ?? file.tags;
      const srcTopicsRaw = file.original_key_topics ?? file.key_topics;
      const originalLang = file.original_lang      ?? "en";

      const srcTags    = JSON.parse(srcTagsRaw    || "[]") as string[];
      const srcTopics  = JSON.parse(srcTopicsRaw  || "[]") as string[];

      if (originalLang === lang) {
        // Switching back to the language the file was originally analysed in —
        // just restore the originals, no AI needed.
        db.prepare(
          `UPDATE knowledge_files SET summary = ?, tags = ?, key_topics = ? WHERE id = ?`
        ).run(srcSummary, srcTagsRaw, srcTopicsRaw, file.id);
      } else {
        // Translate FROM the original source, never from the current state.
        const result = await translateFileContent(srcSummary, srcTags, srcTopics, lang);
        db.prepare(
          `UPDATE knowledge_files SET summary = ?, tags = ?, key_topics = ? WHERE id = ?`
        ).run(result.summary, JSON.stringify(result.tags), JSON.stringify(result.keyTopics), file.id);
      }
      translated++;
    } catch {
      // Skip this file on error, continue with others
    }
  }

  res.json({ ok: true, translated });
});

filesRouter.post("/:id/process", async (req: Request, res: Response): Promise<void> => {
  const db = getSqlite();
  const row = db
    .prepare("SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?")
    .get(req.params.id, LOCAL_USER_ID) as Record<string, unknown> | undefined;

  if (!row) { res.status(404).json({ error: "File not found" }); return; }

  const ollamaStatus = await checkOllama();
  if (!ollamaStatus.available) {
    res.status(503).json({ error: "Ollama is not running. Please restart the app." });
    return;
  }
  if (!ollamaStatus.textModel) {
    res.status(503).json({ error: `Model '${TEXT_MODEL}' not found. Run: ollama pull llama3.2` });
    return;
  }

  db.prepare("UPDATE knowledge_files SET status = 'processing' WHERE id = ?").run(row.id);

  // Read language preference sent by the UI ("en" or "no")
  const lang: string = typeof req.body?.lang === "string" ? req.body.lang : "en";

  // Pull all other ready files: we need name, content, and tags for similarity detection.
  const processedFiles = db
    .prepare(`SELECT id, name, tags, content FROM knowledge_files WHERE user_id = ? AND id != ? AND status = 'ready'`)
    .all(LOCAL_USER_ID, row.id) as { id: number; name: string; tags: string; content: string | null }[];

  // --- Similar-file tag reuse ---
  // Tokenise the target filename (strip extension, split on separators).
  const targetName    = row.name as string;
  const targetContent = (row.content as string | null) ?? "";

  const nameTokens = new Set(
    targetName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .split(/[\s_\-\.]+/)
      .filter((w) => w.length > 3)
  );
  const contentTokens = new Set(
    targetContent.toLowerCase().split(/\W+/).filter((w) => w.length > 4).slice(0, 150)
  );

  // A file is "similar" if it shares ≥2 name tokens OR ≥5 content tokens.
  const similarFileTags: string[] = [...new Set(
    processedFiles
      .filter((f) => {
        const fNameTok = new Set(
          f.name.replace(/\.[^.]+$/, "").toLowerCase().split(/[\s_\-\.]+/).filter((w) => w.length > 3)
        );
        const fContentTok = new Set(
          (f.content ?? "").toLowerCase().split(/\W+/).filter((w) => w.length > 4).slice(0, 150)
        );
        const nameOverlap    = [...nameTokens].filter((w) => fNameTok.has(w)).length;
        const contentOverlap = [...contentTokens].filter((w) => fContentTok.has(w)).length;
        return nameOverlap >= 2 || contentOverlap >= 5;
      })
      .flatMap((f) => JSON.parse(f.tags || "[]") as string[])
  )];

  // --- General tag pool (softer hint, only used when no similar files found) ---
  const tagFreq = new Map<string, number>();
  for (const pf of processedFiles) {
    for (const tag of JSON.parse(pf.tags || "[]") as string[]) {
      const key = tag.toLowerCase().trim();
      if (key) tagFreq.set(key, (tagFreq.get(key) ?? 0) + 1);
    }
  }
  const existingTagPool = [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);

  try {
    const content = targetContent || targetName;
    const analysis = await analyzeFile(content, targetName, { lang, similarFileTags, existingTagPool });

    let embedding: number[] | null = null;
    if (ollamaStatus.embedModel) {
      try {
        const textToEmbed = `${row.name} ${analysis.summary} ${analysis.tags.join(" ")}`;
        embedding = await generateEmbedding(textToEmbed);
      } catch { embedding = null; }
    }

    const tagsJson    = JSON.stringify(analysis.tags);
    const topicsJson  = JSON.stringify(analysis.keyTopics);

    db.prepare(
      `UPDATE knowledge_files
       SET summary = ?, tags = ?, key_topics = ?, embedding = ?, status = 'ready', processed_at = datetime('now')
       WHERE id = ?`
    ).run(analysis.summary, tagsJson, topicsJson, embedding ? JSON.stringify(embedding) : null, row.id);

    // Persist originals so language switching always translates from the same
    // source and switching back is a lossless restore with no AI call.
    // Only written once — if originals already exist we leave them untouched.
    db.prepare(
      `UPDATE knowledge_files
       SET original_summary = ?, original_tags = ?, original_key_topics = ?, original_lang = ?
       WHERE id = ? AND original_summary IS NULL`
    ).run(analysis.summary, tagsJson, topicsJson, lang, row.id);

    const otherFiles = db
      .prepare(
        `SELECT id, name, summary, tags FROM knowledge_files
         WHERE user_id = ? AND id != ? AND status = 'ready'`
      )
      .all(LOCAL_USER_ID, row.id) as { id: number; name: string; summary: string; tags: string }[];

    const candidates = otherFiles.map((f) => ({
      id: f.id, name: f.name, summary: f.summary ?? "",
      tags: JSON.parse(f.tags || "[]") as string[],
    }));

    if (candidates.length > 0) {
      const relations = await findRelatedFiles(content, row.name as string, candidates);
      const insertRelation = db.prepare(
        `INSERT OR REPLACE INTO file_relations (source_file_id, target_file_id, reason, score) VALUES (?, ?, ?, ?)`
      );
      for (const rel of relations) {
        insertRelation.run(row.id, rel.id, rel.reason, rel.score);
        insertRelation.run(rel.id, row.id, rel.reason, rel.score);
      }
    }

    const updated = db
      .prepare("SELECT * FROM knowledge_files WHERE id = ?")
      .get(row.id) as Record<string, unknown>;
    res.json(formatFile(updated));
  } catch (err) {
    db.prepare("UPDATE knowledge_files SET status = 'error' WHERE id = ?").run(row.id);
    res.status(500).json({ error: String(err) });
  }
});

filesRouter.get("/:id/related", (req: Request, res: Response): void => {
  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT fr.reason, fr.score, kf.*
       FROM file_relations fr
       JOIN knowledge_files kf ON kf.id = fr.target_file_id
       WHERE fr.source_file_id = ? AND kf.user_id = ?
       ORDER BY fr.score DESC`
    )
    .all(req.params.id, LOCAL_USER_ID) as Record<string, unknown>[];

  res.json(rows.map((r) => ({ score: r.score, reason: r.reason, file: formatFile(r) })));
});

function formatFile(row: Record<string, unknown>) {
  const relIds = (getSqlite()
    .prepare("SELECT target_file_id FROM file_relations WHERE source_file_id = ?")
    .all(row.id) as { target_file_id: number }[]).map((r) => r.target_file_id);

  return {
    id: row.id, name: row.name, fileType: row.file_type, mimeType: row.mime_type,
    sizeBytes: row.size_bytes, content: row.content, summary: row.summary,
    tags: JSON.parse((row.tags as string) || "[]"),
    keyTopics: JSON.parse((row.key_topics as string) || "[]"),
    status: row.status, uploadedAt: row.uploaded_at, processedAt: row.processed_at,
    relatedFileIds: relIds,
    filePath: row.file_path ?? null,
  };
}
