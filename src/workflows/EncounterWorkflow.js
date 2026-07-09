import { activeCombatantCanAct, getActiveCombatant, sortedCombatants } from "../combat.js";
import { createInitialState, isAreaSpell } from "../models.js";
import { clampNumber } from "../utils.js";

export class EncounterWorkflow {
  constructor({
    elements,
    formController,
    rosterController,
    targetController,
    turnController,
    battleMapController = null,
    screenController = null,
    getState,
    setState,
    render,
  }) {
    this.elements = elements;
    this.formController = formController;
    this.rosterController = rosterController;
    this.targetController = targetController;
    this.turnController = turnController;
    this.battleMapController = battleMapController;
    this.screenController = screenController;
    this.getState = getState;
    this.setState = setState;
    this.render = render;
  }

  startEncounter() {
    if (!this.turnController.startEncounter(this.getState())) return;

    this.targetController.clear();
    this.formController.reset();
    this.render();
  }

  resetEncounter() {
    this.setState(createInitialState());
    this.targetController.clear();
    this.formController.reset();
    this.render();
  }

  applyDamage(event, damageInput = this.elements.damage) {
    event.preventDefault();

    const targetId = this.getSelectedTargetIdForAction();
    if (!targetId) return;

    const result = this.turnController.applyDamage(
      this.getState(),
      targetId,
      clampNumber(damageInput.value, 1),
    );

    if (!result) return;

    this.elements.damage.value = "";
    this.finishAttack(result);
  }

  rollAttack(weaponInput = this.elements.weapon) {
    const targetId = this.getSelectedTargetIdForAction();
    if (!targetId) return;

    const result = this.turnController.rollAttack(
      this.getState(),
      targetId,
      weaponInput.value,
    );
    if (result) this.finishAttack(result);
  }

  castSpell(spellInput = this.elements.spell) {
    if (!activeCombatantCanAct(this.getState())) return;

    const active = getActiveCombatant(this.getState());
    const spell = active?.spells?.[Number(spellInput.value)];
    if (!spell) return;

    if (isAreaSpell(spell)) {
      this.castAreaSpell(spellInput.value, spell);
      return;
    }

    const targetId = this.getSelectedTargetIdForAction();
    if (!targetId) return;

    const result = this.turnController.castSpell(
      this.getState(),
      targetId,
      spellInput.value,
    );
    if (result) this.finishAttack(result);
  }

  castAreaSpell(spellIndex, spell) {
    if (!this.battleMapController) return;

    const didStartTargeting = this.battleMapController.startAreaTargeting(
      this.getState(),
      spellIndex,
      spell,
      (targetCell) => {
        const result = this.turnController.castAreaSpell(this.getState(), spellIndex, targetCell);
        if (result) this.finishAttack(result);
      },
    );
    if (!didStartTargeting) return;

    this.targetController.clear();
    this.screenController?.showScreen("battle-map");
    this.setRollResult(`Select a point on the battle map for ${spell.name}.`);
    this.render();
  }

  getSelectedTargetIdForAction() {
    if (!activeCombatantCanAct(this.getState())) return "";
    return this.targetController.selectedId;
  }

  finishAttack(result) {
    if (result.shouldClearTarget) {
      this.targetController.clear();
    }

    this.setRollResult(result.message);
    this.render();
  }

  setRollResult(message) {
    this.elements.rollResult.textContent = message;
  }

  applyCondition(id, condition) {
    const state = this.getState();
    if (!state.hasStarted || state.isFinished) return;

    const result = this.rosterController.applyCondition(state, id, condition);
    if (!result) return;

    this.setRollResult(result.message);
    this.render();
  }

  removeCondition(id, condition) {
    const state = this.getState();
    if (!state.hasStarted || state.isFinished) return;

    const result = this.rosterController.removeCondition(state, id, condition);
    if (!result) return;

    this.setRollResult(result.message);
    this.render();
  }

  nextTurn() {
    if (!this.turnController.nextTurn(this.getState())) return;

    this.targetController.clear();
    this.render();
  }

  getActiveCombatant() {
    return getActiveCombatant(this.getState());
  }

  preserveActiveTurn(activeBeforeAdd) {
    if (!activeBeforeAdd) return;

    const currentTurnIndex = sortedCombatants(this.getState()).findIndex(
      (combatant) => combatant.id === activeBeforeAdd.id,
    );
    if (currentTurnIndex >= 0) {
      this.getState().currentTurnIndex = currentTurnIndex;
    }
  }
}
