import { clampNumber } from "../utils.js";

export class SpellFormController {
  constructor(elements) {
    this.elements = elements;
  }

  open(mode = "add") {
    this.elements.spellModalTitle.textContent = mode === "edit" ? "Edit Spell" : "Add Spell";
    this.elements.saveSpellButton.textContent = mode === "edit" ? "Save Spell" : "Add Spell";
    this.elements.spellModal.showModal();
    this.elements.spellName.focus();
  }

  close() {
    if (this.elements.spellModal.open) {
      this.elements.spellModal.close();
    }
  }

  read() {
    const name = this.elements.spellName.value.trim();
    const damageMin = clampNumber(this.elements.spellDamageMin.value, 0);

    if (!name) return null;

    return {
      name,
      description: this.elements.spellDescription.value.trim(),
      damageMin,
      damageMax: clampNumber(this.elements.spellDamageMax.value, damageMin),
      damageBonus: clampNumber(this.elements.spellDamageBonus.value, -99),
    };
  }

  reset() {
    this.elements.spellForm.reset();
    this.elements.spellId.value = "";
    this.elements.spellDamageMin.value = "1";
    this.elements.spellDamageMax.value = "1";
    this.elements.spellDamageBonus.value = "0";
    this.elements.spellDamageMax.min = "1";
    this.elements.saveSpellButton.textContent = "Add Spell";
  }

  fill(spell) {
    this.elements.spellId.value = spell.id;
    this.elements.spellName.value = spell.name;
    this.elements.spellDescription.value = spell.description;
    this.elements.spellDamageMin.value = spell.damageMin;
    this.elements.spellDamageMax.value = spell.damageMax;
    this.elements.spellDamageMax.min = spell.damageMin;
    this.elements.spellDamageBonus.value = spell.damageBonus;
    this.open("edit");
  }

  syncDamageMaxLimit() {
    const minDamage = clampNumber(this.elements.spellDamageMin.value, 0);
    this.elements.spellDamageMax.min = minDamage;
    if (this.elements.spellDamageMax.value && Number(this.elements.spellDamageMax.value) < minDamage) {
      this.elements.spellDamageMax.value = minDamage;
    }
  }

  renderState(state) {
    const setupDisabled = state.hasStarted;
    this.elements.openSpellModalButton.disabled = setupDisabled;
    this.elements.saveSpellButton.disabled = setupDisabled;
  }
}
