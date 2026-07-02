import { clampNumber } from "../utils.js";

export class WeaponFormController {
  constructor(elements) {
    this.elements = elements;
  }

  open(mode = "add") {
    this.elements.weaponModalTitle.textContent = mode === "edit" ? "Edit Weapon" : "Add Weapon";
    this.elements.saveWeaponButton.textContent = mode === "edit" ? "Save Weapon" : "Add Weapon";
    this.elements.weaponModal.showModal();
    this.elements.weaponName.focus();
  }

  close() {
    if (this.elements.weaponModal.open) {
      this.elements.weaponModal.close();
    }
  }

  read() {
    const name = this.elements.weaponName.value.trim();
    const damageMin = clampNumber(this.elements.weaponDamageMin.value, 0);

    if (!name) return null;

    return {
      name,
      description: this.elements.weaponDescription.value.trim(),
      ability: this.elements.weaponAbility.value,
      damageMin,
      damageMax: clampNumber(this.elements.weaponDamageMax.value, damageMin),
      damageBonus: clampNumber(this.elements.weaponDamageBonus.value, -99),
    };
  }

  reset() {
    this.elements.weaponForm.reset();
    this.elements.weaponId.value = "";
    this.elements.weaponAbility.value = "strength";
    this.elements.weaponDamageMin.value = "1";
    this.elements.weaponDamageMax.value = "1";
    this.elements.weaponDamageBonus.value = "0";
    this.elements.weaponDamageMax.min = "1";
    this.elements.saveWeaponButton.textContent = "Add Weapon";
  }

  fill(weapon) {
    this.elements.weaponId.value = weapon.id;
    this.elements.weaponName.value = weapon.name;
    this.elements.weaponDescription.value = weapon.description;
    this.elements.weaponAbility.value = weapon.ability;
    this.elements.weaponDamageMin.value = weapon.damageMin;
    this.elements.weaponDamageMax.value = weapon.damageMax;
    this.elements.weaponDamageMax.min = weapon.damageMin;
    this.elements.weaponDamageBonus.value = weapon.damageBonus;
    this.open("edit");
  }

  syncDamageMaxLimit() {
    const minDamage = clampNumber(this.elements.weaponDamageMin.value, 0);
    this.elements.weaponDamageMax.min = minDamage;
    if (this.elements.weaponDamageMax.value && Number(this.elements.weaponDamageMax.value) < minDamage) {
      this.elements.weaponDamageMax.value = minDamage;
    }
  }

  renderState(state) {
    const setupDisabled = state.hasStarted;
    this.elements.openWeaponModalButton.disabled = setupDisabled;
    this.elements.saveWeaponButton.disabled = setupDisabled;
  }
}
