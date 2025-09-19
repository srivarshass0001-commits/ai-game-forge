import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Submit a score to the leaderboard
export const submitScore = mutation({
  args: {
    gameId: v.id("games"),
    score: v.number(),
    level: v.optional(v.number()),
    timeElapsed: v.optional(v.number()),
    metadata: v.optional(v.object({
      achievements: v.optional(v.array(v.string())),
      stats: v.optional(v.record(v.string(), v.number())),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated to submit scores");
    }

    // Verify the game exists
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const entryId = await ctx.db.insert("leaderboard", {
      userId: user._id,
      gameId: args.gameId,
      playerName: user.name ?? "Anonymous Player",
      score: args.score,
      level: args.level,
      timeElapsed: args.timeElapsed,
      metadata: args.metadata,
    });

    return entryId;
  },
});

// Get leaderboard for a specific game
export const getGameLeaderboard = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_score", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .take(args.limit ?? 10);

    return entries;
  },
});

// Get user's best scores
export const getUserBestScores = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Group by game and get best score for each
    const bestScores = new Map();
    entries.forEach((entry) => {
      const existing = bestScores.get(entry.gameId);
      if (!existing || entry.score > existing.score) {
        bestScores.set(entry.gameId, entry);
      }
    });

    return Array.from(bestScores.values());
  },
});

// Get global leaderboard (top scores across all games)
export const getGlobalLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboard")
      .order("desc")
      .take(args.limit ?? 20);

    // Include game titles
    const entriesWithGames = await Promise.all(
      entries.map(async (entry) => {
        const game = await ctx.db.get(entry.gameId);
        return {
          ...entry,
          gameTitle: game?.title ?? "Unknown Game",
        };
      })
    );

    return entriesWithGames;
  },
});
