import { createBattleMapPosition, getAbilityModifier, normalizeConditions } from "../models.js";
import { parseInteger, rollInclusive } from "../utils.js";

export class CombatantFactory {
  createId(order) {
    return `combatant-${Date.now()}-${order}`;
  }

  rollMonsterInitiative(creature) {
    return rollInclusive(1, 20) + getAbilityModifier(creature.statBlock?.dexterity ?? 10);
  }

  createFromForm(formCombatant, { id, existing, nextOrder }) {
    return {
      id: id || this.createId(nextOrder),
      ...formCombatant,
      initiative:
        !existing && formCombatant.type === "monster"
          ? this.rollMonsterInitiative(formCombatant)
          : formCombatant.initiative,
      damageDone: existing?.damageDone ?? 0,
      conditions: existing?.conditions ?? normalizeConditions(formCombatant.conditions),
      isDefeated: formCombatant.currentHp === 0,
      order: existing?.order ?? nextOrder,
      battleMapPosition: existing?.battleMapPosition ?? createBattleMapPosition(formCombatant.type, nextOrder),
    };
  }

  createFromQuickAccess(entry, { initiative, nextOrder }) {
    return {
      id: this.createId(nextOrder),
      name: entry.name,
      type: entry.type,
      maxHp: entry.maxHp,
      currentHp: entry.currentHp,
      initiative: entry.type === "monster" ? initiative : parseInteger(initiative),
      armorClass: entry.armorClass,
      attacksPerTurn: entry.attacksPerTurn,
      movementFeet: entry.movementFeet,
      statBlock: entry.statBlock,
      weapons: entry.weapons ?? [],
      spells: entry.spells ?? [],
      damageDone: 0,
      conditions: [],
      isDefeated: entry.currentHp === 0,
      order: nextOrder,
      battleMapPosition: createBattleMapPosition(entry.type, nextOrder),
    };
  }
}
