import { clampNumber } from "../utils.js";

export class CreatureWorkflow {
  constructor({
    elements,
    formController,
    quickAccessController,
    rosterController,
    encounterWorkflow,
    getState,
    render,
  }) {
    this.elements = elements;
    this.formController = formController;
    this.quickAccessController = quickAccessController;
    this.rosterController = rosterController;
    this.encounterWorkflow = encounterWorkflow;
    this.getState = getState;
    this.render = render;
  }

  openAddModal() {
    const state = this.getState();
    if (state.isFinished) return;

    if (state.hasStarted) {
      this.formController.prepareReinforcementCreate();
    } else {
      this.formController.reset();
    }
    this.formController.renderState(state);
    this.formController.open(state.hasStarted ? "reinforcement" : "add");
  }

  openLibraryModal(type) {
    const state = this.getState();
    if (state.hasStarted) return;

    this.formController.prepareLibraryCreate(type);
    this.formController.renderState(state);
    this.formController.open("library-create");
  }

  cancelForm() {
    this.formController.reset();
    this.formController.close();
  }

  async upsertCombatant(event) {
    event.preventDefault();

    const formCombatant = this.formController.read();
    if (!formCombatant) return;

    if (this.formController.mode === "library") {
      await this.updateQuickAccessEntry(formCombatant);
      return;
    }

    if (this.formController.mode === "library-create") {
      await this.createQuickAccessEntry(formCombatant);
      return;
    }

    const state = this.getState();
    if (state.hasStarted && (state.isFinished || formCombatant.type !== "monster")) return;

    const activeBeforeAdd = state.hasStarted ? this.encounterWorkflow.getActiveCombatant() : null;
    const combatant = this.rosterController.upsertFromForm(
      state,
      formCombatant,
      this.elements.combatantId.value,
    );
    this.encounterWorkflow.preserveActiveTurn(activeBeforeAdd);
    if (state.hasStarted && combatant.type === "monster") {
      this.encounterWorkflow.setRollResult(`${combatant.name} joins the encounter with initiative ${combatant.initiative}.`);
    }
    this.closeFormAndRender();
  }

  async updateQuickAccessEntry(formCombatant) {
    const didSave = await this.quickAccessController.update(this.formController.libraryEditTarget, formCombatant);
    if (!didSave) return;

    this.closeFormAndRender();
  }

  async createQuickAccessEntry(formCombatant) {
    const didSave = await this.quickAccessController.createFromForm(formCombatant);
    if (!didSave) return;

    this.closeFormAndRender();
  }

  closeFormAndRender() {
    this.formController.reset();
    this.formController.close();
    this.render();
  }

  async saveFormToQuickAccess() {
    if (this.getState().hasStarted) return;

    const formCombatant = this.formController.read();
    if (!formCombatant) {
      this.elements.name.focus();
      return;
    }

    const didSave = await this.quickAccessController.createFromForm(formCombatant);
    if (!didSave) return;

    this.formController.close();
    this.render();
  }

  handleTypeChange() {
    this.formController.syncMonsterFields();
    this.formController.renderState(this.getState());
  }

  resetForm() {
    this.formController.reset();
  }

  closeOnBackdropClick(event) {
    if (event.target !== this.elements.modal) return;

    this.formController.reset();
    this.formController.close();
  }

  syncCurrentHpLimit() {
    const maxHp = clampNumber(this.elements.maxHp.value, 1);
    this.elements.currentHp.max = maxHp;
    if (!this.elements.currentHp.value || Number(this.elements.currentHp.value) > maxHp) {
      this.elements.currentHp.value = maxHp;
    }
  }
}
