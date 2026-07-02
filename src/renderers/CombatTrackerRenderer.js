import { getActiveCombatant, sortedCombatants } from "../combat.js";
import {
  canRenderTurnPanel,
  combatantRowMarkup,
  quickAccessItemMarkup,
  spellOptionMarkup,
  spellQuickAccessItemMarkup,
  statusMarkup,
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
      this.elements.selectedTargetText.textContent = "";
      this.elements.weapon.innerHTML = "";
      this.elements.spell.innerHTML = "";
      this.targetController.clear();
      this.elements.rollResult.textContent = "";
      return;
    }

    const { active, livingCombatants } = turnSummary(state);
    const targets = this.targetController.getLivingTargets(state);
    let selectedTarget = targets.find((target) => target.id === this.targetController.selectedId);

    if (!selectedTarget) {
      this.targetController.clear();
      selectedTarget = null;
    }

    this.elements.activeName.textContent = active.name;
    this.elements.selectedTargetText.textContent = selectedTarget
      ? `Target: ${selectedTarget.name}`
      : "Target: select from list";
    this.elements.weapon.innerHTML = (active.weapons ?? []).map(weaponOptionMarkup).join("");
    this.elements.spell.innerHTML = (active.spells ?? []).map(spellOptionMarkup).join("");

    const hasSelectedTarget = Boolean(selectedTarget);

    this.elements.damageForm.querySelector("button[type='submit']").disabled = !hasSelectedTarget;
    this.elements.rollAttackButton.disabled = !hasSelectedTarget || (active.weapons ?? []).length === 0;
    this.elements.weapon.disabled = this.elements.rollAttackButton.disabled;
    this.elements.castSpellButton.disabled = !hasSelectedTarget || (active.spells ?? []).length === 0;
    this.elements.spell.disabled = this.elements.castSpellButton.disabled;
    this.elements.nextTurnButton.disabled = targets.length === 0 && livingCombatants.length < 2;
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
