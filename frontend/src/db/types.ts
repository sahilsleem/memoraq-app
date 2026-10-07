export type Customer = {
  id: string;
  original_identity: string;
  display_name: string;
  custom_name: string | null;
  starred: number;
  message_count: number;
  last_message_at: number | null;
  last_message_preview: string | null;
  created_at: number;
  updated_at: number;
  fingerprint: string;
};

export type Message = {
  id: string;
  customer_id: string;
  timestamp: number;
  sender: string;
  text: string;
  message_type: "text" | "image" | "video" | "audio" | "document" | "system" | "media_omitted";
  fingerprint: string;
};

export type Note = {
  id: string;
  customer_id: string;
  text: string;
  created_at: number;
  updated_at: number;
};

export type Tag = { id: string; name: string; created_at: number };

export type FollowUp = {
  id: string;
  customer_id: string;
  title: string;
  note: string | null;
  scheduled_at: number;
  completed: number;
  completed_at: number | null;
  created_at: number;
  notification_id: string | null;
};

export type Attachment = {
  id: string;
  message_id: string | null;
  customer_id: string;
  original_filename: string;
  stored_filename: string | null;
  mime_type: string | null;
  size: number | null;
  sha256: string | null;
  local_path: string | null;
  state: "AVAILABLE" | "MISSING" | "UNSUPPORTED" | "CORRUPTED";
  imported_at: number;
};

export type ActivityItem = {
  id: string;
  customer_id: string;
  kind: string;
  details: string | null;
  created_at: number;
};
