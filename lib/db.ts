import Database from "better-sqlite3";
import { join } from "node:path";

const dbPath = join(process.cwd(), "data", "activity.db");

const g = globalThis as unknown as { __halDb?: Database.Database };

function open(): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      type TEXT NOT NULL,
      target TEXT,
      action TEXT,
      vram_used_mb INTEGER,
      vram_total_mb INTEGER,
      success INTEGER NOT NULL,
      message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);
  `);
  return db;
}

if (!g.__halDb) g.__halDb = open();
export const db = g.__halDb;
