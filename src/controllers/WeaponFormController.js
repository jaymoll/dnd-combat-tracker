import { LibraryAttackFormController } from "./LibraryAttackFormController.js";
import { DEFAULT_WEAPON_RANGE_FEET } from "../models.js";

export class WeaponFormController extends LibraryAttackFormController {
  constructor(elements) {
    super({
      elements,
      modal: elements.weaponModal,
      modalTitle: elements.weaponModalTitle,
      form: elements.weaponForm,
      idInput: elements.weaponId,
      nameInput: elements.weaponName,
      descriptionInput: elements.weaponDescription,
      saveButton: elements.saveWeaponButton,
      openButton: elements.openWeaponModalButton,
      addTitle: "Add Weapon",
      editTitle: "Edit Weapon",
      addButtonText: "Add Weapon",
      editButtonText: "Save Weapon",
      rangeInput: elements.weaponRange,
      defaultRangeFeet: DEFAULT_WEAPON_RANGE_FEET,
      damageInputs: {
        minInput: elements.weaponDamageMin,
        maxInput: elements.weaponDamageMax,
        bonusInput: elements.weaponDamageBonus,
      },
      readExtra: () => ({ ability: elements.weaponAbility.value }),
      resetExtra: () => {
        elements.weaponAbility.value = "strength";
      },
      fillExtra: (weapon) => {
        elements.weaponAbility.value = weapon.ability;
      },
    });
  }
}
