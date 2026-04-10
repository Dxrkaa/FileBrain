import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const knowledgeFiles = sqliteTable("knowledge_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().default(1),
  name: text("name").notNull(),
  fileType: text("file_type").notNull().default("other"),
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  content: text("content"),
  summary: text("summary"),
  tags: text("tags").notNull().default("[]"),
  keyTopics: text("key_topics").notNull().default("[]"),
  embedding: text("embedding"),
  status: text("status").notNull().default("pending"),
  uploadedAt: text("uploaded_at").notNull().default(sql`(datetime('now'))`),
  processedAt: text("processed_at"),
});

export const fileRelations = sqliteTable("file_relations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceFileId: integer("source_file_id").notNull(),
  targetFileId: integer("target_file_id").notNull(),
  reason: text("reason").notNull().default(""),
  score: real("score").notNull().default(0),
});
