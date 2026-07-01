import { hasRequiredSides } from "../combat.js";
import { clampNumber, parseInteger } from "../utils.js";

const monsterInputs = (elements) => [
  elements.initiativeBonus,
  elements.toHit,
  elements.damageMin,
  elements.damageMax,
  elements.damageBonus,
];

export class CombatantFormController {
  mode = "encounter";
  libraryEditTarget = null;

  constructor(elements) {
    this.elements = elements;
  }

  syncMonsterFields() {
    const isMonster = this.elements.type.value === "monster";
    this.elements.monsterFields.hidden = !isMonster;

    if (isMonster) {
      if (!this.elements.initiativeBonus.value) this.elements.initiativeBonus.value = "0";
      if (!this.elements.toHit.value) this.elements.toHit.value = "0";
      if (!this.elements.damageMin.value) this.elements.damageMin.value = "1";
      if (!this.elements.damageMax.value) this.elements.damageMax.value = this.elements.damageMin.value;
      if (!this.elements.damageBonus.value) this.elements.damageBonus.value = "0";
      this.elements.damageMax.min = this.elements.damageMin.value;
    }

    monsterInputs(this.elements).forEach((input) => {
      input.disabled = !isMonster;
      input.required = isMonster;
    });
  }

  open(mode = "add") {
    this.elements.modalTitle.textContent =
      mode === "library" ? "Edit Saved Creature" : mode === "edit" ? "Edit Creature" : "Add Creature";
    this.elements.saveButton.textContent = mode === "add" ? "Add" : "Save";
    this.elements.saveQuickAccessButton.hidden = mode === "library";
    this.elements.modal.showModal();
    this.elements.name.focus();
  }

  close() {
    if (this.elements.modal.open) {
      this.elements.modal.close();
    }
  }

  read() {
    const maxHp = clampNumber(this.elements.maxHp.value, 1);
    const currentHp = clampNumber(this.elements.currentHp.value, 0, maxHp);
    const armorClass = clampNumber(this.elements.armorClass.value, 1);
    const attacksPerTurn = clampNumber(this.elements.attacksPerTurn.value, 1);
    const isMonster = this.elements.type.value === "monster";
    const damageMin = isMonster ? clampNumber(this.elements.damageMin.value, 0) : 0;
    const damageMax = isMonster ? clampNumber(this.elements.damageMax.value, damageMin) : 0;
    const name = this.elements.name.value.trim();

    if (!name) return null;

    return {
      name,
      type: this.elements.type.value,
      maxHp,
      currentHp,
      initiative: parseInteger(this.elements.initiative.value),
      armorClass,
      attacksPerTurn,
      initiativeBonus: isMonster ? parseInteger(this.elements.initiativeBonus.value) : 0,
      toHit: isMonster ? parseInteger(this.elements.toHit.value) : 0,
      damageMin,
      damageMax,
      damageBonus: isMonster ? parseInteger(this.elements.damageBonus.value) : 0,
    };
  }

  reset() {
    this.mode = "encounter";
    this.libraryEditTarget = null;
    this.elements.form.reset();
    this.elements.combatantId.value = "";
    this.elements.type.value = "character";
    this.elements.saveButton.textContent = "Add";
    this.elements.currentHp.removeAttribute("max");
    this.elements.maxHp.value = "";
    this.elements.currentHp.value = "";
    this.elements.initiative.value = "";
    this.elements.attacksPerTurn.value = "1";
    this.elements.armorClass.value = "";
    this.elements.initiativeBonus.value = "";
    this.elements.toHit.value = "";
    this.elements.damageMin.value = "";
    this.elements.damageMax.value = "";
    this.elements.damageBonus.value = "";
    this.elements.saveQuickAccessButton.hidden = false;
    this.syncMonsterFields();
  }

  fillCombatant(combatant) {
    this.mode = "encounter";
    this.libraryEditTarget = null;
    this.fillCreatureFields(combatant);
    this.open("edit");
  }

  fillLibraryEntry(entry, type) {
    this.mode = "library";
    this.libraryEditTarget = { id: entry.id, type };
    this.fillCreatureFields({ ...entry, initiative: 0 });
    this.open("library");
  }

  fillCreatureFields(creature) {
    this.elements.combatantId.value = creature.id;
    this.elements.name.value = creature.name;
    this.elements.type.value = creature.type;
    this.elements.maxHp.value = creature.maxHp;
    this.elements.currentHp.value = creature.currentHp;
    this.elements.currentHp.max = creature.maxHp;
    this.elements.initiative.value = creature.initiative;
    this.elements.attacksPerTurn.value = creature.attacksPerTurn;
    this.elements.armorClass.value = creature.armorClass;
    this.elements.initiativeBonus.value = creature.initiativeBonus;
    this.elements.toHit.value = creature.toHit;
    this.elements.damageMin.value = creature.damageMin;
    this.elements.damageMax.value = creature.damageMax;
    this.elements.damageBonus.value = creature.damageBonus;
    this.syncMonsterFields();
  }

  renderState(state) {
    const setupDisabled = state.hasStarted;
    this.elements.name.disabled = setupDisabled;
    this.elements.type.disabled = setupDisabled || this.mode === "library";
    this.elements.maxHp.disabled = setupDisabled;
    this.elements.currentHp.disabled = setupDisabled;
    this.elements.initiative.disabled =
      setupDisabled ||
      this.mode === "library" ||
      (this.elements.type.value === "monster" && !this.elements.combatantId.value);
    this.elements.attacksPerTurn.disabled = setupDisabled;
    this.elements.armorClass.disabled = setupDisabled;
    this.elements.initiativeBonus.disabled = setupDisabled || this.elements.type.value !== "monster";
    this.elements.toHit.disabled = setupDisabled || this.elements.type.value !== "monster";
    this.elements.damageMin.disabled = setupDisabled || this.elements.type.value !== "monster";
    this.elements.damageMax.disabled = setupDisabled || this.elements.type.value !== "monster";
    this.elements.damageBonus.disabled = setupDisabled || this.elements.type.value !== "monster";
    this.elements.openModalButton.disabled = setupDisabled;
    this.elements.saveButton.disabled = setupDisabled;
    this.elements.saveQuickAccessButton.disabled = setupDisabled;
    this.elements.saveQuickAccessButton.hidden = this.mode === "library";
    this.elements.cancelEditButton.disabled = setupDisabled;

    const canStart = !state.hasStarted && hasRequiredSides(state);
    this.elements.startButton.disabled = !canStart;
    this.elements.requirement.textContent = canStart
      ? "Ready to begin."
      : "Start requires at least one character and one monster.";
  }
}
