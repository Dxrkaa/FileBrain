const OLLAMA_BASE = "http://localhost:11434";
const TEXT_MODEL = "llama3.2";
const EMBED_MODEL = "nomic-embed-text";

export interface OllamaStatus {
  available: boolean;
  textModel: boolean;
  embedModel: boolean;
}

export async function checkOllama(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { available: false, textModel: false, embedModel: false };
    const data = await res.json();
    const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name.split(":")[0]);
    return {
      available: true,
      textModel: models.includes(TEXT_MODEL),
      embedModel: models.includes(EMBED_MODEL),
    };
  } catch {
    return { available: false, textModel: false, embedModel: false };
  }
}

export async function generateText(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: TEXT_MODEL, prompt, stream: false }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Ollama generate failed: ${res.status}`);
  const data = await res.json();
  return data.response as string;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text.slice(0, 4000) }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Ollama embeddings failed: ${res.status}`);
  const data = await res.json();
  return data.embedding as number[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface AnalyzeOptions {
  /** UI language — "no" requests Norwegian output, anything else gives English */
  lang?: string;
  /** Tags from files with similar names/content — reuse as many as possible */
  similarFileTags?: string[];
  /** Global tag pool ordered by frequency — prefer these when they fit */
  existingTagPool?: string[];
}

export async function analyzeFile(
  content: string,
  filename: string,
  options: AnalyzeOptions = {}
): Promise<{ summary: string; tags: string[]; keyTopics: string[] }> {
  const { lang = "en", similarFileTags = [], existingTagPool = [] } = options;
  const isNorwegian = lang === "no";
  const langInstruction = isNorwegian
    ? `IMPORTANT: Write the summary and ALL tags and key topics in Norwegian (Bokmål).`
    : `Write in English.`;

  // Similar-file tags get the strongest emphasis — these come from files the
  // user has already categorised and that share name/content with this file.
  const similarHint =
    similarFileTags.length > 0
      ? `CRITICAL — REUSE THESE TAGS: The following tags already exist on files with very similar names and content. You MUST reuse as many of them as possible (aim for 3-4 out of 4). Only replace one if it is genuinely irrelevant to this file's content:
${similarFileTags.join(", ")}`
      : "";

  // General pool is a softer fallback when no similar files exist
  const poolHint =
    similarFileTags.length === 0 && existingTagPool.length > 0
      ? `General tag pool (prefer these when they fit, to keep tags consistent): ${existingTagPool.join(", ")}.`
      : "";

  const tagRule =
    similarFileTags.length > 0
      ? `Tags: exactly 4 lowercase tags. You MUST reuse the tags listed in the CRITICAL block above wherever they apply. Only invent a new tag if every similar-file tag is completely irrelevant.`
      : existingTagPool.length > 0
      ? `Tags: exactly 4 lowercase tags. Prefer tags from the general pool above when they fit; invent new ones only when needed.`
      : `Tags: exactly 4 lowercase tags (single words or short hyphenated phrases). Choose the most relevant tags.`;

  const prompt = `You are analyzing a file called "${filename}".

Content (first 3000 chars):
${content.slice(0, 3000)}

${similarHint}
${poolHint}

Respond in valid JSON only, no markdown, no explanation. Format:
{
  "summary": "2-3 sentence summary of what this file is about",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"]
}

Rules:
- ${tagRule}
- Key topics: 2-4 title-case topic names
- Summary: concise and informative, 2-3 sentences
- ${langInstruction}`;

  const raw = await generateText(prompt);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    const parsed = JSON.parse(match[0]);
    return {
      summary: String(parsed.summary ?? "").trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 4) : [],
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics.map(String).slice(0, 4) : [],
    };
  } catch {
    return { summary: raw.slice(0, 300), tags: [], keyTopics: [] };
  }
}

export async function generateSearchSuggestions(
  tags: string[],
  topics: string[],
  lang: string
): Promise<string[]> {
  if (tags.length === 0 && topics.length === 0) return [];

  const langName = lang === "no" ? "Norwegian (Bokmål)" : "English";
  const tagList = [...new Set(tags)].slice(0, 30).join(", ");
  const topicList = [...new Set(topics)].slice(0, 20).join(", ");

  const prompt = `A personal knowledge base contains files with these topics and tags:
Topics: ${topicList || "(none)"}
Tags: ${tagList || "(none)"}

Generate exactly 5 short search prompts in ${langName} (2-5 words each) that a user would naturally type to find their files. Make them specific, varied, and based on the actual content above.

Respond with a JSON array only, no markdown:
["prompt one", "prompt two", "prompt three", "prompt four", "prompt five"]`;

  try {
    const raw = await generateText(prompt);
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s: unknown) => String(s).trim())
      .filter((s) => s.length > 1 && s.length < 60)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export async function translateFileContent(
  summary: string,
  tags: string[],
  keyTopics: string[],
  targetLang: string
): Promise<{ summary: string; tags: string[]; keyTopics: string[] }> {
  const langName = targetLang === "no" ? "Norwegian (Bokmål)" : "English";

  const prompt = `Translate the following file metadata DIRECTLY and LITERALLY to ${langName}.

Summary: "${summary}"
Tags: ${tags.join(", ")}
Key Topics: ${keyTopics.join(", ")}

Respond in valid JSON only, no markdown:
{
  "summary": "translated summary here",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "keyTopics": ["Topic 1", "Topic 2"]
}

STRICT RULES — do not deviate:
- Translate each tag WORD FOR WORD to its direct ${langName} equivalent. Do NOT rewrite, rephrase, or pick different words. A one-word tag becomes one ${langName} word.
- Keep exactly ${tags.length} tags, same order.
- Key topics: direct translation, title-case, in ${langName}.
- Summary: direct translation preserving every sentence and detail, in ${langName}.
- Do not add, remove, or substitute any concepts — translate only.`;

  const raw = await generateText(prompt);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    const parsed = JSON.parse(match[0]);
    return {
      summary: String(parsed.summary ?? summary).trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 4) : tags,
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics.map(String) : keyTopics,
    };
  } catch {
    return { summary, tags, keyTopics };
  }
}

export async function findRelatedFiles(
  sourceContent: string,
  sourceFilename: string,
  candidates: { id: number; name: string; summary: string; tags: string[] }[]
): Promise<{ id: number; reason: string; score: number }[]> {
  if (candidates.length === 0) return [];

  const candidateList = candidates
    .map((c, i) => `${i + 1}. ID ${c.id}: ${c.name} — ${c.summary} [tags: ${c.tags.join(", ")}]`)
    .join("\n");

  const prompt = `Source file: "${sourceFilename}"
Content snippet: ${sourceContent.slice(0, 1000)}

Candidate files:
${candidateList}

Which of these files are related to the source? Respond in JSON only:
[
  {"id": <file_id>, "reason": "one sentence reason", "score": <0.0-1.0>}
]

Only include files with score > 0.3. If none are related, return empty array [].`;

  try {
    const raw = await generateText(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => typeof r.id === "number" && typeof r.score === "number" && r.score > 0.3)
      .map((r) => ({ id: r.id, reason: String(r.reason ?? ""), score: Math.min(1, Math.max(0, r.score)) }));
  } catch {
    return [];
  }
}

export async function semanticSearch(
  query: string,
  files: { id: number; name: string; summary: string; tags: string[]; content: string | null }[]
): Promise<{ id: number; relevance: number; matchReason: string; highlights: string[] }[]> {
  if (files.length === 0) return [];

  const fileList = files
    .map((f, i) => `${i + 1}. ID ${f.id}: ${f.name}\nSummary: ${f.summary}\nTags: ${f.tags.join(", ")}\nContent: ${(f.content ?? "").slice(0, 400)}`)
    .join("\n\n---\n\n");

  const prompt = `Search query: "${query}"

Files to search:
${fileList}

Return a JSON array of matches ordered by relevance. Only include files that are relevant to the query (relevance > 0.3):
[
  {
    "id": <file_id>,
    "relevance": <0.0-1.0>,
    "matchReason": "one sentence explaining why this file matches",
    "highlights": ["relevant quote or excerpt 1", "relevant quote or excerpt 2"]
  }
]

If no files are relevant, return [].`;

  try {
    const raw = await generateText(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => typeof r.id === "number" && typeof r.relevance === "number" && r.relevance > 0.3)
      .sort((a, b) => b.relevance - a.relevance)
      .map((r) => ({
        id: r.id,
        relevance: Math.min(1, Math.max(0, r.relevance)),
        matchReason: String(r.matchReason ?? ""),
        highlights: Array.isArray(r.highlights) ? r.highlights.map(String).slice(0, 3) : [],
      }));
  } catch {
    return [];
  }
}
