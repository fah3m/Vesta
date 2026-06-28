import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  // Simple salt prefix — good enough for an MVP demo
  const data = encoder.encode("safepass:" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { name, email, password }) => {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) throw new Error("An account with this email already exists.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const passwordHash = await hashPassword(password);

    const userId = await ctx.db.insert("users", {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: Date.now(),
    });

    const token = generateToken();
    await ctx.db.insert("sessions", {
      userId,
      token,
      createdAt: Date.now(),
    });

    return { token, userId };
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    // Same error for both "user not found" and "wrong password" — avoids enumeration
    if (!user) throw new Error("Invalid email or password.");

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      throw new Error("Invalid email or password.");
    }

    const token = generateToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      createdAt: Date.now(),
    });

    return { token, userId: user._id };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", sessionToken))
      .first();

    if (session) await ctx.db.delete(session._id);
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getMe = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    if (!sessionToken) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", sessionToken))
      .first();

    if (!session) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    // Never return the password hash to the client
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  },
});