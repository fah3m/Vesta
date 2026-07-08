import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function CircleScreen() {
  const { sessionToken } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // contacts already in the user's circle (accepted or pending)
  const myContacts = useQuery(
    api.trustedContacts.listMyContacts,
    sessionToken ? { sessionToken } : "skip"
  );

  // invites sent to this user by someone else, awaiting accept
  const pendingInvites = useQuery(
    api.trustedContacts.listPendingInvites,
    sessionToken ? { sessionToken } : "skip"
  );

  const inviteContact = useMutation(api.trustedContacts.inviteContact);
  const acceptInvite = useMutation(api.trustedContacts.acceptInvite);
  const removeContact = useMutation(api.trustedContacts.removeContact);

  const handleInvite = async () => {
    if (!name.trim() || !username.trim()) {
      Alert.alert("Missing fields", "Please enter both a name and username.");
      return;
    }
    setLoading(true);
    try {
      await inviteContact({
        sessionToken: sessionToken!,
        name: name.trim(),
        username: username.trim(),
      });
      setName("");
      setUsername("");
      setShowForm(false);
      Alert.alert("Invite sent", "They'll see it when they open the app.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (contactId: any) => {
    try {
      await acceptInvite({ sessionToken: sessionToken!, contactId });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleRemove = (contactId: any, contactName: string) => {
    // confirm before removing — this can't be undone from here
    Alert.alert(
      "Remove contact",
      `Remove ${contactName} from your trusted circle?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeContact({ sessionToken: sessionToken!, contactId });
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  // wait for both queries before rendering anything
  if (myContacts === undefined || pendingInvites === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trusted Circle</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons
            name={showForm ? "close" : "person-add"}
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Their name"
            placeholderTextColor="#555"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Their username"
            placeholderTextColor="#555"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.inviteButton, loading && { opacity: 0.6 }]}
            onPress={handleInvite}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <Text style={styles.inviteButtonText}>Send Invite</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* invites someone else sent to this user */}
      {pendingInvites.map((invite) => (
        <View key={invite._id} style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {invite.senderName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.contactName}>{invite.senderName}</Text>
              <Text style={styles.contactEmail}>
                {invite.senderUsername} wants to add you
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept(invite._id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>
          My Contacts ({myContacts.length})
        </Text>

        {myContacts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={40} color="#333" />
            <Text style={styles.emptyText}>No trusted contacts yet</Text>
            <Text style={styles.emptySubtext}>
              Add people who should be alerted in an emergency
            </Text>
          </View>
        ) : (
          <FlatList
            data={myContacts}
            keyExtractor={(item) => item._id}
            scrollEnabled={false} // list is short and lives inside a non-scrolling screen
            renderItem={({ item }) => (
              <View style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactEmail}>{item.username}</Text>
                  </View>
                </View>
                <View style={styles.contactRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "accepted"
                        ? styles.statusAccepted
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.status === "accepted"
                          ? styles.statusTextAccepted
                          : styles.statusTextPending,
                      ]}
                    >
                      {item.status === "accepted" ? "Active" : "Pending"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemove(item._id, item.name)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#555" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  center: { flex: 1, backgroundColor: "#0A0A0A", justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#F0F0F0" },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 10,
  },
  input: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#F0F0F0",
    fontSize: 15,
  },
  inviteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  inviteButtonText: { color: "#0A0A0A", fontWeight: "700", fontSize: 15 },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    padding: 14,
    marginBottom: 8,
  },
  contactInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.primary, fontWeight: "700", fontSize: 16 },
  contactName: { color: "#F0F0F0", fontWeight: "600", fontSize: 14 },
  contactEmail: { color: "#555", fontSize: 12, marginTop: 2 },
  contactRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusAccepted: { backgroundColor: "#1A3A1A" },
  statusPending: { backgroundColor: "#2A2000" },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusTextAccepted: { color: "#4ADE80" },
  statusTextPending: { color: "#F59E0B" },
  removeButton: { padding: 4 },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptButtonText: { color: "#0A0A0A", fontWeight: "700", fontSize: 13 },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: { color: "#555", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#333", fontSize: 13, textAlign: "center" },
});