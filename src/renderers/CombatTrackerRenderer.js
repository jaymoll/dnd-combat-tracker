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
  constructor(
    elements,
    formController,
    targetController,
    spellFormController = null,
    weaponFormController = null,
    battleMapController = null,
  ) {
    this.elements = elements;
    this.formController = formController;
    this.targetController = targetController;
    this.spellFormController = spellFormController;
    this.weaponFormController = weaponFormController;
    this.battleMapController = battleMapController;
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
    this.battleMapController?.render(state);
  }

  renderQuickAccess(quickAccess, state) {
    this.renderQuickAccessList(
      quickAccess.character,
      "character",
      this.elements.characterQuickList,
      this.elements.emptyCharacterQuickList,
      state.hasStarted,
      ["add"],
    );
    this.renderQuickAccessList(
      quickAccess.monster,
      "monster",
      this.elements.monsterQuickList,
      this.elements.emptyMonsterQuickList,
      state.hasStarted,
      ["add"],
    );
    this.renderQuickAccessList(
      quickAccess.character,
      "character",
      this.elements.managementCharacterQuickList,
      this.elements.emptyManagementCharacterQuickList,
      state.hasStarted,
      ["edit", "remove"],
    );
    this.renderQuickAccessList(
      quickAccess.monster,
      "monster",
      this.elements.managementMonsterQuickList,
      this.elements.emptyManagementMonsterQuickList,
      state.hasStarted,
      ["edit", "remove"],
    );
    this.renderSpellQuickAccessList(quickAccess.spell, state.hasStarted);
    this.renderWeaponQuickAccessList(quickAccess.weapon, state.hasStarted);
  }

  renderQuickAccessList(items, type, listElement, emptyElement, isDisabled, actions) {
    emptyElement.hidden = items.length > 0;
    listElement.innerHTML = items.map((item) => quickAccessItemMarkup(item, type, isDisabled, actions)).join("");
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
    const panels = this.getTurnPanels();

    panels.forEach((panel) => {
      panel.turnPanel.hidden = !state.hasStarted || state.isFinished;
    });

    if (!canRenderTurnPanel(state)) {
      panels.forEach((panel) => {
        panel.activeName.textContent = "";
        panel.selectedTargetText.textContent = "";
        panel.weapon.innerHTML = "";
        panel.spell.innerHTML = "";
        panel.rollResult.textContent = "";
      });
      this.targetController.clear();
      return;
    }

    const { active, livingCombatants } = turnSummary(state);
    const targets = this.targetController.getLivingTargets(state);
    let selectedTarget = targets.find((target) => target.id === this.targetController.selectedId);

    if (!selectedTarget) {
      this.targetController.clear();
      selectedTarget = null;
    }

    const hasSelectedTarget = Boolean(selectedTarget);
    const weaponOptions = (active.weapons ?? []).map(weaponOptionMarkup).join("");
    const spellOptions = (active.spells ?? []).map(spellOptionMarkup).join("");

    panels.forEach((panel) => {
      panel.activeName.textContent = active.name;
      panel.selectedTargetText.textContent = selectedTarget
        ? `Target: ${selectedTarget.name}`
        : "Target: select from list";
      panel.weapon.innerHTML = weaponOptions;
      panel.spell.innerHTML = spellOptions;

      panel.damageForm.querySelector("button[type='submit']").disabled = !hasSelectedTarget;
      panel.rollAttackButton.disabled = !hasSelectedTarget || (active.weapons ?? []).length === 0;
      panel.weapon.disabled = panel.rollAttackButton.disabled;
      panel.castSpellButton.disabled = !hasSelectedTarget || (active.spells ?? []).length === 0;
      panel.spell.disabled = panel.castSpellButton.disabled;
      panel.nextTurnButton.disabled = targets.length === 0 && livingCombatants.length < 2;
    });
  }

  getTurnPanels() {
    return [
      {
        turnPanel: this.elements.turnPanel,
        activeName: this.elements.activeName,
        selectedTargetText: this.elements.selectedTargetText,
        damageForm: this.elements.damageForm,
        weapon: this.elements.weapon,
        spell: this.elements.spell,
        rollAttackButton: this.elements.rollAttackButton,
        castSpellButton: this.elements.castSpellButton,
        nextTurnButton: this.elements.nextTurnButton,
        rollResult: this.elements.rollResult,
      },
      {
        turnPanel: this.elements.battleMapTurnPanel,
        activeName: this.elements.battleMapActiveName,
        selectedTargetText: this.elements.battleMapSelectedTargetText,
        damageForm: this.elements.battleMapDamageForm,
        weapon: this.elements.battleMapWeapon,
        spell: this.elements.battleMapSpell,
        rollAttackButton: this.elements.battleMapRollAttackButton,
        castSpellButton: this.elements.battleMapCastSpellButton,
        nextTurnButton: this.elements.battleMapNextTurnButton,
        rollResult: this.elements.battleMapRollResult,
      },
    ];
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
