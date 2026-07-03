import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateEncounterDifficulty,
  calculateMonsterXp,
  calculatePartyThresholds,
  determineFinalDifficulty,
  getEncounterMultiplier,
  getXpByCr,
} from "../src/encounterDifficulty.js";

describe("encounter difficulty helpers", () => {
  it("looks up XP for integer, fractional, and decimal challenge ratings", () => {
    assert.equal(getXpByCr("0"), 10);
    assert.equal(getXpByCr("1/4"), 50);
    assert.equal(getXpByCr("0.5"), 100);
    assert.equal(getXpByCr("CR 5"), 1800);
    assert.equal(getXpByCr("unknown"), null);
  });

  it("sums player thresholds for mixed-level parties", () => {
    assert.deepEqual(calculatePartyThresholds([1, 1, 3]), {
      easy: 125,
      medium: 250,
      hard: 375,
      deadly: 600,
    });
  });

  it("applies the monster count multiplier to valid monsters only", () => {
    assert.deepEqual(calculateMonsterXp([
      { name: "Goblin", challengeRating: "1/4", quantity: 4 },
      { name: "Broken", challengeRating: "?", quantity: 1 },
    ]), {
      baseXp: 200,
      monsterCount: 4,
      invalidMonsters: [{ name: "Broken", challengeRating: "?", quantity: 1 }],
      multiplier: 2,
      adjustedXp: 400,
    });
  });

  it("uses the D&D 5e encounter multipliers", () => {
    assert.equal(getEncounterMultiplier(0), 0);
    assert.equal(getEncounterMultiplier(1), 1);
    assert.equal(getEncounterMultiplier(2), 1.5);
    assert.equal(getEncounterMultiplier(6), 2);
    assert.equal(getEncounterMultiplier(10), 2.5);
    assert.equal(getEncounterMultiplier(14), 3);
    assert.equal(getEncounterMultiplier(15), 4);
  });

  it("determines the final difficulty from adjusted XP and party thresholds", () => {
    const thresholds = { easy: 100, medium: 200, hard: 300, deadly: 400 };

    assert.equal(determineFinalDifficulty(99, thresholds), "Trivial");
    assert.equal(determineFinalDifficulty(100, thresholds), "Easy");
    assert.equal(determineFinalDifficulty(200, thresholds), "Medium");
    assert.equal(determineFinalDifficulty(300, thresholds), "Hard");
    assert.equal(determineFinalDifficulty(400, thresholds), "Deadly");
  });

  it("calculates a complete encounter result", () => {
    const result = calculateEncounterDifficulty({
      partyLevels: [1, 1, 1, 1],
      monsters: [{ name: "Ghoul", challengeRating: "1", quantity: 1 }],
    });

    assert.equal(result.baseXp, 200);
    assert.equal(result.multiplier, 1);
    assert.equal(result.adjustedXp, 200);
    assert.equal(result.difficulty, "Medium");
  });
});
