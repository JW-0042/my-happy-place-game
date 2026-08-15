/** Pure-logic checks for Windoors sim helpers (no browser). */
import assert from "node:assert/strict";

function normalizeKey(input) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
const XP = "FCKGW-RHQQ2-YXRKT-8TG6W-2B7Q8";
function isXpLegendaryKey(input) {
  const alnum = normalizeKey(input);
  const xp = XP.replace(/-/g, "");
  if (alnum === xp || alnum.includes(xp)) return true;
  return XP.split("-").every((block) => alnum.includes(block));
}
function nextDrainAfterUpdateRestart(level, boost, roll) {
  if (roll < 0.5) {
    return { level: Math.max(1, level - 1), boost: Math.max(0, boost - 0.015), outcome: "better" };
  }
  return { level: Math.min(3, level + 1), boost: Math.min(0.2, boost + 0.02), outcome: "worse" };
}
function applyHealThenClamp(health, heal) {
  return Math.min(100, Math.max(0, health + heal));
}

assert.equal(isXpLegendaryKey("fckgw-rhqq2-yxrkt-8tg6w-2b7q8"), true);
assert.equal(isXpLegendaryKey("FCKGWRHQQ2YXRKT8TG6W2B7Q8"), true);
assert.equal(isXpLegendaryKey("HELLO"), false);
assert.equal(nextDrainAfterUpdateRestart(3, 0, 0.1).outcome, "better");
assert.equal(nextDrainAfterUpdateRestart(3, 0, 0.1).level, 2);
assert.equal(nextDrainAfterUpdateRestart(1, 0, 0.9).outcome, "worse");
assert.equal(applyHealThenClamp(80, 24), 100);
assert.equal(applyHealThenClamp(10, 24), 34);
console.log("windoors-selftest ok");
