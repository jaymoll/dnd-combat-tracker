import { getActiveCombatant, sortedCombatants } from "../combat.js";
import { DEFAULT_SPELL_RANGE_FEET, DEFAULT_WEAPON_RANGE_FEET, isAreaSpell } from "../models.js";
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
    turnController = null,
  ) {
    this.elements = elements;
    this.formController = formController;
    this.targetController = targetController;
    this.spellFormController = spellFormController;
    this.weaponFormController = weaponFormController;
    this.battleMapController = battleMapController;
    this.turnController = turnController;
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
      [quickAccess.monster, "monster", this.elements.monsterQuickList, this.elements.emptyMonsterQuickList, ["add"], state.isFinished],
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
    ].forEach(([items, type, listElement, emptyElement, actions, disabledOverride]) => {
      this.renderQuickAccessList(
        items,
        type,
        listElement,
        emptyElement,
        disabledOverride ?? state.hasStarted,
        actions,
      );
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
    const hasAreaSpells = spells.some(isAreaSpell);
    const weaponStates = this.getAttackOptionStates(
      state,
      active,
      selectedTarget,
      weapons,
      DEFAULT_WEAPON_RANGE_FEET,
    );
    const spellStates = this.getSpellOptionStates(
      state,
      active,
      selectedTarget,
      spells,
    );
    const distanceText = this.getSelectedTargetDistanceText(state, active, selectedTarget);

    return {
      activeName: active.name,
      selectedTargetText: selectedTarget
        ? `Target: ${selectedTarget.name}${distanceText}`
        : hasAreaSpells
          ? "Target: select a map tile for area spells"
          : "Target: select from list",
      weaponOptions: weapons.map((weapon, index) => weaponOptionMarkup(weapon, index, weaponStates[index])).join(""),
      spellOptions: spells.map((spell, index) => spellOptionMarkup(spell, index, spellStates[index])).join(""),
      canUseTargetedAction: hasSelectedTarget,
      canChooseSpell: hasSelectedTarget || hasAreaSpells,
      hasWeapons: weapons.length > 0,
      hasSpells: spells.length > 0,
      canRollAttack: hasSelectedTarget && weaponStates.some((rangeState) => !rangeState.disabled),
      canCastSpell: spellStates.some((rangeState) => !rangeState.disabled),
      canAdvanceTurn: targets.length > 0 || livingCombatants.length >= 2,
    };
  }

  getAttackOptionStates(state, active, selectedTarget, attacks, defaultRangeFeet) {
    return attacks.map((attack) => {
      const rangeState = this.turnController?.getAttackRangeState(
        state,
        active,
        selectedTarget,
        attack,
        defaultRangeFeet,
      );
      return {
        disabled: selectedTarget ? rangeState?.canAttack === false : false,
        rangeFeet: rangeState?.rangeFeet ?? attack.rangeFeet,
      };
    });
  }

  getSpellOptionStates(state, active, selectedTarget, spells) {
    return spells.map((spell) => {
      if (isAreaSpell(spell)) {
        return {
          disabled: false,
          rangeFeet: spell.rangeFeet,
        };
      }

      const rangeState = this.turnController?.getAttackRangeState(
        state,
        active,
        selectedTarget,
        spell,
        DEFAULT_SPELL_RANGE_FEET,
      );
      return {
        disabled: selectedTarget ? rangeState?.canAttack === false : true,
        disabledReason: selectedTarget ? "out of range" : "select target",
        rangeFeet: rangeState?.rangeFeet ?? spell.rangeFeet,
      };
    });
  }

  getSelectedTargetDistanceText(state, active, selectedTarget) {
    if (!this.turnController || !selectedTarget || active.type !== "monster") return "";

    const distanceFeet = this.turnController.getCombatantDistanceFeet(state, active, selectedTarget);
    return ` (${distanceFeet} ft)`;
  }

  renderActiveTurnPanels(panels, panelState) {
    panels.forEach((panel) => {
      panel.activeName.textContent = panelState.activeName;
      panel.selectedTargetText.textContent = panelState.selectedTargetText;
      panel.weapon.innerHTML = panelState.weaponOptions;
      panel.spell.innerHTML = panelState.spellOptions;
      this.selectFirstEnabledOption(panel.weapon);
      this.selectFirstEnabledOption(panel.spell);

      panel.damageForm.querySelector("button[type='submit']").disabled = !panelState.canUseTargetedAction;
      panel.rollAttackButton.disabled = !panelState.canRollAttack;
      panel.weapon.disabled = !panelState.canUseTargetedAction || !panelState.hasWeapons;
      panel.castSpellButton.disabled = !panelState.canCastSpell;
      panel.spell.disabled = !panelState.canChooseSpell || !panelState.hasSpells;
      panel.nextTurnButton.disabled = !panelState.canAdvanceTurn;
    });
  }

  selectFirstEnabledOption(select) {
    if (!select.selectedOptions[0]?.disabled) return;

    const enabledIndex = Array.from(select.options).findIndex((option) => !option.disabled);
    if (enabledIndex >= 0) {
      select.selectedIndex = enabledIndex;
    }
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
