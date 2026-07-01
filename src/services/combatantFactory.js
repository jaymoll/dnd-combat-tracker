import { parseInteger, rollInclusive } from "../utils.js";

export class CombatantFactory {
  createId(order) {
    return `combatant-${Date.now()}-${order}`;
  }

  rollMonsterInitiative(creature) {
    return rollInclusive(1, 20) + creature.initiativeBonus;
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
      isDefeated: formCombatant.currentHp === 0,
      order: existing?.order ?? nextOrder,
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
      initiativeBonus: entry.initiativeBonus,
      toHit: entry.toHit,
      damageMin: entry.damageMin,
      damageMax: entry.damageMax,
      damageBonus: entry.damageBonus,
      damageDone: 0,
      isDefeated: entry.currentHp === 0,
      order: nextOrder,
    };
  }
}
