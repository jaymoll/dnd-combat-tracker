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
    [
      [quickAccess.character, "character", this.elements.characterQuickList, this.elements.emptyCharacterQuickList, ["add"]],
      [quickAccess.monster, "monster", this.elements.monsterQuickList, this.elements.emptyMonsterQuickList, ["add"]],
      [
        quickAccess.character,
        "character",
        this.elements.managementCharacterQuickList,
        this.elements.emptyManagementCharacterQuickList,
        ["edit", "remove"],
      ],
      [
        quickAccess.monster,
        "monster",
        this.elements.managementMonsterQuickList,
        this.elements.emptyManagementMonsterQuickList,
        ["edit", "remove"],
      ],
    ].forEach(([items, type, listElement, emptyElement, actions]) => {
      this.renderQuickAccessList(items, type, listElement, emptyElement, state.hasStarted, actions);
    });

    this.renderAttackQuickAccessList(
      quickAccess.spell,
      this.elements.spellQuickList,
      this.elements.emptySpellQuickList,
      spellQuickAccessItemMarkup,
      state.hasStarted,
    );
    this.renderAttackQuickAccessList(
      quickAccess.weapon,
      this.elements.weaponQuickList,
      this.elements.emptyWeaponQuickList,
      weaponQuickAccessItemMarkup,
      state.hasStarted,
    );
  }

  renderQuickAccessList(items, type, listElement, emptyElement, isDisabled, actions) {
    emptyElement.hidden = items.length > 0;
    listElement.innerHTML = items.map((item) => quickAccessItemMarkup(item, type, isDisabled, actions)).join("");
  }

  renderAttackQuickAccessList(items, listElement, emptyElement, itemMarkup, isDisabled) {
    items ??= [];
    emptyElement.hidden = items.length > 0;
    listElement.innerHTML = items.map((item) => itemMarkup(item, isDisabled)).join("");
  }

  renderTurnPanel(state) {
    const panels = this.getTurnPanels();

    panels.forEach((panel) => {
      panel.turnPanel.hidden = !state.hasStarted || state.isFinished;
    });

    if (!canRenderTurnPanel(state)) {
      this.resetTurnPanels(panels);
      this.targetController.clear();
      return;
    }

    this.renderActiveTurnPanels(panels, this.getTurnPanelState(state));
  }

  resetTurnPanels(panels) {
    panels.forEach((panel) => {
      panel.activeName.textContent = "";
      panel.selectedTargetText.textContent = "";
      panel.weapon.innerHTML = "";
      panel.spell.innerHTML = "";
      panel.rollResult.textContent = "";
    });
  }

  getTurnPanelState(state) {
    const { active, livingCombatants } = turnSummary(state);
    const targets = this.targetController.getLivingTargets(state);
    let selectedTarget = targets.find((target) => target.id === this.targetController.selectedId);

    if (!selectedTarget) {
      this.targetController.clear();
      selectedTarget = null;
    }

    const hasSelectedTarget = Boolean(selectedTarget);
    const weapons = active.weapons ?? [];
    const spells = active.spells ?? [];

    return {
      activeName: active.name,
      selectedTargetText: selectedTarget ? `Target: ${selectedTarget.name}` : "Target: select from list",
      weaponOptions: weapons.map(weaponOptionMarkup).join(""),
      spellOptions: spells.map(spellOptionMarkup).join(""),
      canUseTargetedAction: hasSelectedTarget,
      hasWeapons: weapons.length > 0,
      hasSpells: spells.length > 0,
      canAdvanceTurn: targets.length > 0 || livingCombatants.length >= 2,
    };
  }

  renderActiveTurnPanels(panels, panelState) {
    panels.forEach((panel) => {
      panel.activeName.textContent = panelState.activeName;
      panel.selectedTargetText.textContent = panelState.selectedTargetText;
      panel.weapon.innerHTML = panelState.weaponOptions;
      panel.spell.innerHTML = panelState.spellOptions;

      panel.damageForm.querySelector("button[type='submit']").disabled = !panelState.canUseTargetedAction;
      panel.rollAttackButton.disabled = !panelState.canUseTargetedAction || !panelState.hasWeapons;
      panel.weapon.disabled = panel.rollAttackButton.disabled;
      panel.castSpellButton.disabled = !panelState.canUseTargetedAction || !panelState.hasSpells;
      panel.spell.disabled = panel.castSpellButton.disabled;
      panel.nextTurnButton.disabled = !panelState.canAdvanceTurn;
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
