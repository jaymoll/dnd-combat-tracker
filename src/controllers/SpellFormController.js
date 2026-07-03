import { LibraryAttackFormController } from "./LibraryAttackFormController.js";

export class SpellFormController extends LibraryAttackFormController {
  constructor(elements) {
    super({
      elements,
      modal: elements.spellModal,
      modalTitle: elements.spellModalTitle,
      form: elements.spellForm,
      idInput: elements.spellId,
      nameInput: elements.spellName,
      descriptionInput: elements.spellDescription,
      saveButton: elements.saveSpellButton,
      openButton: elements.openSpellModalButton,
      addTitle: "Add Spell",
      editTitle: "Edit Spell",
      addButtonText: "Add Spell",
      editButtonText: "Save Spell",
      damageInputs: {
        minInput: elements.spellDamageMin,
        maxInput: elements.spellDamageMax,
        bonusInput: elements.spellDamageBonus,
      },
    });
  }
}
