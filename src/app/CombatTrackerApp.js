import { activeCombatantCanAct } from "../combat.js";
import { CombatantFormController } from "../controllers/CombatantFormController.js";
import { QuickAccessController } from "../controllers/QuickAccessController.js";
import { RosterController } from "../controllers/RosterController.js";
import { SpellFormController } from "../controllers/SpellFormController.js";
import { TargetController } from "../controllers/TargetController.js";
import { TurnController } from "../controllers/TurnController.js";
import { WeaponFormController } from "../controllers/WeaponFormController.js";
import { createInitialState } from "../models.js";
import { CombatTrackerRenderer } from "../renderers/CombatTrackerRenderer.js";
import { CombatantFactory } from "../services/combatantFactory.js";
import { clampNumber } from "../utils.js";

export class CombatTrackerApp {
  constructor({ elements, libraryRepository }) {
    this.elements = elements;
    this.state = createInitialState();
    this.formController = new CombatantFormController(elements);
    this.spellFormController = new SpellFormController(elements);
    this.weaponFormController = new WeaponFormController(elements);
    this.targetController = new TargetController();
    this.quickAccessController = new QuickAccessController(libraryRepository, elements);
    this.turnController = new TurnController();
    this.combatantFactory = new CombatantFactory();
    this.rosterController = new RosterController(this.combatantFactory);
    this.renderer = new CombatTrackerRenderer(
      elements,
      this.formController,
      this.targetController,
      this.spellFormController,
      this.weaponFormController,
    );
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
    this.elements.screenButtons.forEach((button) => {
      button.addEventListener("click", () => this.showScreen(button.dataset.screenButton));
    });
    this.elements.libraryCreateButtons.forEach((button) => {
      button.addEventListener("click", () => this.openLibraryCreatureModal(button.dataset.libraryCreate));
    });
    this.elements.openModalButton.addEventListener("click", () => this.openAddCreatureModal());
    this.elements.closeModalButton.addEventListener("click", () => this.cancelForm());
    this.elements.saveQuickAccessButton.addEventListener("click", () => this.saveFormToQuickAccess());
    this.elements.cancelEditButton.addEventListener("click", () => this.cancelForm());
    this.elements.startButton.addEventListener("click", () => this.startEncounter());
    this.elements.resetButton.addEventListener("click", () => this.resetEncounter());
    this.elements.damageForm.addEventListener("submit", (event) => this.applyDamage(event));
    this.elements.rollAttackButton.addEventListener("click", () => this.rollAttack());
    this.elements.castSpellButton.addEventListener("click", () => this.castSpell());
    this.elements.nextTurnButton.addEventListener("click", () => this.nextTurn());
    this.elements.openSpellModalButton.addEventListener("click", () => this.openAddSpellModal());
    this.elements.closeSpellModalButton.addEventListener("click", () => this.cancelSpellForm());
    this.elements.cancelSpellButton.addEventListener("click", () => this.cancelSpellForm());
    this.elements.spellForm.addEventListener("submit", (event) => this.upsertSpell(event));
    this.elements.spellDamageMin.addEventListener("input", () => this.spellFormController.syncDamageMaxLimit());
    this.elements.openWeaponModalButton.addEventListener("click", () => this.openAddWeaponModal());
    this.elements.closeWeaponModalButton.addEventListener("click", () => this.cancelWeaponForm());
    this.elements.cancelWeaponButton.addEventListener("click", () => this.cancelWeaponForm());
    this.elements.weaponForm.addEventListener("submit", (event) => this.upsertWeapon(event));
    this.elements.weaponDamageMin.addEventListener("input", () => this.weaponFormController.syncDamageMaxLimit());
    this.elements.type.addEventListener("change", () => this.handleCreatureTypeChange());
    this.elements.modal.addEventListener("cancel", () => this.formController.reset());
    this.elements.modal.addEventListener("click", (event) => this.handleModalBackdropClick(event));
    this.elements.spellModal.addEventListener("cancel", () => this.spellFormController.reset());
    this.elements.spellModal.addEventListener("click", (event) => this.handleSpellModalBackdropClick(event));
    this.elements.weaponModal.addEventListener("cancel", () => this.weaponFormController.reset());
    this.elements.weaponModal.addEventListener("click", (event) => this.handleWeaponModalBackdropClick(event));
    this.elements.rows.addEventListener("click", (event) => this.handleCombatantRowClick(event));
    this.elements.collapseToggleButtons.forEach((button) => {
      button.addEventListener("click", () => this.toggleList(button));
    });
    this.elements.characterQuickList.addEventListener("click", (event) => this.handleQuickAccessClick(event));
    this.elements.monsterQuickList.addEventListener("click", (event) => this.handleQuickAccessClick(event));
    this.elements.managementCharacterQuickList.addEventListener("click", (event) => this.handleQuickAccessClick(event));
    this.elements.managementMonsterQuickList.addEventListener("click", (event) => this.handleQuickAccessClick(event));
    this.elements.spellQuickList.addEventListener("click", (event) => this.handleSpellQuickAccessClick(event));
    this.elements.weaponQuickList.addEventListener("click", (event) => this.handleWeaponQuickAccessClick(event));
    this.elements.maxHp.addEventListener("input", () => this.syncCurrentHpLimit());
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

  openLibraryCreatureModal(type) {
    if (this.state.hasStarted) return;

    this.formController.prepareLibraryCreate(type);
    this.formController.renderState(this.state);
    this.formController.open("library-create");
  }

  cancelForm() {
    this.formController.reset();
    this.formController.close();
  }

  openAddSpellModal() {
    if (this.state.hasStarted) return;

    this.spellFormController.reset();
    this.spellFormController.open("add");
  }

  cancelSpellForm() {
    this.spellFormController.reset();
    this.spellFormController.close();
  }

  openAddWeaponModal() {
    if (this.state.hasStarted) return;

    this.weaponFormController.reset();
    this.weaponFormController.open("add");
  }

  cancelWeaponForm() {
    this.weaponFormController.reset();
    this.weaponFormController.close();
  }

  upsertCombatant(event) {
    event.preventDefault();

    const formCombatant = this.formController.read();
    if (!formCombatant) return;

    if (this.formController.mode === "library") {
      this.updateQuickAccessEntry(formCombatant);
      return;
    }

    if (this.formController.mode === "library-create") {
      this.createQuickAccessEntry(formCombatant);
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

  async createQuickAccessEntry(formCombatant) {
    const didSave = await this.quickAccessController.createFromForm(formCombatant);
    if (!didSave) return;

    this.formController.reset();
    this.formController.close();
    this.render();
  }

  showScreen(screenName) {
    this.elements.screens.forEach((screen) => {
      screen.hidden = screen.dataset.screen !== screenName;
    });
    this.elements.screenButtons.forEach((button) => {
      const isActive = button.dataset.screenButton === screenName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
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

  async upsertSpell(event) {
    event.preventDefault();
    if (this.state.hasStarted) return;

    const spell = this.spellFormController.read();
    if (!spell) {
      this.elements.spellName.focus();
      return;
    }

    const id = this.elements.spellId.value;
    const didSave = id
      ? await this.quickAccessController.updateSpell(id, spell)
      : await this.quickAccessController.createSpell(spell);

    if (!didSave) return;

    this.spellFormController.reset();
    this.spellFormController.close();
    this.render();
  }

  async upsertWeapon(event) {
    event.preventDefault();
    if (this.state.hasStarted) return;

    const weapon = this.weaponFormController.read();
    if (!weapon) {
      this.elements.weaponName.focus();
      return;
    }

    const id = this.elements.weaponId.value;
    const didSave = id
      ? await this.quickAccessController.updateWeapon(id, weapon)
      : await this.quickAccessController.createWeapon(weapon);

    if (!didSave) return;

    this.weaponFormController.reset();
    this.weaponFormController.close();
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

    const targetId = this.targetController.selectedId;
    if (!targetId) return;

    const result = this.turnController.applyDamage(
      this.state,
      targetId,
      clampNumber(this.elements.damage.value, 1),
    );

    if (!result) return;

    this.elements.damage.value = "";
    this.finishAttack(result);
  }

  rollAttack() {
    if (!activeCombatantCanAct(this.state)) return;

    const targetId = this.targetController.selectedId;
    if (!targetId) return;

    const result = this.turnController.rollAttack(
      this.state,
      targetId,
      this.elements.weapon.value,
    );
    if (result) this.finishAttack(result);
  }

  castSpell() {
    if (!activeCombatantCanAct(this.state)) return;

    const targetId = this.targetController.selectedId;
    if (!targetId) return;

    const result = this.turnController.castSpell(
      this.state,
      targetId,
      this.elements.spell.value,
    );
    if (result) this.finishAttack(result);
  }

  finishAttack(result) {
    if (result.shouldClearTarget) {
      this.targetController.clear();
    }

    this.elements.rollResult.textContent = result.message;
    this.render();
  }

  applyCondition(id, condition) {
    if (!this.state.hasStarted || this.state.isFinished) return;

    const result = this.rosterController.applyCondition(this.state, id, condition);
    if (!result) return;

    this.elements.rollResult.textContent = result.message;
    this.render();
  }

  removeCondition(id, condition) {
    if (!this.state.hasStarted || this.state.isFinished) return;

    const result = this.rosterController.removeCondition(this.state, id, condition);
    if (!result) return;

    this.elements.rollResult.textContent = result.message;
    this.render();
  }

  nextTurn() {
    if (!this.turnController.nextTurn(this.state)) return;

    this.targetController.clear();
    this.render();
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

  handleSpellModalBackdropClick(event) {
    if (event.target !== this.elements.spellModal) return;

    this.spellFormController.reset();
    this.spellFormController.close();
  }

  handleWeaponModalBackdropClick(event) {
    if (event.target !== this.elements.weaponModal) return;

    this.weaponFormController.reset();
    this.weaponFormController.close();
  }

  toggleList(button) {
    const list = document.getElementById(button.dataset.collapseToggle);
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

  handleCombatantRowClick(event) {
    const button = event.target.closest("button");
    const conditionMenu = event.target.closest(".condition-menu");

    if (button?.dataset.action === "apply-condition") {
      this.applyCondition(button.dataset.id, button.dataset.condition);
      return;
    }

    if (button?.dataset.action === "remove-condition") {
      this.removeCondition(button.dataset.id, button.dataset.condition);
      return;
    }

    if (this.state.hasStarted) {
      const row = event.target.closest("tr[data-id]");
      if (!row || button || conditionMenu || !this.targetController.select(row.dataset.id, this.state)) return;

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

  async handleSpellQuickAccessClick(event) {
    const button = event.target.closest("button");
    if (!button || this.state.hasStarted) return;

    const { action, id } = button.dataset;
    const spell = this.quickAccessController.find("spell", id);
    if (!spell) return;

    if (action === "edit-spell") {
      this.spellFormController.fill(spell);
    }

    if (action === "remove-spell") {
      await this.quickAccessController.remove("spell", id);
      this.render();
    }
  }

  async handleWeaponQuickAccessClick(event) {
    const button = event.target.closest("button");
    if (!button || this.state.hasStarted) return;

    const { action, id } = button.dataset;
    const weapon = this.quickAccessController.find("weapon", id);
    if (!weapon) return;

    if (action === "edit-weapon") {
      this.weaponFormController.fill(weapon);
    }

    if (action === "remove-weapon") {
      await this.quickAccessController.remove("weapon", id);
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
}
