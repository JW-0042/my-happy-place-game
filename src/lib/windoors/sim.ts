import { XP_LEGENDARY_KEY } from "@/lib/windoors/config";
import type { DrainLevel } from "@/lib/windoors/types";

export function normalizeKey(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isXpLegendaryKey(input: string) {
  const alnum = normalizeKey(input);
  const xp = XP_LEGENDARY_KEY.replace(/-/g, "");
  if (alnum === xp || alnum.includes(xp)) return true;
  return XP_LEGENDARY_KEY.split("-").every((block) => alnum.includes(block));
}

export function nextDrainAfterUpdateRestart(
  level: DrainLevel,
  boost: number,
  roll: number,
): { level: DrainLevel; boost: number; outcome: "better" | "worse" } {
  if (roll < 0.5) {
    const next = Math.max(1, level - 1) as DrainLevel;
    return { level: next, boost: Math.max(0, boost - 0.015), outcome: "better" };
  }
  const next = Math.min(3, level + 1) as DrainLevel;
  return { level: next, boost: Math.min(0.2, boost + 0.02), outcome: "worse" };
}

export function applyHealThenClamp(health: number, heal: number) {
  return Math.min(100, Math.max(0, health + heal));
}
