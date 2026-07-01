import { activeCombatantCanAct } from "../combat.js";
import { CombatantFormController } from "../controllers/CombatantFormController.js";
import { QuickAccessController } from "../controllers/QuickAccessController.js";
import { RosterController } from "../controllers/RosterController.js";
import { TargetController } from "../controllers/TargetController.js";
import { TurnController } from "../controllers/TurnController.js";
import { createInitialState } from "../models.js";
import { CombatTrackerRenderer } from "../renderers/CombatTrackerRenderer.js";
import { CombatantFactory } from "../services/combatantFactory.js";
import { clampNumber } from "../utils.js";

export class CombatTrackerApp {
  constructor({ elements, libraryRepository }) {
    this.elements = elements;
    this.state = createInitialState();
    this.formController = new CombatantFormController(elements);
    this.targetController = new TargetController();
    this.quickAccessController = new QuickAccessController(libraryRepository, elements);
    this.turnController = new TurnController();
    this.combatantFactory = new CombatantFactory();
    this.rosterController = new RosterController(this.combatantFactory);
    this.renderer = new CombatTrackerRenderer(elements, this.formController, this.targetController);
  }

  async init() {
    this.bindEvents();
    this.formController.syncMonsterFields();
    this.render();
    await this.quickAccessController.load();
    this.render();
  }

  bindEvents() {
    this.elements.form.addEventListener("submit", (event) => this.upsertCombatant(event));
    this.elements.openModalButton.addEventListener("click", () => this.openAddCreatureModal());
    this.elements.closeModalButton.addEventListener("click", () => this.cancelForm());
    this.elements.saveQuickAccessButton.addEventListener("click", () => this.saveFormToQuickAccess());
    this.elements.cancelEditButton.addEventListener("click", () => this.cancelForm());
    this.elements.startButton.addEventListener("click", () => this.startEncounter());
    this.elements.resetButton.addEventListener("click", () => this.resetEncounter());
    this.elements.damageForm.addEventListener("submit", (event) => this.applyDamage(event));
    this.elements.rollAttackButton.addEventListener("click", () => this.rollAttack());
    this.elements.nextTurnButton.addEventListener("click", () => this.nextTurn());
    this.elements.target.addEventListener("change", () => this.selectTargetFromInput());
    this.elements.type.addEventListener("change", () => this.handleCreatureTypeChange());
    this.elements.modal.addEventListener("cancel", () => this.formController.reset());
    this.elements.modal.addEventListener("click", (event) => this.handleModalBackdropClick(event));
    this.elements.rows.addEventListener("click", (event) => this.handleCombatantRowClick(event));
    this.elements.characterQuickList.addEventListener("click", (event) => this.handleQuickAccessClick(event));
    this.elements.monsterQuickList.addEventListener("click", (event) => this.handleQuickAccessClick(event));
    this.elements.maxHp.addEventListener("input", () => this.syncCurrentHpLimit());
    this.elements.damageMin.addEventListener("input", () => this.syncDamageMaxLimit());
  }

  render() {
    this.turnController.prepareForRender(this.state);
    this.renderer.render(this.state, this.quickAccessController.items);
  }

  openAddCreatureModal() {
    this.formController.reset();
    this.formController.renderState(this.state);
    this.formController.open("add");
  }

  cancelForm() {
    this.formController.reset();
    this.formController.close();
  }

  upsertCombatant(event) {
    event.preventDefault();

    const formCombatant = this.formController.read();
    if (!formCombatant) return;

    if (this.formController.mode === "library") {
      this.updateQuickAccessEntry(formCombatant);
      return;
    }

    this.rosterController.upsertFromForm(this.state, formCombatant, this.elements.combatantId.value);
    this.formController.reset();
    this.formController.close();
    this.render();
  }

  async updateQuickAccessEntry(formCombatant) {
    const didSave = await this.quickAccessController.update(this.formController.libraryEditTarget, formCombatant);
    if (!didSave) return;

    this.formController.reset();
    this.formController.close();
    this.render();
  }

  async saveFormToQuickAccess() {
    if (this.state.hasStarted) return;

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

  addCombatantFromQuickAccess(entry) {
    const initiative =
      entry.type === "monster"
        ? this.combatantFactory.rollMonsterInitiative(entry)
        : window.prompt(`Initiative for ${entry.name}?`, "");

    if (initiative === null) return;

    this.rosterController.addFromQuickAccess(this.state, entry, initiative);
    this.targetController.clear();
    this.render();
  }

  startEncounter() {
    if (!this.turnController.startEncounter(this.state)) return;

    this.targetController.clear();
    this.formController.reset();
    this.render();
  }

  resetEncounter() {
    this.state = createInitialState();
    this.targetController.clear();
    this.formController.reset();
    this.render();
  }

  applyDamage(event) {
    event.preventDefault();
    if (!activeCombatantCanAct(this.state)) return;

    this.targetController.set(this.elements.target.value);
    const result = this.turnController.applyDamage(
      this.state,
      this.elements.target.value,
      clampNumber(this.elements.damage.value, 1),
    );

    if (!result) return;

    this.elements.damage.value = "";
    this.finishAttack(result);
  }

  rollAttack() {
    if (!activeCombatantCanAct(this.state)) return;

    this.targetController.set(this.elements.target.value);
    const result = this.turnController.rollAttack(this.state, this.elements.target.value);
    if (result) this.finishAttack(result);
  }

  finishAttack(result) {
    if (result.shouldClearTarget) {
      this.targetController.clear();
    }

    this.elements.rollResult.textContent = result.message;
    this.render();
  }

  nextTurn() {
    if (!this.turnController.nextTurn(this.state)) return;

    this.targetController.clear();
    this.render();
  }

  selectTargetFromInput() {
    this.targetController.set(this.elements.target.value);
    this.renderer.renderRows(this.state);
  }

  handleCreatureTypeChange() {
    this.formController.syncMonsterFields();
    this.formController.renderState(this.state);
  }

  handleModalBackdropClick(event) {
    if (event.target !== this.elements.modal) return;

    this.formController.reset();
    this.formController.close();
  }

  handleCombatantRowClick(event) {
    const button = event.target.closest("button");

    if (this.state.hasStarted) {
      const row = event.target.closest("tr[data-id]");
      if (!row || button || !this.targetController.select(row.dataset.id, this.state)) return;

      this.renderer.renderTurnPanel(this.state);
      this.renderer.renderRows(this.state);
      return;
    }

    if (!button) return;

    const id = button.dataset.id;
    const combatant = this.rosterController.find(this.state, id);
    if (!combatant) return;

    if (button.dataset.action === "edit") {
      this.formController.fillCombatant(combatant);
      this.formController.renderState(this.state);
    }

    if (button.dataset.action === "remove") {
      this.removeCombatant(id);
    }
  }

  async handleQuickAccessClick(event) {
    const button = event.target.closest("button");
    if (!button || this.state.hasStarted) return;

    const { action, id, type } = button.dataset;
    const entry = this.quickAccessController.find(type, id);
    if (!entry) return;

    if (action === "add-quick") {
      this.addCombatantFromQuickAccess(entry);
    }

    if (action === "edit-quick") {
      this.formController.fillLibraryEntry(entry, type);
      this.formController.renderState(this.state);
    }

    if (action === "remove-quick") {
      await this.quickAccessController.remove(type, id);
      this.render();
    }
  }

  removeCombatant(id) {
    this.rosterController.remove(this.state, id);
    if (this.elements.combatantId.value === id) {
      this.formController.reset();
    }
    this.render();
  }

  syncCurrentHpLimit() {
    const maxHp = clampNumber(this.elements.maxHp.value, 1);
    this.elements.currentHp.max = maxHp;
    if (!this.elements.currentHp.value || Number(this.elements.currentHp.value) > maxHp) {
      this.elements.currentHp.value = maxHp;
    }
  }

  syncDamageMaxLimit() {
    const minDamage = clampNumber(this.elements.damageMin.value, 0);
    this.elements.damageMax.min = minDamage;
    if (this.elements.damageMax.value && Number(this.elements.damageMax.value) < minDamage) {
      this.elements.damageMax.value = minDamage;
    }
  }
}
