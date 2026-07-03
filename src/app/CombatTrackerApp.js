import { activeCombatantCanAct } from "../combat.js";
import { BattleMapController } from "../controllers/BattleMapController.js";
import { CombatantFormController } from "../controllers/CombatantFormController.js";
import { EncounterDifficultyController } from "../controllers/EncounterDifficultyController.js";
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

const screenRoutes = {
  encounter: "/",
  "battle-map": "/battle-map",
  "encounter-calculator": "/encounter-calculator",
  management: "/management",
};

const routeScreens = Object.fromEntries(Object.entries(screenRoutes).map(([screen, route]) => [route, screen]));

export class CombatTrackerApp {
  constructor({ elements, libraryRepository }) {
    this.elements = elements;
    this.state = createInitialState();
    this.formController = new CombatantFormController(elements);
    this.spellFormController = new SpellFormController(elements);
    this.weaponFormController = new WeaponFormController(elements);
    this.targetController = new TargetController();
    this.quickAccessController = new QuickAccessController(libraryRepository, elements);
    this.encounterDifficultyController = new EncounterDifficultyController(
      elements,
      () => this.quickAccessController.items.monster ?? [],
    );
    this.turnController = new TurnController();
    this.combatantFactory = new CombatantFactory();
    this.rosterController = new RosterController(this.combatantFactory);
    this.battleMapController = new BattleMapController(elements, this.targetController, () => this.render());
    this.renderer = new CombatTrackerRenderer(
      elements,
      this.formController,
      this.targetController,
      this.spellFormController,
      this.weaponFormController,
      this.battleMapController,
    );
  }

  async init() {
    this.bindEvents();
    this.showScreen(this.getScreenFromPath(), { updatePath: false });
    this.formController.syncMonsterFields();
    this.render();
    await this.quickAccessController.load();
    this.render();
  }

  bindEvents() {
    this.bindScreenEvents();
    this.bindBattleMapEvents();
    this.bindCreatureFormEvents();
    this.bindEncounterEvents();
    this.bindSpellEvents();
    this.bindWeaponEvents();
    this.bindListEvents();
  }

  bindScreenEvents() {
    this.elements.screenButtons.forEach((button) => {
      button.addEventListener("click", () => this.showScreen(button.dataset.screenButton));
    });
    window.addEventListener("popstate", () => this.showScreen(this.getScreenFromPath(), { updatePath: false }));
  }

  bindBattleMapEvents() {
    this.elements.battleMapGridType.addEventListener("change", () => this.changeBattleMapGrid());
    this.elements.battleMapWidth.addEventListener("change", () => this.resizeBattleMap());
    this.elements.battleMapHeight.addEventListener("change", () => this.resizeBattleMap());
    this.elements.battleMapResetButton.addEventListener("click", () => this.resetBattleMapPositions());
    this.elements.battleMapBoard.addEventListener("pointerdown", (event) =>
      this.battleMapController.startDrag(event, this.state),
    );
    this.elements.battleMapDamageForm.addEventListener("submit", (event) =>
      this.applyDamage(event, this.elements.battleMapDamage),
    );
    this.elements.battleMapRollAttackButton.addEventListener("click", () =>
      this.rollAttack(this.elements.battleMapWeapon),
    );
    this.elements.battleMapCastSpellButton.addEventListener("click", () =>
      this.castSpell(this.elements.battleMapSpell),
    );
    this.elements.battleMapNextTurnButton.addEventListener("click", () => this.nextTurn());
  }

  bindCreatureFormEvents() {
    this.elements.form.addEventListener("submit", (event) => this.upsertCombatant(event));
    this.elements.libraryCreateButtons.forEach((button) => {
      button.addEventListener("click", () => this.openLibraryCreatureModal(button.dataset.libraryCreate));
    });
    this.elements.openModalButton.addEventListener("click", () => this.openAddCreatureModal());
    this.elements.closeModalButton.addEventListener("click", () => this.cancelForm());
    this.elements.saveQuickAccessButton.addEventListener("click", () => this.saveFormToQuickAccess());
    this.elements.cancelEditButton.addEventListener("click", () => this.cancelForm());
    this.elements.type.addEventListener("change", () => this.handleCreatureTypeChange());
    this.elements.modal.addEventListener("cancel", () => this.formController.reset());
    this.elements.modal.addEventListener("click", (event) =>
      this.handleModalBackdropClick(event, this.elements.modal, this.formController),
    );
    this.elements.maxHp.addEventListener("input", () => this.syncCurrentHpLimit());
  }

  bindEncounterEvents() {
    this.elements.startButton.addEventListener("click", () => this.startEncounter());
    this.elements.resetButton.addEventListener("click", () => this.resetEncounter());
    this.elements.damageForm.addEventListener("submit", (event) => this.applyDamage(event));
    this.elements.rollAttackButton.addEventListener("click", () => this.rollAttack());
    this.elements.castSpellButton.addEventListener("click", () => this.castSpell());
    this.elements.nextTurnButton.addEventListener("click", () => this.nextTurn());
  }

  bindSpellEvents() {
    this.elements.openSpellModalButton.addEventListener("click", () => this.openAddSpellModal());
    this.elements.closeSpellModalButton.addEventListener("click", () => this.cancelSpellForm());
    this.elements.cancelSpellButton.addEventListener("click", () => this.cancelSpellForm());
    this.elements.spellForm.addEventListener("submit", (event) => this.upsertSpell(event));
    this.elements.spellDamageMin.addEventListener("input", () => this.spellFormController.syncDamageMaxLimit());
    this.elements.spellModal.addEventListener("cancel", () => this.spellFormController.reset());
    this.elements.spellModal.addEventListener("click", (event) =>
      this.handleModalBackdropClick(event, this.elements.spellModal, this.spellFormController),
    );
  }

  bindWeaponEvents() {
    this.elements.openWeaponModalButton.addEventListener("click", () => this.openAddWeaponModal());
    this.elements.closeWeaponModalButton.addEventListener("click", () => this.cancelWeaponForm());
    this.elements.cancelWeaponButton.addEventListener("click", () => this.cancelWeaponForm());
    this.elements.weaponForm.addEventListener("submit", (event) => this.upsertWeapon(event));
    this.elements.weaponDamageMin.addEventListener("input", () => this.weaponFormController.syncDamageMaxLimit());
    this.elements.weaponModal.addEventListener("cancel", () => this.weaponFormController.reset());
    this.elements.weaponModal.addEventListener("click", (event) =>
      this.handleModalBackdropClick(event, this.elements.weaponModal, this.weaponFormController),
    );
  }

  bindListEvents() {
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
    this.encounterDifficultyController.bindEvents();
  }

  render() {
    this.turnController.prepareForRender(this.state);
    this.renderer.render(this.state, this.quickAccessController.items);
    this.encounterDifficultyController.render();
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

    this.rosterController.upsertFromForm(this.state, formCombatant, this.elements.combatantId.value);
    this.closeCreatureFormAndRender();
  }

  async updateQuickAccessEntry(formCombatant) {
    const didSave = await this.quickAccessController.update(this.formController.libraryEditTarget, formCombatant);
    if (!didSave) return;

    this.closeCreatureFormAndRender();
  }

  async createQuickAccessEntry(formCombatant) {
    const didSave = await this.quickAccessController.createFromForm(formCombatant);
    if (!didSave) return;

    this.closeCreatureFormAndRender();
  }

  closeCreatureFormAndRender() {
    this.formController.reset();
    this.formController.close();
    this.render();
  }

  showScreen(screenName, { updatePath = true } = {}) {
    const nextScreenName = screenRoutes[screenName] ? screenName : "encounter";

    this.elements.screens.forEach((screen) => {
      screen.hidden = screen.dataset.screen !== nextScreenName;
    });
    this.elements.screenButtons.forEach((button) => {
      const isActive = button.dataset.screenButton === nextScreenName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    if (updatePath) {
      const nextPath = screenRoutes[nextScreenName];
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, "", nextPath);
      }
    }
  }

  getScreenFromPath() {
    return routeScreens[window.location.pathname] ?? "encounter";
  }

  changeBattleMapGrid() {
    if (!this.battleMapController.setGridType(this.state, this.elements.battleMapGridType.value)) return;

    this.render();
  }

  resizeBattleMap() {
    const didResize = this.battleMapController.setGridSize(
      this.state,
      this.elements.battleMapWidth.value,
      this.elements.battleMapHeight.value,
    );
    if (!didResize) return;

    this.render();
  }

  resetBattleMapPositions() {
    this.battleMapController.resetPositions(this.state);
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

  async upsertSpell(event) {
    event.preventDefault();
    await this.saveLibraryAttackItem({
      controller: this.spellFormController,
      idInput: this.elements.spellId,
      nameInput: this.elements.spellName,
      create: (spell) => this.quickAccessController.createSpell(spell),
      update: (id, spell) => this.quickAccessController.updateSpell(id, spell),
    });
  }

  async upsertWeapon(event) {
    event.preventDefault();
    await this.saveLibraryAttackItem({
      controller: this.weaponFormController,
      idInput: this.elements.weaponId,
      nameInput: this.elements.weaponName,
      create: (weapon) => this.quickAccessController.createWeapon(weapon),
      update: (id, weapon) => this.quickAccessController.updateWeapon(id, weapon),
    });
  }

  async saveLibraryAttackItem({ controller, idInput, nameInput, create, update }) {
    if (this.state.hasStarted) return;

    const item = controller.read();
    if (!item) {
      nameInput.focus();
      return;
    }

    const id = idInput.value;
    const didSave = id ? await update(id, item) : await create(item);

    if (!didSave) return;

    controller.reset();
    controller.close();
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

  applyDamage(event, damageInput = this.elements.damage) {
    event.preventDefault();

    const targetId = this.getSelectedTargetIdForAction();
    if (!targetId) return;

    const result = this.turnController.applyDamage(
      this.state,
      targetId,
      clampNumber(damageInput.value, 1),
    );

    if (!result) return;

    this.elements.damage.value = "";
    this.elements.battleMapDamage.value = "";
    this.finishAttack(result);
  }

  rollAttack(weaponInput = this.elements.weapon) {
    const targetId = this.getSelectedTargetIdForAction();
    if (!targetId) return;

    const result = this.turnController.rollAttack(
      this.state,
      targetId,
      weaponInput.value,
    );
    if (result) this.finishAttack(result);
  }

  castSpell(spellInput = this.elements.spell) {
    const targetId = this.getSelectedTargetIdForAction();
    if (!targetId) return;

    const result = this.turnController.castSpell(
      this.state,
      targetId,
      spellInput.value,
    );
    if (result) this.finishAttack(result);
  }

  getSelectedTargetIdForAction() {
    if (!activeCombatantCanAct(this.state)) return "";
    return this.targetController.selectedId;
  }

  finishAttack(result) {
    if (result.shouldClearTarget) {
      this.targetController.clear();
    }

    this.setRollResult(result.message);
    this.render();
  }

  setRollResult(message) {
    this.elements.rollResult.textContent = message;
    this.elements.battleMapRollResult.textContent = message;
  }

  applyCondition(id, condition) {
    if (!this.state.hasStarted || this.state.isFinished) return;

    const result = this.rosterController.applyCondition(this.state, id, condition);
    if (!result) return;

    this.setRollResult(result.message);
    this.render();
  }

  removeCondition(id, condition) {
    if (!this.state.hasStarted || this.state.isFinished) return;

    const result = this.rosterController.removeCondition(this.state, id, condition);
    if (!result) return;

    this.setRollResult(result.message);
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

  handleModalBackdropClick(event, modal, controller) {
    if (event.target !== modal) return;

    controller.reset();
    controller.close();
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

    if (this.handleConditionButton(button)) return;

    if (this.state.hasStarted) {
      this.handleStartedCombatantRowClick(event, button);
      return;
    }

    this.handleSetupCombatantRowClick(button);
  }

  handleConditionButton(button) {
    if (button?.dataset.action === "apply-condition") {
      this.applyCondition(button.dataset.id, button.dataset.condition);
      return true;
    }

    if (button?.dataset.action === "remove-condition") {
      this.removeCondition(button.dataset.id, button.dataset.condition);
      return true;
    }

    return false;
  }

  handleStartedCombatantRowClick(event, button) {
    const row = event.target.closest("tr[data-id]");
    const conditionMenu = event.target.closest(".condition-menu");

    if (!row || button || conditionMenu || !this.targetController.select(row.dataset.id, this.state)) return;

    this.renderer.renderTurnPanel(this.state);
    this.renderer.renderRows(this.state);
  }

  handleSetupCombatantRowClick(button) {
    if (!button) return;

    const id = button.dataset.id;
    const combatant = this.rosterController.find(this.state, id);
    if (!combatant) return;

    switch (button.dataset.action) {
      case "edit":
        this.formController.fillCombatant(combatant);
        this.formController.renderState(this.state);
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
        this.formController.renderState(this.state);
        break;
      case "remove-quick":
        await this.quickAccessController.remove(type, id);
        this.render();
        break;
    }
  }

  async handleSpellQuickAccessClick(event) {
    await this.handleAttackQuickAccessClick(event, "spell", this.spellFormController);
  }

  async handleWeaponQuickAccessClick(event) {
    await this.handleAttackQuickAccessClick(event, "weapon", this.weaponFormController);
  }

  async handleAttackQuickAccessClick(event, type, formController) {
    const button = this.getQuickAccessButton(event);
    if (!button) return;

    const { action, id } = button.dataset;
    const item = this.quickAccessController.find(type, id);
    if (!item) return;

    if (action === `edit-${type}`) {
      formController.fill(item);
      return;
    }

    if (action === `remove-${type}`) {
      await this.quickAccessController.remove(type, id);
      this.render();
    }
  }

  getQuickAccessButton(event) {
    const button = event.target.closest("button");
    if (!button || this.state.hasStarted) return;

    return button;
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
