import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";
import { join } from "path";
import * as schema from "./schema";
import { is } from "@electron-toolkit/utils";

let db: ReturnType<typeof drizzle>;
let sqlite: Database.Database;

export function initDb(): void {
  const dbPath = is.dev
    ? join(process.cwd(), "filebrain.db")
    : join(app.getPath("userData"), "filebrain.db");

  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  // Single-user local app — FK enforcement not needed and causes issues
  // when migrating from older schema versions that had password_hash etc.
  sqlite.pragma("foreign_keys = OFF");

  // Create tables — these are no-ops if they already exist in the DB
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'other',
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      content TEXT,
      summary TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      key_topics TEXT NOT NULL DEFAULT '[]',
      embedding TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS file_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file_id INTEGER NOT NULL,
      target_file_id INTEGER NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0.0,
      UNIQUE(source_file_id, target_file_id)
    );
  `);

  // Migration: add original-language columns used to anchor translations.
  // ALTER TABLE ignores columns that already exist via the try/catch.
  const addCol = (col: string, def: string) => {
    try { sqlite.exec(`ALTER TABLE knowledge_files ADD COLUMN ${col} ${def}`); } catch { /* already exists */ }
  };
  addCol("original_summary", "TEXT");
  addCol("original_tags", "TEXT");
  addCol("original_key_topics", "TEXT");
  addCol("original_lang", "TEXT DEFAULT 'en'");
  addCol("file_path", "TEXT");

  db = drizzle(sqlite, { schema });
}

export function getDb() {
  if (!db) throw new Error("DB not initialized");
  return db;
}

export function getSqlite() {
  if (!sqlite) throw new Error("SQLite not initialized");
  return sqlite;
}
