import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TurnController } from "../src/controllers/TurnController.js";
import {
  DEFAULT_SPELL_RANGE_FEET,
  DEFAULT_WEAPON_RANGE_FEET,
  createSpellEntry,
  createWeaponEntry,
  normalizeSpell,
  normalizeWeapon,
} from "../src/models.js";

const idFactory = (type, index = 0) => `${type}-${index}`;

const createState = ({ activeType = "monster", attackRange = 5, targetX = 4 } = {}) => {
  const active = {
    id: "active",
    name: activeType === "monster" ? "Ogre" : "Fighter",
    type: activeType,
    initiative: 20,
    order: 0,
    currentHp: 30,
    maxHp: 30,
    armorClass: 12,
    attacksPerTurn: 1,
    damageDone: 0,
    isDefeated: false,
    battleMapPosition: { x: 0, y: 0 },
    statBlock: activeType === "monster" ? { strength: 16, dexterity: 10, spellcastingAbility: "intelligence" } : null,
    weapons: [
      {
        name: "Club",
        ability: "strength",
        rangeFeet: attackRange,
        damageMin: 1,
        damageMax: 1,
        damageBonus: 0,
      },
    ],
    spells: [],
  };
  const target = {
    id: "target",
    name: "Target",
    type: activeType === "monster" ? "character" : "monster",
    initiative: 10,
    order: 1,
    currentHp: 20,
    maxHp: 20,
    armorClass: 10,
    attacksPerTurn: 1,
    damageDone: 0,
    isDefeated: false,
    battleMapPosition: { x: targetX, y: 0 },
    weapons: [],
    spells: [],
  };

  return {
    combatants: [active, target],
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
  };
};

describe("attack ranges", () => {
  it("normalizes and stores explicit spell and weapon ranges", () => {
    const spell = normalizeSpell({ name: "Ray", rangeFeet: 120 }, idFactory);
    const weapon = normalizeWeapon({ name: "Spear", ability: "strength", rangeFeet: 20 }, idFactory);

    assert.equal(spell.rangeFeet, 120);
    assert.equal(weapon.rangeFeet, 20);
    assert.equal(createSpellEntry(spell).rangeFeet, 120);
    assert.equal(createWeaponEntry(weapon).rangeFeet, 20);
  });

  it("adds default ranges to older saved spell and weapon entries", () => {
    assert.equal(normalizeSpell({ name: "Old Spell" }, idFactory).rangeFeet, DEFAULT_SPELL_RANGE_FEET);
    assert.equal(normalizeWeapon({ name: "Old Weapon" }, idFactory).rangeFeet, DEFAULT_WEAPON_RANGE_FEET);
  });

  it("blocks monster attacks when the target is beyond the selected attack range", () => {
    const state = createState({ activeType: "monster", attackRange: 15, targetX: 4 });
    const result = new TurnController().rollAttack(state, "target", 0);

    assert.match(result.message, /range is 15 ft/);
    assert.equal(state.attacksUsedThisTurn, 0);
    assert.equal(state.combatants[1].currentHp, 20);
  });

  it("does not range-limit character attacks", () => {
    const state = createState({ activeType: "character", attackRange: 5, targetX: 8 });
    const rangeState = new TurnController().getAttackRangeState(
      state,
      state.combatants[0],
      state.combatants[1],
      state.combatants[0].weapons[0],
    );

    assert.equal(rangeState.canAttack, true);
    assert.equal(rangeState.isRangeChecked, false);
  });
});
