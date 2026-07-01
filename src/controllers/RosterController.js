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
}
