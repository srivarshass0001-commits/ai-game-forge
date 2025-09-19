// Utilities and deterministic prompt analysis

export function hashPrompt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function pickThemeColor(theme: string): number {
  const t = theme.toLowerCase();
  if (t.includes("space")) return 0x4a90e2;
  if (t.includes("fantasy")) return 0x8e44ad;
  if (t.includes("cyber")) return 0x00ffff;
  if (t.includes("nature") || t.includes("forest")) return 0x2ecc71;
  if (t.includes("retro")) return 0xff6b6b;
  if (t.includes("ocean")) return 0x1ca3ec;
  if (t.includes("neon")) return 0x39ff14;
  if (t.includes("candy")) return 0xff69b4;
  if (t.includes("sunset")) return 0xff8c00;
  if (t.includes("pastel")) return 0xa3c4f3;
  return 0x4a90e2;
}

export function pickBackgroundColor(theme: string): number {
  const t = theme.toLowerCase();
  if (t.includes("space")) return 0xe6f0ff;
  if (t.includes("fantasy")) return 0xf3e8ff;
  if (t.includes("cyber")) return 0xeaffff;
  if (t.includes("nature") || t.includes("forest")) return 0xe8f5e9;
  if (t.includes("retro")) return 0xfff1f2;
  if (t.includes("ocean")) return 0xe0f7ff;
  if (t.includes("neon")) return 0xf7ffe0;
  if (t.includes("candy")) return 0xfff0f7;
  if (t.includes("sunset")) return 0xfff4e0;
  if (t.includes("pastel")) return 0xf7faff;
  return 0xf9fafb;
}

function difficultyScaleOf(diff: string): number {
  const d = diff.toLowerCase();
  if (d === "easy") return 0.75;
  if (d === "medium") return 1.0;
  if (d === "hard") return 1.25;
  if (d === "expert") return 1.5;
  return 1.0;
}

export function analyzePrompt(prompt: string, parameters: any) {
  const overrides = parameters?.__overrides ?? {};
  const h = hashPrompt(prompt);
  const pLower = prompt.toLowerCase();

  let difficultyScale = overrides.difficultyScale ?? difficultyScaleOf(parameters?.difficulty ?? "medium");

  if (!overrides.difficultyScale) {
    if (pLower.includes("brutal") || pLower.includes("insane") || pLower.includes("hard")) {
      difficultyScale *= 1.15;
    }
    if (pLower.includes("chill") || pLower.includes("casual") || pLower.includes("easy")) {
      difficultyScale *= 0.9;
    }
  }

  let speedFactor =
    overrides.speedFactor ??
    (0.8 + ((h % 41) / 100));
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

export function isHumanCharacterRequested(prompt: string, overrides?: { humanCharacter?: boolean }) {
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

// LLM-based analyzer (no-op for stability, ready for future OpenRouter usage)
export async function llmAnalyzePrompt(
  _prompt: string,
  _parameters: any
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
