export class AttackLibraryWorkflow {
  constructor({
    elements,
    spellFormController,
    weaponFormController,
    quickAccessController,
    getState,
    render,
  }) {
    this.elements = elements;
    this.spellFormController = spellFormController;
    this.weaponFormController = weaponFormController;
    this.quickAccessController = quickAccessController;
    this.getState = getState;
    this.render = render;
  }

  openAddSpellModal() {
    if (this.getState().hasStarted) return;

    this.spellFormController.reset();
    this.spellFormController.open("add");
  }

  cancelSpellForm() {
    this.spellFormController.reset();
    this.spellFormController.close();
  }

  openAddWeaponModal() {
    if (this.getState().hasStarted) return;

    this.weaponFormController.reset();
    this.weaponFormController.open("add");
  }

  cancelWeaponForm() {
    this.weaponFormController.reset();
    this.weaponFormController.close();
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
    if (this.getState().hasStarted) return;

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

  async handleSpellQuickAccessClick(event) {
    await this.handleQuickAccessClick(event, "spell", this.spellFormController);
  }

  async handleWeaponQuickAccessClick(event) {
    await this.handleQuickAccessClick(event, "weapon", this.weaponFormController);
  }

  async handleQuickAccessClick(event, type, formController) {
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
    if (!button || this.getState().hasStarted) return null;
    return button;
  }

  syncSpellDamageMaxLimit() {
    this.spellFormController.syncDamageMaxLimit();
  }

  syncWeaponDamageMaxLimit() {
    this.weaponFormController.syncDamageMaxLimit();
  }

  resetSpellForm() {
    this.spellFormController.reset();
  }

  resetWeaponForm() {
    this.weaponFormController.reset();
  }

  closeSpellOnBackdropClick(event) {
    this.closeOnBackdropClick(event, this.elements.spellModal, this.spellFormController);
  }

  closeWeaponOnBackdropClick(event) {
    this.closeOnBackdropClick(event, this.elements.weaponModal, this.weaponFormController);
  }

  closeOnBackdropClick(event, modal, controller) {
    if (event.target !== modal) return;

    controller.reset();
    controller.close();
  }
}
