import { getActiveCombatant, sortedCombatants } from "../combat.js";
import {
  canRenderTurnPanel,
  combatantRowMarkup,
  quickAccessItemMarkup,
  statusMarkup,
  targetOptionMarkup,
  turnSummary,
} from "./templates.js";

export class CombatTrackerRenderer {
  constructor(elements, formController, targetController) {
    this.elements = elements;
    this.formController = formController;
    this.targetController = targetController;
  }

  render(state, quickAccess) {
    this.elements.status.innerHTML = statusMarkup(state);
    this.formController.renderState(state);
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
  }

  renderQuickAccessList(items, type, listElement, emptyElement, isDisabled) {
    emptyElement.hidden = items.length > 0;
    listElement.innerHTML = items.map((item) => quickAccessItemMarkup(item, type, isDisabled)).join("");
  }

  renderTurnPanel(state) {
    this.elements.turnPanel.hidden = !state.hasStarted || state.isFinished;

    if (!canRenderTurnPanel(state)) {
      this.elements.activeName.textContent = "";
      this.elements.attackCounter.textContent = "";
      this.elements.target.innerHTML = "";
      this.targetController.clear();
      this.elements.rollResult.textContent = "";
      return;
    }

    const { active, attackCounter, livingCombatants } = turnSummary(state);
    const targets = this.targetController.getLivingTargets(state);

    this.elements.activeName.textContent = active.name;
    this.elements.attackCounter.textContent = attackCounter;
    this.elements.target.innerHTML = targets.map(targetOptionMarkup).join("");
    this.elements.target.value = this.targetController.ensureSelectedTarget(targets);
    this.elements.damageForm.querySelector("button[type='submit']").disabled = targets.length === 0;
    this.elements.rollAttackButton.disabled = targets.length === 0 || active.type !== "monster";
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
