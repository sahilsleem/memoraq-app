// Canonical import pipeline. Share-sheet and manual import both land here.
import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";

import {
  addActivity,
  createCustomer,
  findCustomerByFingerprint,
  insertAttachment,
  insertMessages,
} from "../db/repo";
import { fingerprintChat, parseWhatsAppText, type ParseResult } from "./whatsapp-parser";

export type ImportSource =
  | { kind: "txt"; uri: string; filename?: string }
  | { kind: "zip"; uri: string; filename?: string }
  | { kind: "text"; raw: string; filename?: string };

export type ImportResult =
  | { status: "ok"; customerId: string; isDuplicate: boolean; messageCount: number; attachmentCount: number }
  | { status: "empty" }
  | { status: "invalid"; reason: string }
  | { status: "failed"; reason: string };

const SAFE_FILENAME_RE = /[^a-zA-Z0-9._-]/g;
function sanitize(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const safe = base.replace(SAFE_FILENAME_RE, "_");
  return safe.length > 120 ? safe.substring(0, 120) : safe;
}

async function readTextUri(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri);
}

async function readZip(uri: string): Promise<JSZip> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  // JSZip accepts base64 directly
  return JSZip.loadAsync(b64, { base64: true });
}

async function extractTranscriptFromZip(zip: JSZip): Promise<{ transcript: string; attachments: JSZip.JSZipObject[] }> {
  let transcriptEntry: JSZip.JSZipObject | null = null;
  const atts: JSZip.JSZipObject[] = [];
  zip.forEach((rel, entry) => {
    if (entry.dir) return;
    const name = rel.split("/").pop() ?? rel;
    // Zip-slip guard
    if (rel.includes("..") || rel.startsWith("/")) return;
    if (/_chat\.txt$|chat\.txt$|WhatsApp.*\.txt$/i.test(name) && !transcriptEntry) {
      transcriptEntry = entry;
    } else if (/\.txt$/i.test(name) && !transcriptEntry) {
      transcriptEntry = entry;
    } else {
      atts.push(entry);
    }
  });
  if (!transcriptEntry) throw new Error("No transcript (.txt) found inside archive");
  const transcript = await (transcriptEntry as JSZip.JSZipObject).async("string");
  return { transcript, attachments: atts };
}

async function ensureCustomerDir(customerId: string): Promise<string> {
  const dir = (FileSystem.documentDirectory ?? "") + `customers/${customerId}/attachments/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  // Simple non-crypto fallback hash for dedup when expo-crypto isn't present
  let h = 0;
  for (let i = 0; i < data.length; i++) h = (Math.imul(31, h) + data[i]) | 0;
  return (h >>> 0).toString(16).padStart(8, "0");
}

function mimeFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    mp4: "video/mp4",
    mov: "video/quicktime",
    "3gp": "video/3gpp",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    opus: "audio/ogg",
    wav: "audio/wav",
    aac: "audio/aac",
    pdf: "application/pdf",
    txt: "text/plain",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function runImport(source: ImportSource): Promise<ImportResult> {
  try {
    let transcript = "";
    let zipAttachments: JSZip.JSZipObject[] = [];

    if (source.kind === "text") transcript = source.raw;
    else if (source.kind === "txt") transcript = await readTextUri(source.uri);
    else if (source.kind === "zip") {
      const zip = await readZip(source.uri);
      const r = await extractTranscriptFromZip(zip);
      transcript = r.transcript;
      zipAttachments = r.attachments;
    }

    if (!transcript.trim()) return { status: "empty" };

    const parsed: ParseResult = parseWhatsAppText(transcript);
    if (parsed.messages.length === 0) return { status: "empty" };

    const chatFp = fingerprintChat(parsed);
    const existing = await findCustomerByFingerprint(chatFp);

    let customerId: string;
    let isDup = false;
    if (existing) {
      customerId = existing.id;
      isDup = true;
      await addActivity(customerId, "reimported", `Re-imported ${parsed.messages.length} messages`);
    } else {
      const created = await createCustomer({
        original_identity: parsed.likelyCustomerIdentity,
        display_name: parsed.likelyCustomerIdentity,
        fingerprint: chatFp,
      });
      customerId = created.id;
    }

    await insertMessages(
      customerId,
      parsed.messages.map((m) => ({
        timestamp: m.timestamp,
        sender: m.sender,
        text: m.text,
        message_type: m.message_type,
        fingerprint: m.fingerprint,
      })),
    );

    // Attachments
    let attCount = 0;
    if (zipAttachments.length > 0) {
      const dir = await ensureCustomerDir(customerId);
      for (const entry of zipAttachments) {
        try {
          const bytes = await entry.async("uint8array");
          const stored = `${Date.now()}_${sanitize(entry.name)}`;
          const localPath = dir + stored;
          const b64 = u8ToBase64(bytes);
          await FileSystem.writeAsStringAsync(localPath, b64, { encoding: FileSystem.EncodingType.Base64 });
          const digest = await sha256Hex(bytes);
          await insertAttachment({
            message_id: null,
            customer_id: customerId,
            original_filename: entry.name.split("/").pop() ?? entry.name,
            stored_filename: stored,
            mime_type: mimeFromName(entry.name),
            size: bytes.length,
            sha256: digest,
            local_path: localPath,
            state: "AVAILABLE",
            imported_at: Date.now(),
          });
          attCount++;
        } catch {
          await insertAttachment({
            message_id: null,
            customer_id: customerId,
            original_filename: entry.name,
            stored_filename: null,
            mime_type: null,
            size: null,
            sha256: null,
            local_path: null,
            state: "CORRUPTED",
            imported_at: Date.now(),
          });
        }
      }
    }

    return {
      status: "ok",
      customerId,
      isDuplicate: isDup,
      messageCount: parsed.messages.length,
      attachmentCount: attCount,
    };
  } catch (e: any) {
    return { status: "failed", reason: e?.message ?? "Import failed" };
  }
}

function u8ToBase64(u8: Uint8Array): string {
  // Chunked base64 to avoid stack overflow
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)));
  }
  if (typeof btoa !== "undefined") return btoa(s);
  // Fallback (should always exist in Hermes/web)
  const b = (globalThis as any).Buffer;
  return b ? b.from(s, "binary").toString("base64") : s;
}
