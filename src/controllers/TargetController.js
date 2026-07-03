import { getActiveCombatant, sortedCombatants } from "../combat.js";

export class TargetController {
  selectedId = "";

  getLivingTargets(state) {
    const active = getActiveCombatant(state);
    if (!active) return [];

    return sortedCombatants(state).filter(
      (combatant) => !combatant.isDefeated && combatant.id !== active.id,
    );
  }

  select(id, state) {
    const targets = this.getLivingTargets(state);
    if (!targets.some((combatant) => combatant.id === id)) return false;

    this.selectedId = id;
    return true;
  }

  clear() {
    this.selectedId = "";
  }
}
