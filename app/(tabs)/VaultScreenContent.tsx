import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { useState, useMemo } from "react";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

const CATEGORIES = [
  { key: "photo", label: "Photo", icon: "image-outline" },
  { key: "screenshot", label: "Screenshot", icon: "phone-portrait-outline" },
  { key: "medical", label: "Medical", icon: "medkit-outline" },
  { key: "document", label: "Document", icon: "document-outline" },
];

const FILTER_OPTIONS = [
  { key: "all", label: "All categories", icon: "apps-outline" },
  ...CATEGORIES,
];


// Sorting options available for organizing stored evidence
const SORT_OPTIONS = [
  { key: "newest", label: "Newest first", icon: "arrow-down-outline" },
  { key: "oldest", label: "Oldest first", icon: "arrow-up-outline" },
  { key: "largest", label: "Largest first", icon: "resize-outline" },
  { key: "category", label: "By category", icon: "pricetag-outline" },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatFullDate(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Small reusable dropdown: a pill button that opens a modal option list.
function DropdownButton({ icon, label, options, selectedKey, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === selectedKey);

  return (
    <>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={14} color="#888" />
        <Text style={styles.dropdownButtonText} numberOfLines={1}>
          {label}: <Text style={styles.dropdownButtonValue}>{selected?.label}</Text>
        </Text>
        <Ionicons name="chevron-down-outline" size={12} color="#666" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdownSheet}>
            <Text style={styles.dropdownSheetTitle}>{label}</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt.key);
                  setOpen(false);
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={selectedKey === opt.key ? COLORS.primary : "#888"}
                />
                <Text
                  style={[
                    styles.dropdownOptionText,
                    selectedKey === opt.key && styles.dropdownOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {selectedKey === opt.key && (
                  <Ionicons name="checkmark" size={16} color={COLORS.primary} style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function VaultScreen() {
  const { sessionToken } = useAuth();
  const [uploading, setUploading] = useState(false); 
  const [selectedCategory, setSelectedCategory] = useState("photo"); // category for the NEXT upload
  const [filterCategory, setFilterCategory] = useState("all"); // which items are shown
  const [sortBy, setSortBy] = useState("newest"); // how shown items are ordered
  const [viewerItem, setViewerItem] = useState(null); // evidence item currently open in the viewer

  const evidenceList = useQuery(
    api.evidence.listEvidence,
    sessionToken ? { sessionToken } : "skip"
  );

  const saveEvidence = useMutation(api.evidence.saveEvidence);
  const deleteEvidence = useMutation(api.evidence.deleteEvidence);

  // Filter + sort locally, without touching the raw query data
  const displayedEvidence = useMemo(() => {
    if (!evidenceList) return [];

    let list = evidenceList;
    if (filterCategory !== "all") {
      list = list.filter((item) => item.category === filterCategory);
    }

    const sorted = [...list];
    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case "largest":
        sorted.sort((a, b) => (b.fileSizeBytes ?? 0) - (a.fileSizeBytes ?? 0));
        break;
      case "category":
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "newest":
      default:
        sorted.sort((a, b) => b.timestamp - a.timestamp);
        break;
    }
    return sorted;
  }, [evidenceList, filterCategory, sortBy]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photo library to upload evidence.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);

    try {
      const { url, publicId, format, bytes } = await uploadToCloudinary(asset.uri, "image");
      const title = `${selectedCategory}_${new Date().toLocaleDateString()}`;

      await saveEvidence({
        sessionToken,
        title,
        category: selectedCategory,
        fileUrl: url,
        cloudinaryPublicId: publicId,
        fileFormat: format,
        fileSizeBytes: bytes,
      });

      Alert.alert("Uploaded", "Evidence saved to your vault.");
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to capture evidence.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);

    try {
      const { url, publicId, format, bytes } = await uploadToCloudinary(asset.uri, "image");
      const title = `photo_${new Date().toLocaleDateString()}`;

      await saveEvidence({
        sessionToken,
        title,
        category: "photo",
        fileUrl: url,
        cloudinaryPublicId: publicId,
        fileFormat: format,
        fileSizeBytes: bytes,
      });

      Alert.alert("Saved", "Photo saved to your vault.");
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (evidenceId, title, closeViewer = false) => {
    Alert.alert("Delete evidence", `Delete "${title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvidence({ sessionToken, evidenceId });
            if (closeViewer) setViewerItem(null);
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  if (evidenceList === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Evidence Vault</Text>
        <Text style={styles.subtitle}>
          {displayedEvidence.length} of {evidenceList.length} items
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <DropdownButton
          icon="filter-outline"
          label="Filter"
          options={FILTER_OPTIONS}
          selectedKey={filterCategory}
          onSelect={setFilterCategory}
        />
        <DropdownButton
          icon="swap-vertical-outline"
          label="Sort"
          options={SORT_OPTIONS}
          selectedKey={sortBy}
          onSelect={setSortBy}
        />
      </View>

      <View style={styles.uploadRow}>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && { opacity: 0.6 }]}
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && { opacity: 0.6 }]}
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Ionicons name="image-outline" size={18} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Upload category — separate from the filter above */}
      <View style={styles.categoryRow}>
        <Text style={styles.categoryRowLabel}>Uploading as:</Text>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryChip, selectedCategory === cat.key && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Ionicons
              name={cat.icon}
              size={14}
              color={selectedCategory === cat.key ? "#0A0A0A" : "#888"}
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.key && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {uploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.uploadingText}>Uploading to vault...</Text>
        </View>
      )}

      {displayedEvidence.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="lock-closed-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>
            {evidenceList.length === 0 ? "Vault is empty" : "No items match this filter"}
          </Text>
          <Text style={styles.emptySubtext}>
            {evidenceList.length === 0
              ? "Upload photos or documents to store evidence securely"
              : "Try a different category filter"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedEvidence}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.evidenceCard}
              activeOpacity={0.85}
              onPress={() => setViewerItem(item)}
            >
              <Image source={{ uri: item.fileUrl }} style={styles.evidenceImage} resizeMode="cover" />
              <View style={styles.evidenceInfo}>
                <Text style={styles.evidenceCategory}>{item.category}</Text>
                <Text style={styles.evidenceTime}>{timeAgo(item.timestamp)}</Text>
                {item.fileSizeBytes && (
                  <Text style={styles.evidenceSize}>{formatBytes(item.fileSizeBytes)}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item._id, item.title)}
              >
                <Ionicons name="trash-outline" size={14} color="#555" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Full-screen viewer, opened by tapping an evidence card */}
      <Modal
        visible={!!viewerItem}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerItem(null)}
      >
        <View style={styles.viewerOverlay}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity style={styles.viewerHeaderButton} onPress={() => setViewerItem(null)}>
              <Ionicons name="close" size={26} color="#F0F0F0" />
            </TouchableOpacity>
            {viewerItem && (
              <TouchableOpacity
                style={styles.viewerHeaderButton}
                onPress={() => handleDelete(viewerItem._id, viewerItem.title, true)}
              >
                <Ionicons name="trash-outline" size={22} color="#F0F0F0" />
              </TouchableOpacity>
            )}
          </View>

          {viewerItem && (
            <>
              <ScrollView
                style={styles.viewerImageScroll}
                contentContainerStyle={styles.viewerImageContainer}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
              >
                <Image
                  source={{ uri: viewerItem.fileUrl }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </ScrollView>

              <View style={styles.viewerFooter}>
                <Text style={styles.viewerTitle}>{viewerItem.title}</Text>
                <View style={styles.viewerMetaRow}>
                  <View style={styles.viewerMetaBadge}>
                    <Text style={styles.viewerMetaBadgeText}>{viewerItem.category}</Text>
                  </View>
                  <Text style={styles.viewerMetaText}>{formatFullDate(viewerItem.timestamp)}</Text>
                  {viewerItem.fileSizeBytes && (
                    <Text style={styles.viewerMetaText}>{formatBytes(viewerItem.fileSizeBytes)}</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  center: { flex: 1, backgroundColor: "#0A0A0A", justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#F0F0F0" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 4 },

  controlsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#161616",
  },
  dropdownButtonText: { color: "#888", fontSize: 12.5, fontWeight: "600", flexShrink: 1 },
  dropdownButtonValue: { color: "#DDD" },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  dropdownSheet: {
    backgroundColor: "#161616",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingVertical: 8,
  },
  dropdownSheetTitle: {
    color: "#555",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownOptionText: { color: "#CCC", fontSize: 14, fontWeight: "500" },
  dropdownOptionTextActive: { color: COLORS.primary, fontWeight: "700" },

  uploadRow: { flexDirection: "row", paddingHorizontal: 24, gap: 12, marginBottom: 12 },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 10,
    paddingVertical: 12,
  },
  uploadButtonText: { color: COLORS.primary, fontWeight: "600", fontSize: 14 },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  categoryRowLabel: { color: "#555", fontSize: 11, marginRight: 2 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#161616",
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { color: "#888", fontSize: 12, fontWeight: "600" },
  categoryChipTextActive: { color: "#0A0A0A" },

  uploadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#161616",
    borderRadius: 8,
  },
  uploadingText: { color: "#888", fontSize: 13 },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyText: { color: "#555", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#333", fontSize: 13, textAlign: "center" },
  grid: { paddingHorizontal: 24, paddingBottom: 40 },
  gridRow: { gap: 12, marginBottom: 12 },
  evidenceCard: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    overflow: "hidden",
  },
  evidenceImage: { width: "100%", height: 120 },
  evidenceInfo: { padding: 10 },
  evidenceCategory: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  evidenceTime: { color: "#888", fontSize: 11, marginTop: 2 },
  evidenceSize: { color: "#555", fontSize: 10, marginTop: 1 },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    padding: 4,
  },

  // Full-screen evidence viewer
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  viewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  viewerHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  viewerImageScroll: { flex: 1 },
  viewerImageContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: { width: "100%", height: "100%" },
  viewerFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  viewerTitle: { color: "#F0F0F0", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  viewerMetaRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  viewerMetaBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewerMetaBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewerMetaText: { color: "#888", fontSize: 12 },
});