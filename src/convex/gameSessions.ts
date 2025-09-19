import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Start a new game session
export const startGameSession = mutation({
  args: {
    gameId: v.id("games"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    // End any existing active sessions for this user and game (use composite index, avoid filter)
    const existingSessions = await ctx.db
      .query("gameSessions")
      .withIndex("by_user_and_game_and_isActive", (q) =>
        q.eq("userId", user._id).eq("gameId", args.gameId).eq("isActive", true)
      )
      .collect();

    for (const session of existingSessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
        endTime: Date.now(),
      });
    }

    const sessionId = await ctx.db.insert("gameSessions", {
      userId: user._id,
      gameId: args.gameId,
      sessionId: args.sessionId,
      startTime: Date.now(),
      currentScore: 0,
      isActive: true,
    });

    return sessionId;
  },
});

// Update game session score
export const updateSessionScore = mutation({
  args: {
    sessionId: v.string(),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    await ctx.db.patch(session._id, {
      currentScore: args.score,
    });
  },
});

// End game session
export const endGameSession = mutation({
  args: {
    sessionId: v.string(),
    finalScore: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    await ctx.db.patch(session._id, {
      currentScore: args.finalScore,
      endTime: Date.now(),
      isActive: false,
    });

    return session;
  },
});