/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth from "../auth.js";
import type * as gameGeneration from "../gameGeneration.js";
import type * as gameSessions from "../gameSessions.js";
import type * as games from "../games.js";
import type * as generators_arcade from "../generators/arcade.js";
import type * as generators_memory from "../generators/memory.js";
import type * as generators_platformer from "../generators/platformer.js";
import type * as generators_puzzle from "../generators/puzzle.js";
import type * as generators_runner from "../generators/runner.js";
import type * as generators_shooter from "../generators/shooter.js";
import type * as generators_tictactoe from "../generators/tictactoe.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as users from "../users.js";
import type * as utils_promptAnalysis from "../utils/promptAnalysis.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "auth/emailOtp": typeof auth_emailOtp;
  auth: typeof auth;
  gameGeneration: typeof gameGeneration;
  gameSessions: typeof gameSessions;
  games: typeof games;
  "generators/arcade": typeof generators_arcade;
  "generators/memory": typeof generators_memory;
  "generators/platformer": typeof generators_platformer;
  "generators/puzzle": typeof generators_puzzle;
  "generators/runner": typeof generators_runner;
  "generators/shooter": typeof generators_shooter;
  "generators/tictactoe": typeof generators_tictactoe;
  http: typeof http;
  leaderboard: typeof leaderboard;
  users: typeof users;
  "utils/promptAnalysis": typeof utils_promptAnalysis;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
