export class ListInteractionWorkflow {
  constructor({
    elements,
    formController,
    combatantFactory,
    quickAccessController,
    rosterController,
    targetController,
    renderer,
    encounterWorkflow,
    getState,
    render,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
  }) {
    this.elements = elements;
    this.formController = formController;
    this.combatantFactory = combatantFactory;
    this.quickAccessController = quickAccessController;
    this.rosterController = rosterController;
    this.targetController = targetController;
    this.renderer = renderer;
    this.encounterWorkflow = encounterWorkflow;
    this.getState = getState;
    this.render = render;
    this.document = documentRef;
    this.window = windowRef;
  }

  handleCombatantRowClick(event) {
    const button = event.target.closest("button");

    if (this.handleConditionButton(button)) return;

    if (this.getState().hasStarted) {
      this.handleStartedCombatantRowClick(event, button);
      return;
    }

    this.handleSetupCombatantRowClick(button);
  }

  handleConditionButton(button) {
    if (button?.dataset.action === "apply-condition") {
      this.encounterWorkflow.applyCondition(button.dataset.id, button.dataset.condition);
      return true;
    }

    if (button?.dataset.action === "remove-condition") {
      this.encounterWorkflow.removeCondition(button.dataset.id, button.dataset.condition);
      return true;
    }

    return false;
  }

  handleStartedCombatantRowClick(event, button) {
    const row = event.target.closest("tr[data-id]");
    const conditionMenu = event.target.closest(".condition-menu");

    if (!row || button || conditionMenu || !this.targetController.select(row.dataset.id, this.getState())) return;

    this.renderer.renderTurnPanel(this.getState());
    this.renderer.renderRows(this.getState());
  }

  handleSetupCombatantRowClick(button) {
    if (!button) return;

    const id = button.dataset.id;
    const combatant = this.rosterController.find(this.getState(), id);
    if (!combatant) return;

    switch (button.dataset.action) {
      case "edit":
        this.formController.fillCombatant(combatant);
        this.formController.renderState(this.getState());
        break;
      case "remove":
        this.removeCombatant(id);
        break;
    }
  }

  async handleQuickAccessClick(event) {
    const button = this.getQuickAccessButton(event);
    if (!button) return;

    const { action, id, type } = button.dataset;
    const entry = this.quickAccessController.find(type, id);
    if (!entry) return;

    switch (action) {
      case "add-quick":
        this.addCombatantFromQuickAccess(entry);
        break;
      case "edit-quick":
        this.formController.fillLibraryEntry(entry, type);
        this.formController.renderState(this.getState());
        break;
      case "remove-quick":
        await this.quickAccessController.remove(type, id);
        this.render();
        break;
    }
  }

  getQuickAccessButton(event) {
    const button = event.target.closest("button");
    if (!button) return null;
    if (!this.getState().hasStarted) return button;
    if (this.canUseQuickAccessDuringEncounter(button)) return button;

    return null;
  }

  canUseQuickAccessDuringEncounter(button) {
    const state = this.getState();
    return (
      !state.isFinished &&
      button.dataset.action === "add-quick" &&
      button.dataset.type === "monster"
    );
  }

  addCombatantFromQuickAccess(entry) {
    const state = this.getState();
    if (state.hasStarted && (state.isFinished || entry.type !== "monster")) return;

    const activeBeforeAdd = state.hasStarted && !state.isFinished ? this.encounterWorkflow.getActiveCombatant() : null;
    const initiative =
      entry.type === "monster"
        ? this.combatantFactory.rollMonsterInitiative(entry)
        : this.window.prompt(`Initiative for ${entry.name}?`, "");

    if (initiative === null) return;

    const combatant = this.rosterController.addFromQuickAccess(state, entry, initiative);
    this.encounterWorkflow.preserveActiveTurn(activeBeforeAdd);
    this.targetController.clear();
    if (state.hasStarted && combatant.type === "monster") {
      this.encounterWorkflow.setRollResult(`${combatant.name} joins the encounter with initiative ${combatant.initiative}.`);
    }
    this.render();
  }

  removeCombatant(id) {
    this.rosterController.remove(this.getState(), id);
    if (this.elements.combatantId.value === id) {
      this.formController.reset();
    }
    this.render();
  }

  toggleList(button) {
    const list = this.document.getElementById(button.dataset.collapseToggle);
    if (!list) return;

    const isExpanded = button.getAttribute("aria-expanded") === "true";
    list.hidden = isExpanded;
    button.setAttribute("aria-expanded", String(!isExpanded));
    button.textContent = isExpanded ? "Show" : "Hide";
    button.setAttribute("aria-label", `${isExpanded ? "Expand" : "Collapse"} ${this.getListLabel(button)}`);
  }

  getListLabel(button) {
    const heading = button.closest(".section-heading")?.querySelector("h2");
    return heading?.textContent.trim().toLowerCase() || "list";
  }
}
