import { getActiveCombatant, sortedCombatants } from "../combat.js";
import {
  canRenderTurnPanel,
  combatantRowMarkup,
  conditionOptionMarkup,
  conditionTargetOptionMarkup,
  quickAccessItemMarkup,
  spellOptionMarkup,
  spellQuickAccessItemMarkup,
  statusMarkup,
  targetOptionMarkup,
  turnSummary,
  weaponOptionMarkup,
  weaponQuickAccessItemMarkup,
} from "./templates.js";

export class CombatTrackerRenderer {
  constructor(elements, formController, targetController, spellFormController = null, weaponFormController = null) {
    this.elements = elements;
    this.formController = formController;
    this.targetController = targetController;
    this.spellFormController = spellFormController;
    this.weaponFormController = weaponFormController;
  }

  render(state, quickAccess) {
    this.elements.status.innerHTML = statusMarkup(state);
    this.formController.setAvailableSpells(quickAccess.spell ?? []);
    this.formController.setAvailableWeapons(quickAccess.weapon ?? []);
    this.formController.renderState(state);
    this.spellFormController?.renderState(state);
    this.weaponFormController?.renderState(state);
    this.renderQuickAccess(quickAccess, state);
    this.renderTurnPanel(state);
    this.renderRows(state);
  }

  renderQuickAccess(quickAccess, state) {
    this.renderQuickAccessList(
      quickAccess.character,
      "character",
      this.elements.characterQuickList,
      this.elements.emptyCharacterQuickList,
      state.hasStarted,
    );
    this.renderQuickAccessList(
      quickAccess.monster,
      "monster",
      this.elements.monsterQuickList,
      this.elements.emptyMonsterQuickList,
      state.hasStarted,
    );
    this.renderSpellQuickAccessList(quickAccess.spell, state.hasStarted);
    this.renderWeaponQuickAccessList(quickAccess.weapon, state.hasStarted);
  }

  renderQuickAccessList(items, type, listElement, emptyElement, isDisabled) {
    emptyElement.hidden = items.length > 0;
    listElement.innerHTML = items.map((item) => quickAccessItemMarkup(item, type, isDisabled)).join("");
  }

  renderSpellQuickAccessList(items, isDisabled) {
    items ??= [];
    this.elements.emptySpellQuickList.hidden = items.length > 0;
    this.elements.spellQuickList.innerHTML = items
      .map((item) => spellQuickAccessItemMarkup(item, isDisabled))
      .join("");
  }

  renderWeaponQuickAccessList(items, isDisabled) {
    items ??= [];
    this.elements.emptyWeaponQuickList.hidden = items.length > 0;
    this.elements.weaponQuickList.innerHTML = items
      .map((item) => weaponQuickAccessItemMarkup(item, isDisabled))
      .join("");
  }

  renderTurnPanel(state) {
    this.elements.turnPanel.hidden = !state.hasStarted || state.isFinished;

    if (!canRenderTurnPanel(state)) {
      this.elements.activeName.textContent = "";
      this.elements.attackCounter.textContent = "";
      this.elements.target.innerHTML = "";
      this.elements.weapon.innerHTML = "";
      this.elements.spell.innerHTML = "";
      this.elements.conditionTarget.innerHTML = "";
      this.elements.condition.innerHTML = "";
      this.elements.applyConditionButton.disabled = true;
      this.elements.removeConditionButton.disabled = true;
      this.targetController.clear();
      this.elements.rollResult.textContent = "";
      return;
    }

    const { active, attackCounter, conditions, livingCombatants } = turnSummary(state);
    const targets = this.targetController.getLivingTargets(state);
    const previousConditionTargetId = this.elements.conditionTarget.value || active.id;
    const previousCondition = this.elements.condition.value;

    this.elements.activeName.textContent = active.name;
    this.elements.attackCounter.textContent = attackCounter;
    this.elements.target.innerHTML = targets.map(targetOptionMarkup).join("");
    this.elements.target.value = this.targetController.ensureSelectedTarget(targets);
    this.elements.weapon.innerHTML = (active.weapons ?? []).map(weaponOptionMarkup).join("");
    this.elements.spell.innerHTML = (active.spells ?? []).map(spellOptionMarkup).join("");
    this.elements.conditionTarget.innerHTML = livingCombatants.map(conditionTargetOptionMarkup).join("");
    this.elements.conditionTarget.value = livingCombatants.some(
      (combatant) => combatant.id === previousConditionTargetId,
    )
      ? previousConditionTargetId
      : active.id;
    this.elements.condition.innerHTML = conditions.map(conditionOptionMarkup).join("");
    if (conditions.some((condition) => condition.value === previousCondition)) {
      this.elements.condition.value = previousCondition;
    }

    const conditionTarget = livingCombatants.find(
      (combatant) => combatant.id === this.elements.conditionTarget.value,
    );
    const selectedCondition = this.elements.condition.value;
    const hasSelectedCondition = (conditionTarget?.conditions ?? []).includes(selectedCondition);

    this.elements.damageForm.querySelector("button[type='submit']").disabled = targets.length === 0;
    this.elements.rollAttackButton.disabled = targets.length === 0 || (active.weapons ?? []).length === 0;
    this.elements.weapon.disabled = this.elements.rollAttackButton.disabled;
    this.elements.castSpellButton.disabled = targets.length === 0 || (active.spells ?? []).length === 0;
    this.elements.spell.disabled = this.elements.castSpellButton.disabled;
    this.elements.nextTurnButton.disabled = targets.length === 0 && livingCombatants.length < 2;
    this.elements.applyConditionButton.disabled = !conditionTarget || hasSelectedCondition;
    this.elements.removeConditionButton.disabled = !conditionTarget || !hasSelectedCondition;
  }

  renderRows(state) {
    const combatants = sortedCombatants(state);
    const active = getActiveCombatant(state);

    this.elements.count.textContent = `${combatants.length} combatant${combatants.length === 1 ? "" : "s"}`;
    this.elements.empty.hidden = combatants.length > 0;
    this.elements.rows.innerHTML = combatants
      .map((combatant, index) =>
        combatantRowMarkup(combatant, index, {
          activeId: active?.id,
          selectedTargetId: this.targetController.selectedId,
          state,
        }),
      )
      .join("");
  }
}
