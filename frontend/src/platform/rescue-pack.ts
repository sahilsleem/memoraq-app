// Rescue Pack generator. Builds a portable ZIP with CSV + offline HTML viewer.
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

import { getDb } from "../db/schema";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCSV(rows: Record<string, unknown>[], cols: string[]): string {
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => csvEscape(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

export async function createRescuePack(): Promise<{ uri: string; filename: string; customerCount: number }> {
  const db = await getDb();
  const customers = await db.getAllAsync<any>("SELECT * FROM customers ORDER BY display_name");
  const messages = await db.getAllAsync<any>("SELECT * FROM messages ORDER BY customer_id, timestamp");
  const notes = await db.getAllAsync<any>("SELECT * FROM notes ORDER BY customer_id, created_at");
  const tags = await db.getAllAsync<any>("SELECT * FROM tags ORDER BY name");
  const customerTags = await db.getAllAsync<any>("SELECT * FROM customer_tags");
  const followups = await db.getAllAsync<any>("SELECT * FROM followups ORDER BY scheduled_at");
  const attachments = await db.getAllAsync<any>("SELECT * FROM attachments ORDER BY customer_id, imported_at");

  const zip = new JSZip();
  zip.file("README.txt", RESCUE_README);
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        app: "Memoraq",
        version: 1,
        exportedAt: new Date().toISOString(),
        customerCount: customers.length,
        messageCount: messages.length,
      },
      null,
      2,
    ),
  );
  zip.file("customers.csv", toCSV(customers, [
    "id","original_identity","display_name","custom_name","starred","message_count","last_message_at","created_at",
  ]));
  zip.file("messages.csv", toCSV(messages, ["id","customer_id","timestamp","sender","text","message_type"]));
  zip.file("notes.csv", toCSV(notes, ["id","customer_id","text","created_at","updated_at"]));
  zip.file("tags.csv", toCSV(tags, ["id","name","created_at"]));
  zip.file("customer_tags.csv", toCSV(customerTags, ["customer_id","tag_id"]));
  zip.file("followups.csv", toCSV(followups, ["id","customer_id","title","note","scheduled_at","completed","created_at"]));
  zip.file("attachments.csv", toCSV(attachments, [
    "id","customer_id","original_filename","stored_filename","mime_type","size","state","imported_at",
  ]));

  // Add attachment binaries where available
  for (const a of attachments) {
    if (a.state === "AVAILABLE" && a.local_path && a.stored_filename) {
      try {
        const b64 = await FileSystem.readAsStringAsync(a.local_path, { encoding: FileSystem.EncodingType.Base64 });
        zip.file(`attachments/${a.customer_id}/${a.stored_filename}`, b64, { base64: true });
      } catch {
        /* skip missing file */
      }
    }
  }

  // Offline HTML viewer. Reads CSVs via embedded JSON for simplicity.
  const data = { customers, messages, notes, tags, customerTags, followups };
  zip.file("index.html", buildHtmlViewer(data));

  const b64 = await zip.generateAsync({ type: "base64" });
  const filename = `Memoraq_RescuePack_${new Date().toISOString().slice(0, 10)}.zip`;
  const outDir = (FileSystem.cacheDirectory ?? "") + "rescue/";
  await FileSystem.makeDirectoryAsync(outDir, { intermediates: true });
  const outUri = outDir + filename;
  await FileSystem.writeAsStringAsync(outUri, b64, { encoding: FileSystem.EncodingType.Base64 });

  await db.runAsync(
    "INSERT INTO rescue_packs (id, path, created_at, customer_count, checksum) VALUES (?, ?, ?, ?, ?)",
    [String(Date.now()), outUri, Date.now(), customers.length, null],
  );

  return { uri: outUri, filename, customerCount: customers.length };
}

export async function shareRescuePack(uri: string) {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, { dialogTitle: "Save your Memoraq Rescue Pack" });
}

const RESCUE_README = `MEMORAQ RESCUE PACK
====================

This archive is a portable, offline copy of your Memoraq data.

Open index.html in any modern web browser (no internet needed) to view your
customers, conversations, notes, tags and follow-ups.

Files:
- index.html         Offline viewer
- manifest.json      Export metadata
- customers.csv      Customer list
- messages.csv       All archived messages
- notes.csv          Your private notes
- tags.csv           Tag catalogue
- customer_tags.csv  Customer <-> Tag relations
- followups.csv      Scheduled follow-ups
- attachments.csv    Attachment metadata
- attachments/       Media files, where available

Keep this file private.
`;

function buildHtmlViewer(data: any): string {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Memoraq Rescue Pack</title>
<style>
  :root{--bg:#FAFAFA;--fg:#161B18;--muted:#546358;--card:#F2F4F2;--brand:#365341;--brandTint:#CDE0D2;--border:#E1E5E2}
  @media (prefers-color-scheme: dark){:root{--bg:#121413;--fg:#E3E8E4;--muted:#93A197;--card:#1D221E;--brand:#A3C6AF;--brandTint:#294232;--border:#313B34}}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  header{padding:24px 20px;border-bottom:1px solid var(--border)} h1{margin:0;font-size:20px;font-weight:500}
  .layout{display:grid;grid-template-columns:320px 1fr;min-height:calc(100vh - 73px)} @media (max-width:700px){.layout{grid-template-columns:1fr}}
  aside{border-right:1px solid var(--border);overflow-y:auto} main{padding:20px;overflow-y:auto}
  .cust{padding:14px 20px;border-bottom:1px solid var(--border);cursor:pointer} .cust:hover{background:var(--card)} .cust.active{background:var(--brandTint)}
  .cust .n{font-weight:500} .cust .m{color:var(--muted);font-size:12px;margin-top:2px}
  .msg{max-width:80%;padding:10px 14px;border-radius:14px;margin:6px 0;white-space:pre-wrap}
  .msg.in{background:var(--card);align-self:flex-start} .msg.out{background:var(--brandTint);align-self:flex-end}
  .row{display:flex;flex-direction:column;gap:2px;margin:10px 0}
  .meta{color:var(--muted);font-size:11px;margin-bottom:4px}
  .note{background:var(--card);padding:12px 14px;border-radius:12px;margin:8px 0}
  h2{font-size:16px;font-weight:500;margin:24px 0 8px}
  .tag{display:inline-block;background:var(--brandTint);color:var(--brand);padding:3px 10px;border-radius:999px;font-size:12px;margin:2px}
</style></head>
<body><header><h1>Memoraq Rescue Pack</h1></header>
<div class="layout"><aside id="list"></aside><main id="detail"><p style="color:var(--muted)">Select a customer</p></main></div>
<script>
const DATA = ${payload};
const list = document.getElementById('list');
const detail = document.getElementById('detail');
let selected = null;
function render(){
  list.innerHTML = '';
  for (const c of DATA.customers){
    const div = document.createElement('div');
    div.className = 'cust' + (selected===c.id?' active':'');
    const n = c.custom_name || c.display_name || c.original_identity;
    div.innerHTML = '<div class="n"></div><div class="m"></div>';
    div.children[0].textContent = n;
    div.children[1].textContent = (c.message_count||0) + ' messages';
    div.onclick = () => { selected = c.id; render(); };
    list.appendChild(div);
  }
  if (!selected){ detail.innerHTML = '<p style="color:var(--muted)">Select a customer</p>'; return; }
  const c = DATA.customers.find(x => x.id === selected);
  const msgs = DATA.messages.filter(m => m.customer_id === selected).sort((a,b)=>a.timestamp-b.timestamp);
  const notes = DATA.notes.filter(n => n.customer_id === selected);
  const tagIds = DATA.customerTags.filter(t => t.customer_id === selected).map(t => t.tag_id);
  const tags = DATA.tags.filter(t => tagIds.includes(t.id));
  const fus = DATA.followups.filter(f => f.customer_id === selected);
  let html = '';
  html += '<h1 style="font-size:22px;margin:0 0 4px">' + escape(c.custom_name || c.display_name) + '</h1>';
  html += '<div style="color:var(--muted);font-size:13px">' + escape(c.original_identity) + '</div>';
  if (tags.length) html += '<div style="margin-top:10px">' + tags.map(t => '<span class="tag">' + escape(t.name) + '</span>').join('') + '</div>';
  html += '<h2>Conversation</h2><div style="display:flex;flex-direction:column">';
  for (const m of msgs){
    const out = /^you$/i.test(m.sender);
    const d = new Date(m.timestamp).toLocaleString();
    html += '<div class="row" style="align-items:' + (out?'flex-end':'flex-start') + '">';
    html += '<div class="meta">' + escape(m.sender) + ' · ' + d + '</div>';
    html += '<div class="msg ' + (out?'out':'in') + '">' + escape(m.text) + '</div></div>';
  }
  html += '</div>';
  if (notes.length){ html += '<h2>Notes</h2>'; for (const n of notes) html += '<div class="note">' + escape(n.text) + '</div>'; }
  if (fus.length){ html += '<h2>Follow-ups</h2>'; for (const f of fus){ html += '<div class="note"><strong>' + escape(f.title) + '</strong><br><span style="color:var(--muted);font-size:12px">' + new Date(f.scheduled_at).toLocaleString() + (f.completed?' · completed':'') + '</span>' + (f.note?'<div style="margin-top:4px">'+escape(f.note)+'</div>':'') + '</div>'; }}
  detail.innerHTML = html;
}
function escape(s){const d=document.createElement('div');d.textContent=String(s==null?'':s);return d.innerHTML;}
render();
</script></body></html>`;
}
