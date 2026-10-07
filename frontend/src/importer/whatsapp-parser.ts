// WhatsApp exported chat (.txt) parser. Pure JS, offline, Unicode-safe.
export type ParsedMessage = {
  timestamp: number;
  sender: string;
  text: string;
  message_type: "text" | "image" | "video" | "audio" | "document" | "system" | "media_omitted";
  fingerprint: string;
};

export type ParseResult = {
  messages: ParsedMessage[];
  participants: string[];
  // The "other party" guess (non-business). Falls back to first sender.
  likelyCustomerIdentity: string;
};

// Matches:  "12/08/23, 10:30 PM - Rahul: Hi" (12h) and "12/08/23, 22:30 - Rahul: Hi" (24h)
// Also iOS: "[12/08/23, 10:30:45 PM] Rahul: Hi"
const LINE_RE =
  /^(?:\[)?(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:\u202F)?([APap][Mm])?\]?\s*[-–]?\s*(.*)$/;

function parseDateTime(dateStr: string, timeStr: string, ampm?: string): number {
  const [a, b, c] = dateStr.split(/[\/.\-]/).map((s) => parseInt(s, 10));
  // Heuristic: if first segment > 12, treat as DD/MM/YY; else MM/DD/YY (US) — WhatsApp usually DD/MM/YY globally.
  let day = a,
    month = b,
    year = c;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else {
    // default DD/MM
    day = a;
    month = b;
  }
  if (year < 100) year += 2000;
  const [hh, mm, ss] = timeStr.split(":").map((s) => parseInt(s, 10));
  let hour = hh;
  if (ampm) {
    const isPM = /p/i.test(ampm);
    if (hour === 12) hour = isPM ? 12 : 0;
    else if (isPM) hour += 12;
  }
  return new Date(year, month - 1, day, hour, mm || 0, ss || 0).getTime();
}

const MEDIA_RE = /<Media omitted>|<attached:\s*([^>]+)>|\(file attached\)/i;
const SYSTEM_HINTS = [
  "Messages and calls are end-to-end encrypted",
  "created group",
  "added",
  "left",
  "changed the subject",
  "You deleted this message",
  "This message was deleted",
];

function fingerprintFor(ts: number, sender: string, text: string): string {
  // Simple deterministic hash
  const s = `${ts}|${sender}|${text}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `fp_${(h >>> 0).toString(16)}_${s.length}`;
}

export function parseWhatsAppText(raw: string): ParseResult {
  // Strip BOM, normalize line endings
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  const msgs: ParsedMessage[] = [];
  let current: ParsedMessage | null = null;

  const flush = () => {
    if (current) {
      current.fingerprint = fingerprintFor(current.timestamp, current.sender, current.text);
      msgs.push(current);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u200e|\u200f/g, "").trimEnd();
    const m = LINE_RE.exec(line);
    if (m) {
      flush();
      const [, dateStr, timeStr, ampm, rest] = m;
      const ts = parseDateTime(dateStr, timeStr, ampm);
      // rest may be "Sender: body" or system message "You deleted this message"
      const colon = rest.indexOf(":");
      let sender = "System";
      let body = rest;
      let kind: ParsedMessage["message_type"] = "text";
      const isSystemHint = SYSTEM_HINTS.some((h) => rest.includes(h));
      if (colon > 0 && !isSystemHint) {
        sender = rest.substring(0, colon).trim();
        body = rest.substring(colon + 1).trim();
      } else {
        kind = "system";
      }
      if (MEDIA_RE.test(body)) {
        const mm = MEDIA_RE.exec(body);
        if (mm && mm[1]) {
          const fn = mm[1].trim().toLowerCase();
          if (/\.(jpe?g|png|webp|gif|heic)$/.test(fn)) kind = "image";
          else if (/\.(mp4|mov|3gp|mkv)$/.test(fn)) kind = "video";
          else if (/\.(mp3|m4a|ogg|opus|wav|aac)$/.test(fn)) kind = "audio";
          else kind = "document";
          body = mm[1].trim();
        } else {
          kind = "media_omitted";
          body = "Media omitted";
        }
      }
      current = { timestamp: ts, sender, text: body, message_type: kind, fingerprint: "" };
    } else if (current) {
      // continuation line
      current.text += (current.text ? "\n" : "") + line;
    }
  }
  flush();

  const participants = Array.from(new Set(msgs.filter((m) => m.message_type !== "system").map((m) => m.sender)));
  // Heuristic: the "customer" is usually the one who is NOT "You". If "You" is present, pick the other.
  let likely = participants[0] || "Customer";
  const nonYou = participants.find((p) => !/^you$/i.test(p));
  if (nonYou) likely = nonYou;
  return { messages: msgs, participants, likelyCustomerIdentity: likely };
}

export function fingerprintChat(result: ParseResult): string {
  // Stable fingerprint based on identity + first N messages
  const key =
    result.likelyCustomerIdentity +
    "|" +
    result.messages
      .slice(0, 5)
      .map((m) => m.fingerprint)
      .join(",");
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return `chat_${(h >>> 0).toString(16)}`;
}
