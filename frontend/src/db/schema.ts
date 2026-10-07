// SQLite schema for Memoraq. All data is local, offline, private.
import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let dbUnavailable = false;

export class DbUnavailableError extends Error {
  constructor() {
    super("DB_UNAVAILABLE");
    this.name = "DbUnavailableError";
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbUnavailable) throw new DbUnavailableError();
  if (dbInstance) return dbInstance;
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("memoraq.db");
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await migrate(db);
      dbInstance = db;
      return db;
    })();
  }
  // Race with a 2.5s timeout so UI code can degrade gracefully on web preview.
  const raced = await Promise.race([
    dbPromise.then((d) => ({ ok: true as const, d })),
    new Promise<{ ok: false }>((resolve) => setTimeout(() => resolve({ ok: false }), 2500)),
  ]);
  if (raced.ok) return raced.d;
  dbUnavailable = true;
  throw new DbUnavailableError();
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      original_identity TEXT NOT NULL,
      display_name TEXT NOT NULL,
      custom_name TEXT,
      starred INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      last_message_at INTEGER,
      last_message_preview TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE
    );
    CREATE INDEX IF NOT EXISTS idx_customers_last_message ON customers(last_message_at DESC);
    CREATE INDEX IF NOT EXISTS idx_customers_starred ON customers(starred);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      customer_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      fingerprint TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_customer ON messages(customer_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_fingerprint ON messages(fingerprint);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      customer_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notes_customer ON notes(customer_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_tags (
      customer_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (customer_id, tag_id),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS followups (
      id TEXT PRIMARY KEY NOT NULL,
      customer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT,
      scheduled_at INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      notification_id TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON followups(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_followups_customer ON followups(customer_id);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL,
      message_id TEXT,
      customer_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT,
      mime_type TEXT,
      size INTEGER,
      sha256 TEXT,
      local_path TEXT,
      state TEXT NOT NULL DEFAULT 'MISSING',
      imported_at INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_customer ON attachments(customer_id);

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY NOT NULL,
      customer_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_activity_customer ON activity(customer_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rescue_packs (
      id TEXT PRIMARY KEY NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      customer_count INTEGER NOT NULL,
      checksum TEXT
    );
  `);

  // Seed built-in tags if empty
  const existing = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM tags");
  if (!existing || existing.c === 0) {
    const builtins = ["Lead", "Active Order", "Pending Payment", "Shipped", "Completed", "VIP", "Follow Up"];
    const now = Date.now();
    for (const name of builtins) {
      await db.runAsync(
        "INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)",
        [cryptoRandomId(), name, now],
      );
    }
  }
}

export function cryptoRandomId(): string {
  // RFC4122-ish v4 using Math.random (sufficient for local IDs)
  const h = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) out += "-";
    out += h[Math.floor(Math.random() * 16)];
  }
  return out;
}

export async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    p.then(
      (v) => {
        if (!settled) {
          settled = true;
          clearTimeout(t);
          resolve(v);
        }
      },
      () => {
        if (!settled) {
          settled = true;
          clearTimeout(t);
          resolve(fallback);
        }
      },
    );
  });
}
