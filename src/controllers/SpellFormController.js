import { LibraryAttackFormController } from "./LibraryAttackFormController.js";
import { DEFAULT_SPELL_AREA_RADIUS_FEET, DEFAULT_SPELL_RANGE_FEET, SPELL_TARGET_TYPES } from "../models.js";
import { clampNumber } from "../utils.js";

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
    this.targetTypeInput = elements.spellTargetType;
    this.areaRadiusInput = elements.spellAreaRadius;
    this.readExtra = () => this.readSpellTargeting();
    this.resetExtra = () => this.resetSpellTargeting();
    this.fillExtra = (spell) => this.fillSpellTargeting(spell);
  }

  readSpellTargeting() {
    const targetType = SPELL_TARGET_TYPES.includes(this.targetTypeInput.value)
      ? this.targetTypeInput.value
      : "attack";

    return {
      targetType,
      areaRadiusFeet: targetType === "area"
        ? clampNumber(this.areaRadiusInput.value, 5)
        : 0,
    };
  }

  resetSpellTargeting() {
    this.targetTypeInput.value = "attack";
    this.areaRadiusInput.value = String(DEFAULT_SPELL_AREA_RADIUS_FEET);
  }

  fillSpellTargeting(spell) {
    this.targetTypeInput.value = SPELL_TARGET_TYPES.includes(spell.targetType) ? spell.targetType : "attack";
    this.areaRadiusInput.value = String(spell.areaRadiusFeet || DEFAULT_SPELL_AREA_RADIUS_FEET);
  }
}
