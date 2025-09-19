import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Games table for storing generated games
    games: defineTable({
      userId: v.id("users"),
      title: v.string(),
      prompt: v.string(),
      parameters: v.object({
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
      isPublic: v.boolean(),
    }).index("by_user", ["userId"])
      .index("by_public", ["isPublic"]),

    // Leaderboard entries
    leaderboard: defineTable({
      userId: v.id("users"),
      gameId: v.id("games"),
      playerName: v.string(),
      score: v.number(),
      level: v.optional(v.number()),
      timeElapsed: v.optional(v.number()),
      metadata: v.optional(v.object({
        achievements: v.optional(v.array(v.string())),
        stats: v.optional(v.record(v.string(), v.number())),
      })),
    }).index("by_game", ["gameId"])
      .index("by_user", ["userId"])
      .index("by_score", ["gameId", "score"])
      .index("by_score_global", ["score"]),

    // Game sessions for tracking active games
    gameSessions: defineTable({
      userId: v.id("users"),
      gameId: v.id("games"),
      sessionId: v.string(),
      startTime: v.number(),
      endTime: v.optional(v.number()),
      currentScore: v.number(),
      isActive: v.boolean(),
    }).index("by_user", ["userId"])
      .index("by_session", ["sessionId"])
      .index("by_game", ["gameId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;