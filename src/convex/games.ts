import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Create a new game
export const createGame = mutation({
  args: {
    title: v.string(),
    prompt: v.string(),
    parameters: v.object({
      genre: v.string(),
      difficulty: v.string(),
      theme: v.string(),
      duration: v.number(),
    }),
    gameData: v.object({
      code: v.string(),
      assets: v.array(v.object({
        name: v.string(),
        type: v.string(),
        url: v.string(),
      })),
      config: v.object({
        width: v.number(),
        height: v.number(),
        physics: v.boolean(),
      }),
    }),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated to create games");
    }

    const gameId = await ctx.db.insert("games", {
      userId: user._id,
      title: args.title,
      prompt: args.prompt,
      parameters: args.parameters,
      gameData: args.gameData,
      isPublic: args.isPublic ?? false,
    });

    return gameId;
  },
});

// Get user's games
export const getUserGames = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("games")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Get public games
export const getPublicGames = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .take(args.limit ?? 20);

    // Include user names
    const gamesWithUsers = await Promise.all(
      games.map(async (game) => {
        const user = await ctx.db.get(game.userId);
        return {
          ...game,
          userName: user?.name ?? "Anonymous",
        };
      })
    );

    return gamesWithUsers;
  },
});

// Get a specific game
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return null;
    }

    // Check if user can access this game
    const user = await getCurrentUser(ctx);
    if (!game.isPublic && (!user || game.userId !== user._id)) {
      throw new Error("Access denied");
    }

    const gameUser = await ctx.db.get(game.userId);
    return {
      ...game,
      userName: gameUser?.name ?? "Anonymous",
    };
  },
});

// Update game visibility
export const updateGameVisibility = mutation({
  args: {
    gameId: v.id("games"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const game = await ctx.db.get(args.gameId);
    if (!game || game.userId !== user._id) {
      throw new Error("Game not found or access denied");
    }

    await ctx.db.patch(args.gameId, {
      isPublic: args.isPublic,
    });
  },
});
