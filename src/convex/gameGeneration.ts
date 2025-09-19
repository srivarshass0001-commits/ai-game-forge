"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { } from "./utils/promptAnalysis";
import { generatePlatformerGame } from "./generators/platformer";
import { generateShooterGame } from "./generators/shooter";
import { generatePuzzleGame } from "./generators/puzzle";
import { generateTicTacToeGame } from "./generators/tictactoe";
import { generateMemoryGame } from "./generators/memory";
import { generateArcadeGame } from "./generators/arcade";
import { generateRunnerGame } from "./generators/runner";

// Add: prompt analysis utilities for deterministic, prompt-driven tuning
function hashPrompt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type ThemeKey = "space" | "fantasy" | "cyberpunk" | "nature" | "retro" | "default";

function pickThemeColor(theme: string): number {
  const t = theme.toLowerCase();
  if (t.includes("space")) return 0x4a90e2;      // blue
  if (t.includes("fantasy")) return 0x8e44ad;    // purple
  if (t.includes("cyber")) return 0x00ffff;      // cyan
  if (t.includes("nature") || t.includes("forest")) return 0x2ecc71;     // green
  if (t.includes("retro")) return 0xff6b6b;      // red
  // New creative themes
  if (t.includes("ocean")) return 0x1ca3ec;      // ocean blue
  if (t.includes("neon")) return 0x39ff14;       // bright neon green
  if (t.includes("candy")) return 0xff69b4;      // hot pink
  if (t.includes("sunset")) return 0xff8c00;     // deep orange
  if (t.includes("pastel")) return 0xa3c4f3;     // soft pastel blue
  return 0x4a90e2;
}

function pickBackgroundColor(theme: string): number {
  const t = theme.toLowerCase();
  if (t.includes("space")) return 0xe6f0ff;     // pale sky blue
  if (t.includes("fantasy")) return 0xf3e8ff;   // light lavender
  if (t.includes("cyber")) return 0xeaffff;     // soft cyan
  if (t.includes("nature") || t.includes("forest")) return 0xe8f5e9; // minty green
  if (t.includes("retro")) return 0xfff1f2;     // soft pink
  if (t.includes("ocean")) return 0xe0f7ff;     // sea foam
  if (t.includes("neon")) return 0xf7ffe0;      // lime wash
  if (t.includes("candy")) return 0xfff0f7;     // candy floss
  if (t.includes("sunset")) return 0xfff4e0;    // warm peach
  if (t.includes("pastel")) return 0xf7faff;    // pastel blue-white
  return 0xf9fafb; // default: near-white
}

function difficultyScaleOf(diff: string): number {
  const d = diff.toLowerCase();
  if (d === "easy") return 0.75;
  if (d === "medium") return 1.0;
  if (d === "hard") return 1.25;
  if (d === "expert") return 1.5;
  return 1.0;
}

// Add: allow analyzer overrides from an LLM classifier
function analyzePrompt(prompt: string, parameters: any) {
  const overrides = parameters?.__overrides ?? {};
  const h = hashPrompt(prompt);
  const pLower = prompt.toLowerCase();

  // Base factors from difficulty (allow override)
  let difficultyScale = overrides.difficultyScale ?? difficultyScaleOf(parameters?.difficulty ?? "medium");

  // Prompt hints
  if (!overrides.difficultyScale) {
    if (pLower.includes("brutal") || pLower.includes("insane") || pLower.includes("hard")) {
      difficultyScale *= 1.15;
    }
    if (pLower.includes("chill") || pLower.includes("casual") || pLower.includes("easy")) {
      difficultyScale *= 0.9;
    }
  }

  // Speed & density (allow override)
  let speedFactor =
    overrides.speedFactor ??
    (0.8 + ((h % 41) / 100)); // 0.8 - 1.21 range
  let densityFactor =
    overrides.densityFactor ??
    (0.8 + (((Math.floor(h / 7)) % 41) / 100));

  if (overrides.speedFactor == null) {
    if (pLower.includes("fast") || pLower.includes("speed") || pLower.includes("rapid")) speedFactor *= 1.15;
    if (pLower.includes("slow") || pLower.includes("relax")) speedFactor *= 0.9;
  }
  if (overrides.densityFactor == null) {
    if (pLower.includes("many") || pLower.includes("tons") || pLower.includes("swarm")) densityFactor *= 1.2;
    if (pLower.includes("few") || pLower.includes("minimal")) densityFactor *= 0.85;
  }

  speedFactor = clamp(speedFactor, 0.6, 1.6);
  densityFactor = clamp(densityFactor, 0.6, 1.6);

  // Theme from overrides -> parameters -> prompt
  const themeText = overrides.theme ?? parameters?.theme ?? "";
  const themeFromPrompt =
    themeText ||
    (pLower.includes("space") ? "space" :
     pLower.includes("forest") || pLower.includes("nature") ? "nature" :
     pLower.includes("retro") ? "retro" :
     pLower.includes("fantasy") ? "fantasy" :
     pLower.includes("cyber") ? "cyberpunk" : "");

  const mainColor = pickThemeColor(themeFromPrompt);
  const bgColor = pickBackgroundColor(themeFromPrompt);

  // Duration can map to level length/density slightly
  const duration = clamp(parameters?.duration ?? 5, 1, 15);
  const durationFactor = clamp(0.9 + (duration - 5) * 0.03, 0.7, 1.3);

  return {
    difficultyScale,
    speedFactor,
    densityFactor: clamp(densityFactor * durationFactor, 0.6, 1.8),
    mainColor,
    theme: themeFromPrompt || "default",
    bgColor,
  };
}

// Augment: consider overrides for human character request
function isHumanCharacterRequested(prompt: string, overrides?: { humanCharacter?: boolean }) {
  if (overrides && typeof overrides.humanCharacter === "boolean") return overrides.humanCharacter;
  const p = prompt.toLowerCase();
  return (
    p.includes("human") ||
    p.includes("boy") ||
    p.includes("girl") ||
    p.includes("man") ||
    p.includes("woman") ||
    p.includes("kid") ||
    p.includes("runner human") ||
    p.includes("person")
  );
}

/**
 * Temporarily disable external LLM parsing to ensure build stability.
 * Deterministic analyzer will be used instead. We can re-enable a robust parser later.
 */
async function llmAnalyzePrompt(
  prompt: string,
  parameters: any
): Promise<{
  gameType?: "runner" | "platformer" | "shooter" | "puzzle" | "arcade" | "tictactoe";
  humanCharacter?: boolean;
  theme?: string;
  speedFactor?: number;
  densityFactor?: number;
  difficultyScale?: number;
} | null> {
  return null;
}

// Mock AI game generation - in a real app, this would call OpenAI/Claude
export const generateGame = action({
  args: {
    prompt: v.string(),
    parameters: v.object({
      difficulty: v.string(),
      theme: v.string(),
      duration: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const p = args.prompt.toLowerCase();
    const isTicTacToe =
      p.includes("tic tac toe") ||
      p.includes("tictactoe") ||
      p.includes("tic-tac-toe") ||
      p.includes("noughts and crosses") ||
      p.includes("x and o") ||
      p.includes("x&o");

    if (isTicTacToe) {
      return generateTicTacToeGame(args.prompt, args.parameters);
    }

    // Add runner detection
    const isRunner =
      p.includes("runner") ||
      p.includes("endless runner") ||
      p.includes("running") ||
      p.includes("dash");

    if (isRunner) {
      return generateRunnerGame(args.prompt, args.parameters);
    }

    // Infer game type from keywords
    const keywords = {
      platformer: ["platform", "jump", "platformer"],
      shooter: ["shoot", "shooter", "laser", "bullet", "space invaders"],
      puzzle: ["puzzle", "slide", "logic", "match"],
      arcade: ["arcade", "brick", "breakout", "pong", "ball"],
    };

    const matches = (list: string[]) => list.some(k => p.includes(k));
    let generator = generateArcadeGame;
    if (matches(keywords.platformer)) generator = generatePlatformerGame;
    else if (matches(keywords.shooter)) generator = generateShooterGame;
    else if (matches(keywords.puzzle)) generator = generatePuzzleGame;

    const gameData = generator(args.prompt, args.parameters);
    return gameData;
  },
});