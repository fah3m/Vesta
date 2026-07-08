import { View, Text, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS, SPACING, RADIUS, FONT } from "@/constants/theme";

type TimelineEvent = {
  _id: string;
  type:
    | "evidence_uploaded"
    | "contact_added"
    | "checkin_started"
    | "checkin_cancelled"
    | "checkin_expired"
    | "sos_triggered";
  description: string;
  relatedId?: string;
  timestamp: number;
};

const EVENT_ICON: Record<
  TimelineEvent["type"],
  { name: keyof typeof Ionicons.glyphMap; color: string }
> = {
  evidence_uploaded: { name: "lock-closed", color: COLORS.white },
  contact_added: { name: "people", color: COLORS.white },
  checkin_started: { name: "timer-outline", color: COLORS.white },
  checkin_cancelled: { name: "checkmark-circle", color: COLORS.success },
  checkin_expired: { name: "warning", color: COLORS.warning },
  sos_triggered: { name: "alert-circle", color: COLORS.sos },
};
// Formats timestamps into a user-friendly format
// (Today, Yesterday, ---- full date)
function formatTimestamp(ts: number) {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  const isYesterday =
    date.toDateString() === new Date(now.getTime() - 86400000).toDateString();
  if (isYesterday) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

export default function TimelineScreen() {
  const { sessionToken } = useAuth();
  // fetch user timeline from backend
  const events = useQuery(
    api.timeline.listEvents,
    sessionToken ? { sessionToken } : "skip"
  ) as TimelineEvent[] | undefined;

  return (
    <View style={styles.screen}>
      <Text style={styles.header}>Timeline</Text>

      {events === undefined ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons name="time-outline" size={40} color={COLORS.muted} />
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
  
            // get the icon associated w/ the current home type
            const icon = EVENT_ICON[item.type];
            return (
              <View style={styles.row}>
                <View style={[styles.iconWrap, { borderColor: icon.color }]}>
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.description}>{item.description}</Text>
                  <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 60 },
  header: {
    color: COLORS.white,
    fontSize: 22,
    fontFamily: FONT.medium,
    fontWeight: "700",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  rowText: { flex: 1 },
  description: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONT.medium,
    fontWeight: "500",
  },
  timestamp: {
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 3,
  },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    fontFamily: FONT.regular,
    marginTop: SPACING.sm,
  },
});
