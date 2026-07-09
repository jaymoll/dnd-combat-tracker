import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BattleMapGeometry } from "../src/controllers/BattleMapGeometry.js";
import { QuickAccessController } from "../src/controllers/QuickAccessController.js";
import { TurnController } from "../src/controllers/TurnController.js";
import {
  DEFAULT_SPELL_AREA_RADIUS_FEET,
  createSpellEntry,
  normalizeSpell,
} from "../src/models.js";

const idFactory = (type, index = 0) => `${type}-${index}`;

const createCombatant = (overrides) => ({
  id: "combatant",
  name: "Combatant",
  type: "monster",
  initiative: 10,
  order: 0,
  currentHp: 20,
  maxHp: 20,
  armorClass: 10,
  attacksPerTurn: 1,
  damageDone: 0,
  isDefeated: false,
  battleMapPosition: { x: 0, y: 0 },
  weapons: [],
  spells: [],
  statBlock: { intelligence: 14, spellcastingAbility: "intelligence" },
  ...overrides,
});

describe("area spells", () => {
  it("normalizes and stores area spell targeting", () => {
    const spell = normalizeSpell(
      { name: "Burst", targetType: "area", areaRadiusFeet: 15 },
      idFactory,
    );

    assert.equal(spell.targetType, "area");
    assert.equal(spell.areaRadiusFeet, 15);
    assert.equal(createSpellEntry(spell).targetType, "area");
    assert.equal(createSpellEntry(spell).areaRadiusFeet, 15);
  });

  it("keeps older spells as single-target attacks", () => {
    const spell = normalizeSpell({ name: "Ray" }, idFactory);

    assert.equal(spell.targetType, "attack");
    assert.equal(spell.areaRadiusFeet, 0);
    assert.equal(DEFAULT_SPELL_AREA_RADIUS_FEET, 10);
  });

  it("selects the target tile on square and hex maps", () => {
    const geometry = new BattleMapGeometry();

    assert.deepEqual(
      geometry.getCellFromPoint({ gridType: "square", width: 10, height: 10 }, { x: 61, y: 85 }),
      { x: 1, y: 1 },
    );
    assert.deepEqual(
      geometry.getCellFromPoint({ gridType: "hex", width: 10, height: 10 }, { x: 61, y: 85 }),
      { x: 1, y: 1 },
    );
  });

  it("damages combatants inside the selected area and leaves outside combatants alone", () => {
    const state = {
      combatants: [
        createCombatant({
          id: "caster",
          name: "Mage",
          initiative: 20,
          battleMapPosition: { x: 0, y: 0 },
          spells: [
            {
              name: "Burst",
              targetType: "area",
              rangeFeet: 60,
              areaRadiusFeet: 5,
              damageMin: 4,
              damageMax: 4,
              damageBonus: 1,
            },
          ],
        }),
        createCombatant({
          id: "inside",
          name: "Inside",
          type: "character",
          initiative: 10,
          battleMapPosition: { x: 2, y: 2 },
          statBlock: null,
        }),
        createCombatant({
          id: "outside",
          name: "Outside",
          type: "character",
          initiative: 5,
          battleMapPosition: { x: 7, y: 7 },
          statBlock: null,
        }),
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
    };
    const geometry = new BattleMapGeometry();
    const result = new TurnController(geometry).castAreaSpell(state, 0, { x: 2, y: 2 });

    assert.match(result.message, /Inside \(5\)/);
    assert.equal(state.combatants[0].currentHp, 20);
    assert.equal(state.combatants[1].currentHp, 15);
    assert.equal(state.combatants[2].currentHp, 20);
  });

  it("enriches saved creature spell copies from the spell library", () => {
    const controller = new QuickAccessController(null, { storageStatus: { textContent: "" } });
    const library = controller.normalizeLibrary({
      spell: [
        {
          name: "Burst",
          targetType: "area",
          areaRadiusFeet: 20,
          rangeFeet: 60,
          damageMin: 2,
          damageMax: 12,
          damageBonus: 0,
        },
      ],
      monster: [
        {
          name: "Shaman",
          maxHp: 12,
          currentHp: 12,
          armorClass: 12,
          attacksPerTurn: 1,
          spells: [
            {
              name: "Burst",
              rangeFeet: 60,
              damageMin: 2,
              damageMax: 12,
              damageBonus: 0,
            },
          ],
          weapons: [],
        },
      ],
      character: [],
      weapon: [],
    });

    assert.equal(library.monster[0].spells[0].targetType, "area");
    assert.equal(library.monster[0].spells[0].areaRadiusFeet, 20);
  });
});
