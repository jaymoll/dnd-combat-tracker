import { DamageRangeFields } from "./DamageRangeFields.js";

export class LibraryAttackFormController {
  constructor({
    elements,
    modal,
    modalTitle,
    form,
    idInput,
    nameInput,
    descriptionInput,
    saveButton,
    openButton,
    addTitle,
    editTitle,
    addButtonText,
    editButtonText,
    damageInputs,
    readExtra = () => ({}),
    resetExtra = () => {},
    fillExtra = () => {},
  }) {
    this.elements = elements;
    this.modal = modal;
    this.modalTitle = modalTitle;
    this.form = form;
    this.idInput = idInput;
    this.nameInput = nameInput;
    this.descriptionInput = descriptionInput;
    this.saveButton = saveButton;
    this.openButton = openButton;
    this.addTitle = addTitle;
    this.editTitle = editTitle;
    this.addButtonText = addButtonText;
    this.editButtonText = editButtonText;
    this.damageFields = new DamageRangeFields(damageInputs);
    this.readExtra = readExtra;
    this.resetExtra = resetExtra;
    this.fillExtra = fillExtra;
  }

  open(mode = "add") {
    const isEdit = mode === "edit";
    this.modalTitle.textContent = isEdit ? this.editTitle : this.addTitle;
    this.saveButton.textContent = isEdit ? this.editButtonText : this.addButtonText;
    this.modal.showModal();
    this.nameInput.focus();
  }

  close() {
    if (this.modal.open) {
      this.modal.close();
    }
  }

  read() {
    const name = this.nameInput.value.trim();
    if (!name) return null;

    return {
      name,
      description: this.descriptionInput.value.trim(),
      ...this.readExtra(),
      ...this.damageFields.read(),
    };
  }

  reset() {
    this.form.reset();
    this.idInput.value = "";
    this.resetExtra();
    this.damageFields.reset();
    this.saveButton.textContent = this.addButtonText;
  }

  fill(item) {
    this.idInput.value = item.id;
    this.nameInput.value = item.name;
    this.descriptionInput.value = item.description;
    this.fillExtra(item);
    this.damageFields.fill(item);
    this.open("edit");
  }

  syncDamageMaxLimit() {
    this.damageFields.syncMaxLimit();
  }

  renderState(state) {
    const setupDisabled = state.hasStarted;
    this.openButton.disabled = setupDisabled;
    this.saveButton.disabled = setupDisabled;
  }
}
