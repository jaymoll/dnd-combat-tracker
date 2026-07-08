import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TurnController } from "../src/controllers/TurnController.js";
import {
  getAttackAbilityModifier,
  getAttackBonus,
  getMonsterProficiencyBonus,
  normalizeMonsterStatBlock,
} from "../src/models.js";

const createAttackState = () => ({
  combatants: [
    {
      id: "monster",
      name: "Hobgoblin",
      type: "monster",
      initiative: 20,
      order: 0,
      currentHp: 11,
      maxHp: 11,
      armorClass: 18,
      attacksPerTurn: 1,
      damageDone: 0,
      isDefeated: false,
      battleMapPosition: { x: 0, y: 0 },
      statBlock: {
        strength: 16,
        dexterity: 12,
        intelligence: 10,
        proficiencyBonus: 2,
        spellcastingAbility: "intelligence",
      },
      weapons: [
        {
          name: "Longsword",
          ability: "strength",
          rangeFeet: 5,
          damageMin: 1,
          damageMax: 1,
          damageBonus: 0,
        },
      ],
      spells: [],
    },
    {
      id: "target",
      name: "Target",
      type: "character",
      initiative: 10,
      order: 1,
      currentHp: 20,
      maxHp: 20,
      armorClass: 99,
      attacksPerTurn: 1,
      damageDone: 0,
      isDefeated: false,
      battleMapPosition: { x: 1, y: 0 },
      weapons: [],
      spells: [],
    },
  ],
  hasStarted: true,
  currentTurnIndex: 0,
  attacksUsedThisTurn: 0,
  movementUsedThisTurn: 0,
  isFinished: false,
  winner: null,
  battleMap: {
    gridType: "square",
    width: 10,
    height: 10,
  },
});

describe("monster proficiency bonus", () => {
  it("normalizes explicit proficiency while keeping older monsters at +0", () => {
    assert.equal(normalizeMonsterStatBlock({}).proficiencyBonus, 0);
    assert.equal(normalizeMonsterStatBlock({ proficiency: "+3" }).proficiencyBonus, 3);
  });

  it("adds monster proficiency to attack bonuses", () => {
    const monster = {
      type: "monster",
      statBlock: {
        strength: 16,
        wisdom: 14,
        proficiencyBonus: 2,
      },
    };

    assert.equal(getMonsterProficiencyBonus(monster), 2);
    assert.equal(getAttackAbilityModifier(monster, "strength"), 3);
    assert.equal(getAttackBonus(monster, "strength"), 5);
    assert.equal(getAttackBonus(monster, "wisdom"), 4);
  });

  it("includes monster proficiency in weapon to-hit rolls", () => {
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
      const result = new TurnController().rollAttack(createAttackState(), "target", 0);

      assert.match(result.message, /1 \+5 = 6/);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("does not add monster proficiency to weapon damage", () => {
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
      const state = createAttackState();
      state.combatants[1].armorClass = 1;

      const result = new TurnController().rollAttack(state, "target", 0);

      assert.match(result.message, /dealt 4 damage \(1 \+3\)/);
      assert.equal(state.combatants[1].currentHp, 16);
    } finally {
      Math.random = originalRandom;
    }
  });
});
