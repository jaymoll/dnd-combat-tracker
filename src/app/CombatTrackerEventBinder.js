export class CombatTrackerEventBinder {
  constructor({
    elements,
    screenController,
    battleMapWorkflow,
    creatureWorkflow,
    attackLibraryWorkflow,
    encounterWorkflow,
    listInteractionWorkflow,
    encounterDifficultyController,
    windowRef = globalThis.window,
  }) {
    this.elements = elements;
    this.screenController = screenController;
    this.battleMapWorkflow = battleMapWorkflow;
    this.creatureWorkflow = creatureWorkflow;
    this.attackLibraryWorkflow = attackLibraryWorkflow;
    this.encounterWorkflow = encounterWorkflow;
    this.listInteractionWorkflow = listInteractionWorkflow;
    this.encounterDifficultyController = encounterDifficultyController;
    this.window = windowRef;
  }

  bindAll() {
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
      button.addEventListener("click", () => this.screenController.showScreen(button.dataset.screenButton));
    });
    this.window.addEventListener("popstate", () => this.screenController.showCurrent({ updatePath: false }));
  }

  bindBattleMapEvents() {
    this.elements.battleMapGridType.addEventListener("change", () => this.battleMapWorkflow.changeGrid());
    this.elements.battleMapWidth.addEventListener("change", () => this.battleMapWorkflow.resize());
    this.elements.battleMapHeight.addEventListener("change", () => this.battleMapWorkflow.resize());
    this.elements.battleMapZoom.addEventListener("input", () => this.battleMapWorkflow.zoom());
    this.elements.battleMapResetButton.addEventListener("click", () => this.battleMapWorkflow.resetPositions());
    this.elements.battleMapBoard.addEventListener("pointermove", (event) => this.battleMapWorkflow.previewAreaTarget(event));
    this.elements.battleMapBoard.addEventListener("pointerdown", (event) => this.battleMapWorkflow.startDrag(event));
  }

  bindCreatureFormEvents() {
    this.elements.form.addEventListener("submit", (event) => this.creatureWorkflow.upsertCombatant(event));
    this.elements.libraryCreateButtons.forEach((button) => {
      button.addEventListener("click", () => this.creatureWorkflow.openLibraryModal(button.dataset.libraryCreate));
    });
    this.elements.openModalButton.addEventListener("click", () => this.creatureWorkflow.openAddModal());
    this.elements.closeModalButton.addEventListener("click", () => this.creatureWorkflow.cancelForm());
    this.elements.saveQuickAccessButton.addEventListener("click", () => this.creatureWorkflow.saveFormToQuickAccess());
    this.elements.cancelEditButton.addEventListener("click", () => this.creatureWorkflow.cancelForm());
    this.elements.type.addEventListener("change", () => this.creatureWorkflow.handleTypeChange());
    this.elements.modal.addEventListener("cancel", () => this.creatureWorkflow.resetForm());
    this.elements.modal.addEventListener("click", (event) => this.creatureWorkflow.closeOnBackdropClick(event));
    this.elements.maxHp.addEventListener("input", () => this.creatureWorkflow.syncCurrentHpLimit());
  }

  bindEncounterEvents() {
    this.elements.startButton.addEventListener("click", () => this.encounterWorkflow.startEncounter());
    this.elements.resetButton.addEventListener("click", () => this.encounterWorkflow.resetEncounter());
    this.elements.damageForm.addEventListener("submit", (event) => this.encounterWorkflow.applyDamage(event));
    this.elements.rollAttackButton.addEventListener("click", () => this.encounterWorkflow.rollAttack());
    this.elements.castSpellButton.addEventListener("click", () => this.encounterWorkflow.castSpell());
    this.elements.nextTurnButton.addEventListener("click", () => this.encounterWorkflow.nextTurn());
  }

  bindSpellEvents() {
    this.elements.openSpellModalButton.addEventListener("click", () => this.attackLibraryWorkflow.openAddSpellModal());
    this.elements.closeSpellModalButton.addEventListener("click", () => this.attackLibraryWorkflow.cancelSpellForm());
    this.elements.cancelSpellButton.addEventListener("click", () => this.attackLibraryWorkflow.cancelSpellForm());
    this.elements.spellForm.addEventListener("submit", (event) => this.attackLibraryWorkflow.upsertSpell(event));
    this.elements.spellDamageMin.addEventListener("input", () =>
      this.attackLibraryWorkflow.syncSpellDamageMaxLimit(),
    );
    this.elements.spellModal.addEventListener("cancel", () => this.attackLibraryWorkflow.resetSpellForm());
    this.elements.spellModal.addEventListener("click", (event) => this.attackLibraryWorkflow.closeSpellOnBackdropClick(event));
  }

  bindWeaponEvents() {
    this.elements.openWeaponModalButton.addEventListener("click", () => this.attackLibraryWorkflow.openAddWeaponModal());
    this.elements.closeWeaponModalButton.addEventListener("click", () => this.attackLibraryWorkflow.cancelWeaponForm());
    this.elements.cancelWeaponButton.addEventListener("click", () => this.attackLibraryWorkflow.cancelWeaponForm());
    this.elements.weaponForm.addEventListener("submit", (event) => this.attackLibraryWorkflow.upsertWeapon(event));
    this.elements.weaponDamageMin.addEventListener("input", () =>
      this.attackLibraryWorkflow.syncWeaponDamageMaxLimit(),
    );
    this.elements.weaponModal.addEventListener("cancel", () => this.attackLibraryWorkflow.resetWeaponForm());
    this.elements.weaponModal.addEventListener("click", (event) => this.attackLibraryWorkflow.closeWeaponOnBackdropClick(event));
  }

  bindListEvents() {
    this.elements.rows.addEventListener("click", (event) => this.listInteractionWorkflow.handleCombatantRowClick(event));
    this.elements.collapseToggleButtons.forEach((button) => {
      button.addEventListener("click", () => this.listInteractionWorkflow.toggleList(button));
    });
    this.elements.characterQuickList.addEventListener("click", (event) => this.listInteractionWorkflow.handleQuickAccessClick(event));
    this.elements.monsterQuickList.addEventListener("click", (event) => this.listInteractionWorkflow.handleQuickAccessClick(event));
    this.elements.managementCharacterQuickList.addEventListener("click", (event) =>
      this.listInteractionWorkflow.handleQuickAccessClick(event),
    );
    this.elements.managementMonsterQuickList.addEventListener("click", (event) =>
      this.listInteractionWorkflow.handleQuickAccessClick(event),
    );
    this.elements.spellQuickList.addEventListener("click", (event) =>
      this.attackLibraryWorkflow.handleSpellQuickAccessClick(event),
    );
    this.elements.weaponQuickList.addEventListener("click", (event) =>
      this.attackLibraryWorkflow.handleWeaponQuickAccessClick(event),
    );
    this.encounterDifficultyController.bindEvents();
  }
}
