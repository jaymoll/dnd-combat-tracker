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
      initiative: this.getFormInitiative(formCombatant, existing),
      damageDone: existing?.damageDone ?? 0,
      conditions: this.getFormConditions(formCombatant, existing),
      isDefeated: formCombatant.currentHp === 0,
      order: existing?.order ?? nextOrder,
      battleMapPosition: this.getFormBattleMapPosition(formCombatant, existing, nextOrder),
    };
  }

  getFormInitiative(formCombatant, existing) {
    if (!existing && formCombatant.type === "monster") {
      return this.rollMonsterInitiative(formCombatant);
    }

    return formCombatant.initiative;
  }

  getFormConditions(formCombatant, existing) {
    return existing?.conditions ?? normalizeConditions(formCombatant.conditions);
  }

  getFormBattleMapPosition(formCombatant, existing, nextOrder) {
    return existing?.battleMapPosition ?? createBattleMapPosition(formCombatant.type, nextOrder);
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
