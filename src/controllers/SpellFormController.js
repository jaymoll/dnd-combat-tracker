import { LibraryAttackFormController } from "./LibraryAttackFormController.js";
import { DEFAULT_SPELL_RANGE_FEET } from "../models.js";

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
      rangeInput: elements.spellRange,
      defaultRangeFeet: DEFAULT_SPELL_RANGE_FEET,
      damageInputs: {
        minInput: elements.spellDamageMin,
        maxInput: elements.spellDamageMax,
        bonusInput: elements.spellDamageBonus,
      },
    });
  }
}
