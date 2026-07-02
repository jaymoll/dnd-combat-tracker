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
import { getAttackBonus } from "../models.js";
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

  rollAttack(state, targetId, weaponIndex) {
    if (!activeCombatantCanAct(state)) return null;

    const active = getActiveCombatant(state);
    const attacker = state.combatants.find((combatant) => combatant.id === active.id);
    const target = state.combatants.find((combatant) => combatant.id === targetId);
    const weapon = attacker?.weapons?.[Number(weaponIndex)];
    if (!attacker || !weapon || !target || target.isDefeated) return null;

    const d20 = rollInclusive(1, 20);
    const attackBonus = getAttackBonus(attacker, weapon.ability);
    const attackTotal = d20 + attackBonus;
    const attackLabel = `${attacker.name} attacks with ${weapon.name}`;

    if (attackTotal < target.armorClass) {
      return this.finishAttack(
        state,
        active,
        `${attackLabel}, rolling ${d20} ${formatModifier(attackBonus)} = ${attackTotal}, missing ${target.name}'s AC ${target.armorClass}.`,
      );
    }

    const damageRoll = rollInclusive(weapon.damageMin, weapon.damageMax);
    const requestedDamage = Math.max(0, damageRoll + attackBonus + weapon.damageBonus);
    const actualDamage = damageCombatant(attacker, target, requestedDamage);
    const bonusText =
      weapon.damageBonus === 0
        ? `${formatModifier(attackBonus)}`
        : `${formatModifier(attackBonus)} ${formatModifier(weapon.damageBonus)}`;

    return this.finishAttack(
      state,
      active,
      `${attackLabel}, rolling ${d20} ${formatModifier(attackBonus)} = ${attackTotal}, hit AC ${target.armorClass}, and dealt ${actualDamage} damage (${damageRoll} ${bonusText}).`,
    );
  }

  castSpell(state, targetId, spellIndex) {
    if (!activeCombatantCanAct(state)) return null;

    const active = getActiveCombatant(state);
    const attacker = state.combatants.find((combatant) => combatant.id === active.id);
    const target = state.combatants.find((combatant) => combatant.id === targetId);
    const spell = attacker?.spells?.[Number(spellIndex)];
    if (!attacker || !spell || !target || target.isDefeated) return null;

    const d20 = rollInclusive(1, 20);
    const spellAbility = attacker.statBlock?.spellcastingAbility ?? "intelligence";
    const attackBonus = getAttackBonus(attacker, spellAbility);
    const attackTotal = d20 + attackBonus;
    const spellLabel = `${attacker.name} casts ${spell.name}`;

    if (attackTotal < target.armorClass) {
      return this.finishTurn(
        state,
        `${spellLabel}, rolling ${d20} ${formatModifier(attackBonus)} = ${attackTotal}, missing ${target.name}'s AC ${target.armorClass}.`,
      );
    }

    const damageRoll = rollInclusive(spell.damageMin, spell.damageMax);
    const requestedDamage = Math.max(0, damageRoll + spell.damageBonus);
    const actualDamage = damageCombatant(attacker, target, requestedDamage);

    return this.finishTurn(
      state,
      `${spellLabel}, rolling ${d20} ${formatModifier(attackBonus)} = ${attackTotal}, hit AC ${target.armorClass}, and dealt ${actualDamage} damage (${damageRoll} ${formatModifier(spell.damageBonus)}).`,
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

  finishTurn(state, message) {
    checkEncounterEnd(state);

    if (state.isFinished) {
      return { message, shouldClearTarget: true };
    }

    state.currentTurnIndex = getNextLivingIndex(state, state.currentTurnIndex + 1);
    state.attacksUsedThisTurn = 0;

    return {
      message: `${message} Turn ended.`,
      shouldClearTarget: true,
    };
  }
}
