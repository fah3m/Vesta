import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Call this at the top of any authenticated mutation or query.
 * Returns the full user document, or throws if the token is invalid.
 *
 * Usage:
 *   const user = await requireUser(ctx, args.sessionToken);
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();

  if (!session) throw new Error("Not authenticated");

  const user = await ctx.db.get(session.userId);
  if (!user) throw new Error("User not found");

  return user;
}