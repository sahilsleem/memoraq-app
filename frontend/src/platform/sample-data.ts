// Realistic sample data loader for development. Never auto-runs in production.
import {
  addFollowUp,
  addNote,
  attachTag,
  createCustomer,
  createTag,
  insertMessages,
  listCustomers,
} from "../db/repo";

const SAMPLES: {
  name: string;
  phone: string;
  tags: string[];
  note: string;
  followUpInDays?: number;
  convo: { who: "you" | "them"; text: string; offsetMinutes: number }[];
}[] = [
  {
    name: "Rahul Sharma",
    phone: "+91 98765 43210",
    tags: ["VIP", "Active Order"],
    note: "Prefers evening delivery. Payment via UPI.",
    followUpInDays: 2,
    convo: [
      { who: "them", text: "Hi, is the saree order ready?", offsetMinutes: -2880 },
      { who: "you", text: "Yes Rahul ji, shipping tomorrow morning", offsetMinutes: -2875 },
      { who: "them", text: "Please share tracking once shipped", offsetMinutes: -2870 },
      { who: "you", text: "Will do", offsetMinutes: -2868 },
    ],
  },
  {
    name: "Ayesha Khan",
    phone: "+92 300 1234567",
    tags: ["Lead", "Follow Up"],
    note: "Interested in bulk order of 20 kurtas. Awaiting her designs.",
    followUpInDays: 1,
    convo: [
      { who: "them", text: "Salam, do you take bulk orders?", offsetMinutes: -1440 },
      { who: "you", text: "Walaikum salam, yes we do. What quantity?", offsetMinutes: -1430 },
      { who: "them", text: "Around 20 pieces, mixed sizes", offsetMinutes: -1425 },
      { who: "you", text: "Sure, please send the designs and sizes", offsetMinutes: -1420 },
    ],
  },
  {
    name: "Imran Traders",
    phone: "+91 90000 11223",
    tags: ["Pending Payment"],
    note: "Invoice INV-2041 pending — Rs. 12,400.",
    convo: [
      { who: "you", text: "Reminder: invoice INV-2041 is due this week", offsetMinutes: -4320 },
      { who: "them", text: "Will clear by Friday, apologies", offsetMinutes: -4300 },
    ],
  },
  {
    name: "Neha Boutique",
    phone: "+91 88888 55555",
    tags: ["Shipped", "Completed"],
    note: "Delivered to Pune on 12th. Review requested.",
    convo: [
      { who: "them", text: "Package received, thank you!", offsetMinutes: -7200 },
      { who: "you", text: "So glad! Please share a photo when you can", offsetMinutes: -7100 },
      { who: "them", text: "Sure, will send soon", offsetMinutes: -7050 },
    ],
  },
];

function fp(ts: number, sender: string, text: string) {
  const s = `${ts}|${sender}|${text}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `fp_${(h >>> 0).toString(16)}_${s.length}`;
}

export async function loadSampleData(): Promise<number> {
  const existing = await listCustomers();
  if (existing.length > 0) return 0;
  let created = 0;
  const now = Date.now();
  for (const s of SAMPLES) {
    const chatFp = `sample_${s.name.replace(/\s+/g, "_")}`;
    const c = await createCustomer({
      original_identity: s.phone,
      display_name: s.phone,
      custom_name: s.name,
      fingerprint: chatFp,
    });
    const msgs = s.convo.map((m) => {
      const ts = now + m.offsetMinutes * 60 * 1000;
      const sender = m.who === "you" ? "You" : s.name;
      return {
        timestamp: ts,
        sender,
        text: m.text,
        message_type: "text" as const,
        fingerprint: fp(ts, sender, m.text),
      };
    });
    await insertMessages(c.id, msgs);
    for (const tn of s.tags) {
      const t = await createTag(tn);
      await attachTag(c.id, t.id);
    }
    await addNote(c.id, s.note);
    if (s.followUpInDays) {
      await addFollowUp({
        customer_id: c.id,
        title: `Follow up with ${s.name}`,
        scheduled_at: now + s.followUpInDays * 24 * 60 * 60 * 1000,
      });
    }
    created++;
  }
  return created;
}
