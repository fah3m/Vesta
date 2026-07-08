import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireUser } from "./_helpers";

export const startCheckIn = mutation({
  args: {
    sessionToken: v.string(),
    label: v.string(),
    durationSeconds: v.number(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const now = Date.now();
    const expiresAt = now + args.durationSeconds * 1000;

    const checkInId = await ctx.db.insert("checkIns", {
      userId: user._id,
      label: args.label,
      durationSeconds: args.durationSeconds,
      startedAt: now,
      expiresAt,
      status: "active",
      latitude: args.latitude,
      longitude: args.longitude,
    });

    const scheduledFnId = await ctx.scheduler.runAt(
      expiresAt,
      internal.checkIns.handleExpiry,
      { checkInId }
    );

    await ctx.db.patch(checkInId, { scheduledFnId });

    await ctx.db.insert("timelineEvents", {
      userId: user._id,
      type: "checkin_started",
      description: `Check-in started: "${args.label}"`,
      relatedId: checkInId,
      timestamp: now,
    });

    return checkInId;
  },
});

export const updateCheckInLocation = mutation({
  args: {
    sessionToken: v.string(),
    checkInId: v.id("checkIns"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn || checkIn.userId !== user._id) throw new Error("Not found");
    if (checkIn.status !== "active") return; // no-op if already cancelled/expired

    await ctx.db.patch(args.checkInId, {
      latitude: args.latitude,
      longitude: args.longitude,
    });
  },
});

export const cancelCheckIn = mutation({
  args: {
    sessionToken: v.string(),
    checkInId: v.id("checkIns"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn || checkIn.userId !== user._id) throw new Error("Not found");

    if (checkIn.scheduledFnId) {
      await ctx.scheduler.cancel(checkIn.scheduledFnId);
    }

    await ctx.db.patch(args.checkInId, { status: "cancelled" });

    await ctx.db.insert("timelineEvents", {
      userId: user._id,
      type: "checkin_cancelled",
      description: `Check-in cancelled: "${checkIn.label}"`,
      relatedId: args.checkInId,
      timestamp: Date.now(),
    });
  },
});

export const getActive = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    return await ctx.db
      .query("checkIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

export const getLatest = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    return await ctx.db
      .query("checkIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});

export const handleExpiry = internalMutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, { checkInId }) => {
    const checkIn = await ctx.db.get(checkInId);
    if (!checkIn || checkIn.status !== "active") return;

    await ctx.db.patch(checkInId, { status: "expired" });

    await ctx.db.insert("timelineEvents", {
      userId: checkIn.userId,
      type: "checkin_expired",
      description: `Check-in expired: "${checkIn.label}" — SOS triggered`,
      relatedId: checkInId,
      timestamp: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.sos.triggerAlert, {
      userId: checkIn.userId,
      checkInId,
      latitude: checkIn.latitude,
      longitude: checkIn.longitude,
    });
  },
});

export const extendCheckIn = mutation({
  args: {
    sessionToken: v.string(),
    checkInId: v.id("checkIns"),
    extraSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn || checkIn.userId !== user._id) throw new Error("Not found");
    if (checkIn.status !== "active") throw new Error("Check-in is not active");

    if (checkIn.scheduledFnId) {
      await ctx.scheduler.cancel(checkIn.scheduledFnId);
    }

    const newExpiresAt = checkIn.expiresAt + args.extraSeconds * 1000;

    const scheduledFnId = await ctx.scheduler.runAt(
      newExpiresAt,
      internal.checkIns.handleExpiry,
      { checkInId: args.checkInId }
    );

    await ctx.db.patch(args.checkInId, {
      expiresAt: newExpiresAt,
      scheduledFnId,
    });
  },
});