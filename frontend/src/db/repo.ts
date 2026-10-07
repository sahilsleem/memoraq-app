import { cryptoRandomId, getDb } from "./schema";
import type { ActivityItem, Attachment, Customer, FollowUp, Message, Note, Tag } from "./types";

// --- Customers -------------------------------------------------------------
export async function listCustomers(filter?: "all" | "starred" | "followups"): Promise<Customer[]> {
  const db = await getDb();
  if (filter === "starred") {
    return db.getAllAsync<Customer>("SELECT * FROM customers WHERE starred = 1 ORDER BY last_message_at DESC");
  }
  if (filter === "followups") {
    return db.getAllAsync<Customer>(
      `SELECT c.* FROM customers c WHERE EXISTS (
         SELECT 1 FROM followups f WHERE f.customer_id = c.id AND f.completed = 0
       ) ORDER BY last_message_at DESC`,
    );
  }
  return db.getAllAsync<Customer>("SELECT * FROM customers ORDER BY last_message_at DESC NULLS LAST, created_at DESC");
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const db = await getDb();
  return (await db.getFirstAsync<Customer>("SELECT * FROM customers WHERE id = ?", [id])) ?? null;
}

export async function findCustomerByFingerprint(fp: string): Promise<Customer | null> {
  const db = await getDb();
  return (await db.getFirstAsync<Customer>("SELECT * FROM customers WHERE fingerprint = ?", [fp])) ?? null;
}

export async function createCustomer(input: {
  original_identity: string;
  display_name: string;
  fingerprint: string;
  custom_name?: string | null;
}): Promise<Customer> {
  const db = await getDb();
  const now = Date.now();
  const id = cryptoRandomId();
  await db.runAsync(
    `INSERT INTO customers (id, original_identity, display_name, custom_name, starred, message_count,
      last_message_at, last_message_preview, created_at, updated_at, fingerprint)
     VALUES (?, ?, ?, ?, 0, 0, NULL, NULL, ?, ?, ?)`,
    [id, input.original_identity, input.display_name, input.custom_name ?? null, now, now, input.fingerprint],
  );
  await addActivity(id, "imported", "Customer created");
  return (await getCustomer(id))!;
}

export async function updateCustomerName(id: string, custom_name: string | null) {
  const db = await getDb();
  await db.runAsync("UPDATE customers SET custom_name = ?, updated_at = ? WHERE id = ?", [custom_name, Date.now(), id]);
  await addActivity(id, "renamed", custom_name ?? "Cleared custom name");
}

export async function toggleStar(id: string): Promise<boolean> {
  const db = await getDb();
  const c = await getCustomer(id);
  if (!c) return false;
  const next = c.starred ? 0 : 1;
  await db.runAsync("UPDATE customers SET starred = ?, updated_at = ? WHERE id = ?", [next, Date.now(), id]);
  return next === 1;
}

export async function deleteCustomer(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM customers WHERE id = ?", [id]);
}

export async function recomputeCustomerSummary(customerId: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number; last: number | null; preview: string | null }>(
    `SELECT COUNT(*) as c,
       (SELECT MAX(timestamp) FROM messages WHERE customer_id = ?) as last,
       (SELECT text FROM messages WHERE customer_id = ? ORDER BY timestamp DESC LIMIT 1) as preview
     FROM messages WHERE customer_id = ?`,
    [customerId, customerId, customerId],
  );
  if (!row) return;
  await db.runAsync(
    "UPDATE customers SET message_count = ?, last_message_at = ?, last_message_preview = ?, updated_at = ? WHERE id = ?",
    [row.c, row.last, row.preview ? row.preview.substring(0, 140) : null, Date.now(), customerId],
  );
}

// --- Messages --------------------------------------------------------------
export async function insertMessages(customerId: string, msgs: Omit<Message, "id" | "customer_id">[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const m of msgs) {
      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM messages WHERE customer_id = ? AND fingerprint = ?",
        [customerId, m.fingerprint],
      );
      if (existing) continue;
      await db.runAsync(
        "INSERT INTO messages (id, customer_id, timestamp, sender, text, message_type, fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [cryptoRandomId(), customerId, m.timestamp, m.sender, m.text, m.message_type, m.fingerprint],
      );
    }
  });
  await recomputeCustomerSummary(customerId);
}

export async function listMessages(customerId: string, limit = 1000): Promise<Message[]> {
  const db = await getDb();
  return db.getAllAsync<Message>(
    "SELECT * FROM messages WHERE customer_id = ? ORDER BY timestamp ASC LIMIT ?",
    [customerId, limit],
  );
}

// --- Notes ----------------------------------------------------------------
export async function listNotes(customerId: string): Promise<Note[]> {
  const db = await getDb();
  return db.getAllAsync<Note>("SELECT * FROM notes WHERE customer_id = ? ORDER BY created_at DESC", [customerId]);
}
export async function addNote(customerId: string, text: string): Promise<Note> {
  const db = await getDb();
  const now = Date.now();
  const id = cryptoRandomId();
  await db.runAsync("INSERT INTO notes (id, customer_id, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", [
    id,
    customerId,
    text,
    now,
    now,
  ]);
  await addActivity(customerId, "note_added", text.substring(0, 80));
  return { id, customer_id: customerId, text, created_at: now, updated_at: now };
}
export async function updateNote(id: string, text: string) {
  const db = await getDb();
  await db.runAsync("UPDATE notes SET text = ?, updated_at = ? WHERE id = ?", [text, Date.now(), id]);
}
export async function deleteNote(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM notes WHERE id = ?", [id]);
}

// --- Tags ------------------------------------------------------------------
export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.getAllAsync<Tag>("SELECT * FROM tags ORDER BY name");
}
export async function listCustomerTags(customerId: string): Promise<Tag[]> {
  const db = await getDb();
  return db.getAllAsync<Tag>(
    `SELECT t.* FROM tags t JOIN customer_tags ct ON ct.tag_id = t.id WHERE ct.customer_id = ? ORDER BY t.name`,
    [customerId],
  );
}
export async function createTag(name: string): Promise<Tag> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Tag>("SELECT * FROM tags WHERE name = ?", [name]);
  if (existing) return existing;
  const id = cryptoRandomId();
  const now = Date.now();
  await db.runAsync("INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)", [id, name, now]);
  return { id, name, created_at: now };
}
export async function attachTag(customerId: string, tagId: string) {
  const db = await getDb();
  await db.runAsync("INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?, ?)", [customerId, tagId]);
  await addActivity(customerId, "tag_added", tagId);
}
export async function detachTag(customerId: string, tagId: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM customer_tags WHERE customer_id = ? AND tag_id = ?", [customerId, tagId]);
}

// --- Follow-ups ------------------------------------------------------------
export async function listFollowUps(bucket: "today" | "upcoming" | "overdue" | "completed" | "all"): Promise<FollowUp[]> {
  const db = await getDb();
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (bucket === "today")
    return db.getAllAsync<FollowUp>(
      "SELECT * FROM followups WHERE completed = 0 AND scheduled_at BETWEEN ? AND ? ORDER BY scheduled_at ASC",
      [startOfToday.getTime(), endOfToday.getTime()],
    );
  if (bucket === "upcoming")
    return db.getAllAsync<FollowUp>(
      "SELECT * FROM followups WHERE completed = 0 AND scheduled_at > ? ORDER BY scheduled_at ASC",
      [endOfToday.getTime()],
    );
  if (bucket === "overdue")
    return db.getAllAsync<FollowUp>(
      "SELECT * FROM followups WHERE completed = 0 AND scheduled_at < ? ORDER BY scheduled_at DESC",
      [startOfToday.getTime()],
    );
  if (bucket === "completed")
    return db.getAllAsync<FollowUp>(
      "SELECT * FROM followups WHERE completed = 1 ORDER BY completed_at DESC LIMIT 100",
    );
  return db.getAllAsync<FollowUp>("SELECT * FROM followups ORDER BY scheduled_at ASC");
}
export async function listCustomerFollowUps(customerId: string): Promise<FollowUp[]> {
  const db = await getDb();
  return db.getAllAsync<FollowUp>(
    "SELECT * FROM followups WHERE customer_id = ? ORDER BY completed ASC, scheduled_at ASC",
    [customerId],
  );
}
export async function addFollowUp(input: {
  customer_id: string;
  title: string;
  note?: string | null;
  scheduled_at: number;
  notification_id?: string | null;
}): Promise<FollowUp> {
  const db = await getDb();
  const id = cryptoRandomId();
  const now = Date.now();
  await db.runAsync(
    "INSERT INTO followups (id, customer_id, title, note, scheduled_at, completed, created_at, notification_id) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    [id, input.customer_id, input.title, input.note ?? null, input.scheduled_at, now, input.notification_id ?? null],
  );
  await addActivity(input.customer_id, "followup_scheduled", input.title);
  return {
    id,
    customer_id: input.customer_id,
    title: input.title,
    note: input.note ?? null,
    scheduled_at: input.scheduled_at,
    completed: 0,
    completed_at: null,
    created_at: now,
    notification_id: input.notification_id ?? null,
  };
}
export async function completeFollowUp(id: string) {
  const db = await getDb();
  await db.runAsync("UPDATE followups SET completed = 1, completed_at = ? WHERE id = ?", [Date.now(), id]);
}
export async function deleteFollowUp(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM followups WHERE id = ?", [id]);
}
export async function nextFollowUpFor(customerId: string): Promise<FollowUp | null> {
  const db = await getDb();
  return (
    (await db.getFirstAsync<FollowUp>(
      "SELECT * FROM followups WHERE customer_id = ? AND completed = 0 ORDER BY scheduled_at ASC LIMIT 1",
      [customerId],
    )) ?? null
  );
}

// --- Attachments -----------------------------------------------------------
export async function listAttachments(customerId: string): Promise<Attachment[]> {
  const db = await getDb();
  return db.getAllAsync<Attachment>(
    "SELECT * FROM attachments WHERE customer_id = ? ORDER BY imported_at DESC",
    [customerId],
  );
}
export async function insertAttachment(a: Omit<Attachment, "id">): Promise<string> {
  const db = await getDb();
  const id = cryptoRandomId();
  await db.runAsync(
    `INSERT INTO attachments (id, message_id, customer_id, original_filename, stored_filename, mime_type, size, sha256, local_path, state, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      a.message_id,
      a.customer_id,
      a.original_filename,
      a.stored_filename,
      a.mime_type,
      a.size,
      a.sha256,
      a.local_path,
      a.state,
      a.imported_at,
    ],
  );
  return id;
}

// --- Activity --------------------------------------------------------------
export async function addActivity(customerId: string, kind: string, details?: string | null) {
  const db = await getDb();
  await db.runAsync("INSERT INTO activity (id, customer_id, kind, details, created_at) VALUES (?, ?, ?, ?, ?)", [
    cryptoRandomId(),
    customerId,
    kind,
    details ?? null,
    Date.now(),
  ]);
}
export async function listActivity(customerId: string): Promise<ActivityItem[]> {
  const db = await getDb();
  return db.getAllAsync<ActivityItem>(
    "SELECT * FROM activity WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100",
    [customerId],
  );
}

// --- Search ---------------------------------------------------------------
export type SearchHit = {
  kind: "customer" | "message" | "note";
  customer_id: string;
  customer_name: string;
  snippet: string;
  timestamp?: number;
};
export async function globalSearch(q: string): Promise<SearchHit[]> {
  if (!q.trim()) return [];
  const db = await getDb();
  const like = `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const hits: SearchHit[] = [];
  const customers = await db.getAllAsync<Customer>(
    "SELECT * FROM customers WHERE custom_name LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' OR original_identity LIKE ? ESCAPE '\\' LIMIT 20",
    [like, like, like],
  );
  for (const c of customers)
    hits.push({
      kind: "customer",
      customer_id: c.id,
      customer_name: c.custom_name || c.display_name,
      snippet: c.original_identity,
    });

  const messages = await db.getAllAsync<Message & { cname: string }>(
    `SELECT m.*, COALESCE(c.custom_name, c.display_name) as cname
     FROM messages m JOIN customers c ON c.id = m.customer_id
     WHERE m.text LIKE ? ESCAPE '\\' ORDER BY m.timestamp DESC LIMIT 40`,
    [like],
  );
  for (const m of messages)
    hits.push({
      kind: "message",
      customer_id: m.customer_id,
      customer_name: m.cname,
      snippet: m.text,
      timestamp: m.timestamp,
    });

  const notes = await db.getAllAsync<Note & { cname: string }>(
    `SELECT n.*, COALESCE(c.custom_name, c.display_name) as cname
     FROM notes n JOIN customers c ON c.id = n.customer_id
     WHERE n.text LIKE ? ESCAPE '\\' ORDER BY n.updated_at DESC LIMIT 40`,
    [like],
  );
  for (const n of notes)
    hits.push({
      kind: "note",
      customer_id: n.customer_id,
      customer_name: n.cname,
      snippet: n.text,
      timestamp: n.updated_at,
    });
  return hits;
}

// --- Delete Everything ----------------------------------------------------
export async function deleteEverything() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM customer_tags;
    DELETE FROM attachments;
    DELETE FROM activity;
    DELETE FROM followups;
    DELETE FROM notes;
    DELETE FROM messages;
    DELETE FROM customers;
    DELETE FROM rescue_packs;
  `);
}
