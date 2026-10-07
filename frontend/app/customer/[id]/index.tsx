import FeatherIcon from "@react-native-vector-icons/feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Button, Chip, Toast } from "@/src/components/ui";
import {
  addNote,
  attachTag,
  createTag,
  deleteCustomer,
  deleteNote,
  detachTag,
  getCustomer,
  listActivity,
  listAttachments,
  listCustomerFollowUps,
  listCustomerTags,
  listMessages,
  listNotes,
  listTags,
  toggleStar,
} from "@/src/db/repo";
import type { ActivityItem, Attachment, Customer, FollowUp, Message, Note, Tag } from "@/src/db/types";
import { makeStyles, radius, spacing, type, useTheme } from "@/src/theme";

type TabKey = "conversation" | "notes" | "attachments" | "activity";

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>("conversation");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [nextFU, setNextFU] = useState<FollowUp | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const c = await getCustomer(String(id));
      if (!c) {
        router.back();
        return;
      }
      const [m, n, a, act, t, at, fus] = await Promise.all([
        listMessages(c.id),
        listNotes(c.id),
        listAttachments(c.id),
        listActivity(c.id),
        listCustomerTags(c.id),
        listTags(),
        listCustomerFollowUps(c.id),
      ]);
      setCustomer(c);
      setMessages(m);
      setNotes(n);
      setAttachments(a);
      setActivity(act);
      setTags(t);
      setAllTags(at);
      setNextFU(fus.find((f) => !f.completed) ?? null);
    } catch {
      // Database unavailable (web preview). Go back.
      router.back();
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!customer) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.muted, padding: spacing.lg }}>Loading…</Text>
      </View>
    );
  }

  const name = customer.custom_name || customer.display_name;
  const tagIdSet = new Set(tags.map((t) => t.id));

  const onToggleTag = async (t: Tag) => {
    if (tagIdSet.has(t.id)) await detachTag(customer.id, t.id);
    else await attachTag(customer.id, t.id);
    load();
  };

  const onAddNote = async () => {
    const text = noteDraft.trim();
    if (!text) return;
    await addNote(customer.id, text);
    setNoteDraft("");
    setToast("Note added");
    load();
  };

  const onStar = async () => {
    await toggleStar(customer.id);
    load();
  };

  const onDelete = () => {
    Alert.alert("Delete this customer?", "This removes the customer and all archived data from Memoraq.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCustomer(customer.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID="customer-detail-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="detail-back">
            <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={onStar} style={styles.iconBtn} testID="detail-star">
            <FeatherIcon name="star" size={18} color={customer.starred ? colors.warning : colors.muted} />
          </Pressable>
          <Pressable onPress={() => router.push(`/customer/${customer.id}/edit`)} style={styles.iconBtn} testID="detail-edit">
            <FeatherIcon name="edit-2" size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.iconBtn} testID="detail-delete">
            <FeatherIcon name="trash-2" size={18} color={colors.error} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Avatar name={name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.identity}>{customer.original_identity}</Text>
            <Text style={styles.meta}>
              {customer.message_count} messages
              {customer.last_message_at ? ` · last ${new Date(customer.last_message_at).toLocaleDateString()}` : ""}
            </Text>
          </View>
        </View>

        {nextFU ? (
          <Pressable
            onPress={() => router.push(`/customer/${customer.id}/followup`)}
            style={styles.fuBanner}
            testID="next-fu-banner"
          >
            <FeatherIcon name="bell" size={16} color={colors.onBrandTertiary} />
            <Text style={styles.fuBannerText}>
              Follow up: {nextFU.title} · {new Date(nextFU.scheduled_at).toLocaleString()}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push(`/customer/${customer.id}/followup`)}
            style={[styles.fuBanner, { backgroundColor: colors.surfaceSecondary }]}
            testID="add-fu-banner"
          >
            <FeatherIcon name="bell" size={16} color={colors.muted} />
            <Text style={[styles.fuBannerText, { color: colors.muted }]}>Schedule a follow-up</Text>
          </Pressable>
        )}

        <View style={styles.tabRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {(["conversation", "notes", "attachments", "activity"] as TabKey[]).map((k) => (
              <Chip
                key={k}
                label={k[0].toUpperCase() + k.slice(1)}
                active={tab === k}
                onPress={() => setTab(k)}
                testID={`detail-tab-${k}`}
              />
            ))}
          </ScrollView>
        </View>

        {tab === "conversation" ? (
          messages.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.muted }}>No messages archived yet</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: 6 }}
              renderItem={({ item }) => <Bubble msg={item} customerName={customer.display_name} />}
            />
          )
        ) : null}

        {tab === "notes" ? (
          <View style={{ flex: 1 }}>
            <View style={styles.tagsBlock}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <View style={styles.tagsWrap}>
                {allTags.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.name}
                    active={tagIdSet.has(t.id)}
                    onPress={() => onToggleTag(t)}
                    testID={`tag-chip-${t.name}`}
                  />
                ))}
                <Pressable
                  style={styles.addTag}
                  onPress={() =>
                    Alert.prompt?.(
                      "New tag",
                      "Give this tag a short name",
                      async (name?: string) => {
                        if (!name) return;
                        const t = await createTag(name.trim());
                        await attachTag(customer.id, t.id);
                        load();
                      },
                    )
                  }
                  testID="add-tag-button"
                >
                  <FeatherIcon name="plus" size={14} color={colors.onSurface} />
                  <Text style={{ color: colors.onSurface, fontSize: 13 }}>New</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.noteInputWrap}>
              <TextInput
                value={noteDraft}
                onChangeText={setNoteDraft}
                placeholder="Add a private note…"
                placeholderTextColor={colors.muted}
                style={styles.noteInput}
                multiline
                testID="note-input"
              />
              <Button label="Add Note" onPress={onAddNote} testID="add-note-button" />
            </View>

            <FlatList
              data={notes}
              keyExtractor={(n) => n.id}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.sm }}
              ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: "center" }}>No notes yet.</Text>}
              renderItem={({ item }) => (
                <View style={styles.noteCard}>
                  <Text style={styles.noteText}>{item.text}</Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteDate}>{new Date(item.created_at).toLocaleString()}</Text>
                    <Pressable
                      onPress={async () => {
                        await deleteNote(item.id);
                        load();
                      }}
                      testID={`delete-note-${item.id}`}
                    >
                      <FeatherIcon name="trash-2" size={14} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          </View>
        ) : null}

        {tab === "attachments" ? (
          <FlatList
            data={attachments}
            keyExtractor={(a) => a.id}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.sm }}
            ListEmptyComponent={
              <Text style={{ color: colors.muted, textAlign: "center" }}>No attachments archived.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.attRow}>
                <FeatherIcon
                  name={
                    item.mime_type?.startsWith("image/")
                      ? "image"
                      : item.mime_type?.startsWith("video/")
                        ? "film"
                        : item.mime_type?.startsWith("audio/")
                          ? "music"
                          : "file"
                  }
                  size={18}
                  color={colors.onSurfaceSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.attName}>{item.original_filename}</Text>
                  <Text style={styles.attMeta}>
                    {item.mime_type || "unknown"} · {item.state}
                  </Text>
                </View>
              </View>
            )}
          />
        ) : null}

        {tab === "activity" ? (
          <FlatList
            data={activity}
            keyExtractor={(a) => a.id}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160, gap: spacing.sm }}
            ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: "center" }}>No activity yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.actRow}>
                <View style={styles.actDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actKind}>{humanKind(item.kind)}</Text>
                  {item.details ? <Text style={styles.actDetails}>{item.details}</Text> : null}
                  <Text style={styles.actDate}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
              </View>
            )}
          />
        ) : null}
      </KeyboardAvoidingView>
      {toast ? <Toast text={toast} onDone={() => setToast(null)} /> : null}
    </View>
  );
}

function humanKind(k: string) {
  const map: Record<string, string> = {
    imported: "Customer imported",
    reimported: "Chat re-imported",
    renamed: "Customer renamed",
    note_added: "Note added",
    tag_added: "Tag applied",
    followup_scheduled: "Follow-up scheduled",
  };
  return map[k] ?? k;
}

function Bubble({ msg, customerName }: { msg: Message; customerName: string }) {
  const styles = useBubble();
  const isYou = /^you$/i.test(msg.sender);
  const isSystem = msg.message_type === "system";
  if (isSystem) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.system}>{msg.text}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.row, { alignItems: isYou ? "flex-end" : "flex-start" }]}>
      <Text style={styles.meta}>
        {msg.sender} · {new Date(msg.timestamp).toLocaleString()}
      </Text>
      <View style={[styles.bubble, isYou ? styles.out : styles.in]}>
        {msg.message_type !== "text" ? (
          <Text style={styles.mediaTag}>[{msg.message_type}]</Text>
        ) : null}
        <Text style={isYou ? styles.textOut : styles.textIn}>{msg.text}</Text>
      </View>
    </View>
  );
}

const useBubble = makeStyles((c) => ({
  row: { flexDirection: "column", gap: 2, marginVertical: 4, maxWidth: "100%" },
  meta: { ...type.caption, color: c.muted, fontSize: 10 },
  bubble: { padding: 10, borderRadius: radius.lg, maxWidth: "82%" },
  in: { backgroundColor: c.surfaceSecondary },
  out: { backgroundColor: c.brandTertiary },
  textIn: { color: c.onSurfaceSecondary, fontSize: 14 },
  textOut: { color: c.onBrandTertiary, fontSize: 14 },
  mediaTag: { ...type.caption, color: c.muted, marginBottom: 2 },
  systemWrap: { alignItems: "center", marginVertical: 6 },
  system: { ...type.caption, color: c.muted, backgroundColor: c.surfaceTertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
}));

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  name: { ...type.title, color: c.onSurfaceSecondary, fontSize: 20 },
  identity: { ...type.body, color: c.muted, marginTop: 2 },
  meta: { ...type.caption, color: c.muted, marginTop: 4 },
  fuBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: c.brandTertiary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fuBannerText: { ...type.body, color: c.onBrandTertiary, fontSize: 13, flex: 1 },
  tabRowWrap: { height: 56, justifyContent: "center" },
  tabRow: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  sectionLabel: { ...type.caption, color: c.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  tagsBlock: { paddingHorizontal: spacing.lg },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  addTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  noteInputWrap: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteInput: {
    minHeight: 70,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: c.onSurfaceSecondary,
    fontSize: 14,
    textAlignVertical: "top",
  },
  noteCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  noteText: { ...type.body, color: c.onSurfaceSecondary },
  noteFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  noteDate: { ...type.caption, color: c.muted },
  attRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  attName: { ...type.bodyStrong, color: c.onSurfaceSecondary, fontSize: 14 },
  attMeta: { ...type.caption, color: c.muted, marginTop: 2 },
  actRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  actDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.brandPrimary, marginTop: 6 },
  actKind: { ...type.bodyStrong, color: c.onSurface, fontSize: 14 },
  actDetails: { ...type.caption, color: c.onSurfaceSecondary, marginTop: 2 },
  actDate: { ...type.caption, color: c.muted, marginTop: 2 },
}));
