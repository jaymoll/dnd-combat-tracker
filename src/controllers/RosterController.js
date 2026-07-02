import { getConditionLabel, hasConditionImmunity, normalizeConditionValue } from "../models.js";

export class RosterController {
  constructor(combatantFactory) {
    this.combatantFactory = combatantFactory;
  }

  find(state, id) {
    return state.combatants.find((combatant) => combatant.id === id) ?? null;
  }

  upsertFromForm(state, formCombatant, id) {
    const existing = this.find(state, id);
    const combatant = this.combatantFactory.createFromForm(formCombatant, {
      id,
      existing,
      nextOrder: state.nextOrder,
    });

    if (existing) {
      state.combatants = state.combatants.map((item) => (item.id === id ? combatant : item));
      return combatant;
    }

    state.nextOrder += 1;
    state.combatants.push(combatant);
    return combatant;
  }

  addFromQuickAccess(state, entry, initiative) {
    const combatant = this.combatantFactory.createFromQuickAccess(entry, {
      initiative,
      nextOrder: state.nextOrder,
    });

    state.combatants.push(combatant);
    state.nextOrder += 1;
    return combatant;
  }

  remove(state, id) {
    const initialCount = state.combatants.length;
    state.combatants = state.combatants.filter((item) => item.id !== id);
    return state.combatants.length !== initialCount;
  }

  applyCondition(state, id, condition) {
    const combatant = this.find(state, id);
    const conditionValue = normalizeConditionValue(condition);
    if (!combatant || combatant.isDefeated || !conditionValue) return null;

    const label = getConditionLabel(conditionValue);
    const conditions = combatant.conditions ?? [];

    if (hasConditionImmunity(combatant, conditionValue)) {
      return { message: `${combatant.name} is immune to ${label}.` };
    }

    if (conditions.includes(conditionValue)) {
      return { message: `${combatant.name} already has ${label}.` };
    }

    combatant.conditions = [...conditions, conditionValue];
    return { message: `${combatant.name} gains ${label}.` };
  }

  removeCondition(state, id, condition) {
    const combatant = this.find(state, id);
    const conditionValue = normalizeConditionValue(condition);
    if (!combatant || !conditionValue) return null;

    const conditions = combatant.conditions ?? [];
    if (!conditions.includes(conditionValue)) {
      return { message: `${combatant.name} does not have ${getConditionLabel(conditionValue)}.` };
    }

    combatant.conditions = conditions.filter((item) => item !== conditionValue);
    return { message: `${combatant.name} loses ${getConditionLabel(conditionValue)}.` };
  }
}
