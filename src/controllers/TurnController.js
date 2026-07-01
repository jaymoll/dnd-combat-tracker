import {
  activeCombatantCanAct,
  byInitiative,
  checkEncounterEnd,
  damageCombatant,
  getActiveCombatant,
  getAttackLimit,
  getNextLivingIndex,
  hasRequiredSides,
} from "../combat.js";
import { formatModifier, rollInclusive } from "../utils.js";

export class TurnController {
  prepareForRender(state) {
    state.combatants.sort(byInitiative);
    checkEncounterEnd(state);

    if (state.hasStarted && !state.isFinished) {
      const nextIndex = getNextLivingIndex(state, state.currentTurnIndex);
      if (nextIndex !== state.currentTurnIndex) {
        state.attacksUsedThisTurn = 0;
      }
      state.currentTurnIndex = nextIndex;
    }
  }

  startEncounter(state) {
    if (!hasRequiredSides(state)) return false;

    state.hasStarted = true;
    state.currentTurnIndex = getNextLivingIndex(state, 0);
    state.attacksUsedThisTurn = 0;
    return true;
  }

  nextTurn(state) {
    if (!state.hasStarted || state.isFinished) return false;

    state.currentTurnIndex = getNextLivingIndex(state, state.currentTurnIndex + 1);
    state.attacksUsedThisTurn = 0;
    return true;
  }

  applyDamage(state, targetId, requestedDamage) {
    if (!activeCombatantCanAct(state)) return null;

    const active = getActiveCombatant(state);
    const target = state.combatants.find((combatant) => combatant.id === targetId);
    if (!target || target.isDefeated) return null;

    const attacker = state.combatants.find((combatant) => combatant.id === active.id);
    const actualDamage = damageCombatant(attacker, target, requestedDamage);
    return this.finishAttack(state, active, `${active.name} dealt ${actualDamage} damage to ${target.name}.`);
  }

  rollAttack(state, targetId) {
    if (!activeCombatantCanAct(state)) return null;

    const active = getActiveCombatant(state);
    const attacker = state.combatants.find((combatant) => combatant.id === active.id);
    const target = state.combatants.find((combatant) => combatant.id === targetId);
    if (!attacker || attacker.type !== "monster" || !target || target.isDefeated) return null;

    const d20 = rollInclusive(1, 20);
    const attackTotal = d20 + attacker.toHit;

    if (attackTotal < target.armorClass) {
      return this.finishAttack(
        state,
        active,
        `${attacker.name} rolled ${d20} ${formatModifier(attacker.toHit)} = ${attackTotal}, missing ${target.name}'s AC ${target.armorClass}.`,
      );
    }

    const damageRoll = rollInclusive(attacker.damageMin, attacker.damageMax);
    const requestedDamage = Math.max(0, damageRoll + attacker.damageBonus);
    const actualDamage = damageCombatant(attacker, target, requestedDamage);

    return this.finishAttack(
      state,
      active,
      `${attacker.name} rolled ${d20} ${formatModifier(attacker.toHit)} = ${attackTotal}, hit AC ${target.armorClass}, and dealt ${actualDamage} damage (${damageRoll} ${formatModifier(attacker.damageBonus)}).`,
    );
  }

  finishAttack(state, active, message) {
    state.attacksUsedThisTurn += 1;
    checkEncounterEnd(state);

    if (!state.isFinished && state.attacksUsedThisTurn >= getAttackLimit(active)) {
      state.currentTurnIndex = getNextLivingIndex(state, state.currentTurnIndex + 1);
      state.attacksUsedThisTurn = 0;
      return {
        message: `${message} Turn ended automatically.`,
        shouldClearTarget: true,
      };
    }

    return { message, shouldClearTarget: false };
  }
}
