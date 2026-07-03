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
import { DEFAULT_SPELL_RANGE_FEET, DEFAULT_WEAPON_RANGE_FEET, getAttackBonus } from "../models.js";
import { formatModifier, rollInclusive } from "../utils.js";
import { BattleMapGeometry } from "./BattleMapGeometry.js";

export class TurnController {
  constructor(geometry = new BattleMapGeometry()) {
    this.geometry = geometry;
  }

  prepareForRender(state) {
    state.combatants.sort(byInitiative);
    checkEncounterEnd(state);

    if (state.hasStarted && !state.isFinished) {
      const nextIndex = getNextLivingIndex(state, state.currentTurnIndex);
      if (nextIndex !== state.currentTurnIndex) {
        state.attacksUsedThisTurn = 0;
        state.movementUsedThisTurn = 0;
      }
      state.currentTurnIndex = nextIndex;
    }
  }

  startEncounter(state) {
    if (!hasRequiredSides(state)) return false;

    state.hasStarted = true;
    state.currentTurnIndex = getNextLivingIndex(state, 0);
    state.attacksUsedThisTurn = 0;
    state.movementUsedThisTurn = 0;
    return true;
  }

  nextTurn(state) {
    if (!state.hasStarted || state.isFinished) return false;

    state.currentTurnIndex = getNextLivingIndex(state, state.currentTurnIndex + 1);
    state.attacksUsedThisTurn = 0;
    state.movementUsedThisTurn = 0;
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

    const context = this.getAttackContext(state, targetId);
    const weapon = context?.attacker.weapons?.[Number(weaponIndex)];
    if (!weapon) return null;

    const rangeState = this.getAttackRangeState(
      state,
      context.attacker,
      context.target,
      weapon,
      DEFAULT_WEAPON_RANGE_FEET,
    );
    if (!rangeState.canAttack) {
      return this.createOutOfRangeResult(context.attacker, context.target, weapon, rangeState);
    }

    const attackBonus = getAttackBonus(context.attacker, weapon.ability);
    const roll = this.rollToHit(attackBonus);
    const attackLabel = `${context.attacker.name} attacks with ${weapon.name}`;

    if (!this.doesAttackHit(roll, context.target)) {
      return this.finishAttack(
        state,
        context.active,
        this.createMissMessage(attackLabel, roll, context.target),
      );
    }

    const damage = this.rollDamage(context.attacker, context.target, weapon, attackBonus + weapon.damageBonus);
    const bonusText = this.formatWeaponDamageBonus(attackBonus, weapon.damageBonus);

    return this.finishAttack(
      state,
      context.active,
      this.createHitMessage(attackLabel, roll, context.target, damage, bonusText),
    );
  }

  castSpell(state, targetId, spellIndex) {
    if (!activeCombatantCanAct(state)) return null;

    const context = this.getAttackContext(state, targetId);
    const spell = context?.attacker.spells?.[Number(spellIndex)];
    if (!spell) return null;

    const rangeState = this.getAttackRangeState(
      state,
      context.attacker,
      context.target,
      spell,
      DEFAULT_SPELL_RANGE_FEET,
    );
    if (!rangeState.canAttack) {
      return this.createOutOfRangeResult(context.attacker, context.target, spell, rangeState);
    }

    const spellAbility = context.attacker.statBlock?.spellcastingAbility ?? "intelligence";
    const attackBonus = getAttackBonus(context.attacker, spellAbility);
    const roll = this.rollToHit(attackBonus);
    const spellLabel = `${context.attacker.name} casts ${spell.name}`;

    if (!this.doesAttackHit(roll, context.target)) {
      return this.finishTurn(
        state,
        this.createMissMessage(spellLabel, roll, context.target),
      );
    }

    const damage = this.rollDamage(context.attacker, context.target, spell, spell.damageBonus);

    return this.finishTurn(
      state,
      this.createHitMessage(spellLabel, roll, context.target, damage, formatModifier(spell.damageBonus)),
    );
  }

  getAttackContext(state, targetId) {
    const active = getActiveCombatant(state);
    const attacker = active ? state.combatants.find((combatant) => combatant.id === active.id) : null;
    const target = state.combatants.find((combatant) => combatant.id === targetId);

    if (!active || !attacker || !target || target.isDefeated) return null;
    return { active, attacker, target };
  }

  getAttackRangeState(state, attacker, target, attack, defaultRangeFeet = 0) {
    const rangeFeet = attack?.rangeFeet ?? defaultRangeFeet;

    if (!attacker || !target || !attack) {
      return {
        canAttack: false,
        distanceFeet: null,
        rangeFeet,
        isRangeChecked: false,
      };
    }

    if (attacker.type !== "monster") {
      return {
        canAttack: true,
        distanceFeet: null,
        rangeFeet,
        isRangeChecked: false,
      };
    }

    const distanceFeet = this.getCombatantDistanceFeet(state, attacker, target);

    return {
      canAttack: distanceFeet <= rangeFeet,
      distanceFeet,
      rangeFeet,
      isRangeChecked: true,
    };
  }

  getCombatantDistanceFeet(state, attacker, target) {
    const attackerPosition = this.geometry.clampPosition(attacker.battleMapPosition, state.battleMap);
    const targetPosition = this.geometry.clampPosition(target.battleMapPosition, state.battleMap);
    return this.geometry.getDistanceFeet(state.battleMap, attackerPosition, targetPosition);
  }

  rollToHit(bonus) {
    const d20 = rollInclusive(1, 20);
    return {
      d20,
      bonus,
      total: d20 + bonus,
    };
  }

  doesAttackHit(roll, target) {
    return roll.total >= target.armorClass;
  }

  rollDamage(attacker, target, attack, bonus) {
    const damageRoll = rollInclusive(attack.damageMin, attack.damageMax);
    const requestedDamage = Math.max(0, damageRoll + bonus);

    return {
      damageRoll,
      actualDamage: damageCombatant(attacker, target, requestedDamage),
    };
  }

  createMissMessage(label, roll, target) {
    return `${label}, rolling ${this.formatAttackRoll(roll)}, missing ${target.name}'s AC ${target.armorClass}.`;
  }

  createHitMessage(label, roll, target, damage, bonusText) {
    return `${label}, rolling ${this.formatAttackRoll(roll)}, hit AC ${target.armorClass}, and dealt ${damage.actualDamage} damage (${damage.damageRoll} ${bonusText}).`;
  }

  createOutOfRangeResult(attacker, target, attack, rangeState) {
    return {
      message: `${attacker.name} cannot use ${attack.name} on ${target.name}: target is ${rangeState.distanceFeet} ft away and range is ${rangeState.rangeFeet} ft.`,
      shouldClearTarget: false,
    };
  }

  formatAttackRoll(roll) {
    return `${roll.d20} ${formatModifier(roll.bonus)} = ${roll.total}`;
  }

  formatWeaponDamageBonus(attackBonus, weaponDamageBonus) {
    return weaponDamageBonus === 0
      ? formatModifier(attackBonus)
      : `${formatModifier(attackBonus)} ${formatModifier(weaponDamageBonus)}`;
  }

  finishAttack(state, active, message) {
    state.attacksUsedThisTurn += 1;
    checkEncounterEnd(state);

    if (!state.isFinished && state.attacksUsedThisTurn >= getAttackLimit(active)) {
      state.currentTurnIndex = getNextLivingIndex(state, state.currentTurnIndex + 1);
      state.attacksUsedThisTurn = 0;
      state.movementUsedThisTurn = 0;
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
    state.movementUsedThisTurn = 0;

    return {
      message: `${message} Turn ended.`,
      shouldClearTarget: true,
    };
  }
}
