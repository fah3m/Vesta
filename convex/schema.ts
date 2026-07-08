import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
  name: v.string(),
  username: v.string(),        
  passwordHash: v.string(),
  pushToken: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_username", ["username"]),  

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  trustedContacts: defineTable({
  ownerId: v.id("users"),
  contactUserId: v.optional(v.id("users")),
  username: v.string(),       
  name: v.string(),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  invitedAt: v.number(),
}).index("by_owner", ["ownerId"]),

  evidence: defineTable({
    userId: v.id("users"),
    title: v.string(),
    category: v.union(
      v.literal("photo"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("screenshot"),
      v.literal("medical"),
      v.literal("document")
    ),
    fileUrl: v.string(),
    cloudinaryPublicId: v.string(),
    fileFormat: v.optional(v.string()),
    fileSizeBytes: v.optional(v.number()),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),

checkIns: defineTable({
  userId: v.id("users"),
  label: v.string(),
  durationSeconds: v.number(),
  startedAt: v.number(),
  expiresAt: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("cancelled"),
    v.literal("expired")
  ),
  scheduledFnId: v.optional(v.id("_scheduled_functions")),
  latitude: v.optional(v.number()),  
  longitude: v.optional(v.number()), 
}).index("by_user", ["userId"]),

  sosAlerts: defineTable({
    userId: v.id("users"),
    checkInId: v.optional(v.id("checkIns")),
    triggeredAt: v.number(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    batteryPercent: v.optional(v.number()),
    message: v.string(),
    notifiedContacts: v.array(v.id("users")),
    dismissedBy: v.optional(v.array(v.id("users"))),
  }).index("by_user", ["userId"]),

  timelineEvents: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("evidence_uploaded"),
      v.literal("contact_added"),
      v.literal("checkin_started"),
      v.literal("checkin_cancelled"),
      v.literal("checkin_expired"),
      v.literal("sos_triggered")
    ),
    description: v.string(),
    relatedId: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user_time", ["userId", "timestamp"]),
});