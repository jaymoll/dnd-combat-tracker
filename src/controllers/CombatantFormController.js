import { hasRequiredSides } from "../combat.js";
import {
  createSpellEntry,
  createWeaponEntry,
  DEFAULT_MOVEMENT_FEET,
  getCombatantSpeedFeet,
} from "../models.js";
import { AssignmentListController } from "./AssignmentListController.js";
import { MonsterStatBlockFields } from "./MonsterStatBlockFields.js";
import { clampNumber, parseInteger } from "../utils.js";

export class CombatantFormController {
  mode = "encounter";
  libraryEditTarget = null;

  constructor(elements) {
    this.elements = elements;
    this.monsterStatBlockFields = new MonsterStatBlockFields(elements);
    this.spellAssignments = new AssignmentListController({
      listElement: elements.spellAssignmentList,
      emptyElement: elements.emptySpellAssignmentList,
      keyFields: ["name", "damageMin", "damageMax", "damageBonus"],
    });
    this.weaponAssignments = new AssignmentListController({
      listElement: elements.weaponAssignmentList,
      emptyElement: elements.emptyWeaponAssignmentList,
      keyFields: ["name", "ability", "damageMin", "damageMax", "damageBonus"],
    });
  }

  setAvailableSpells(spells) {
    this.spellAssignments.setAvailableItems(spells);
  }

  setAvailableWeapons(weapons) {
    this.weaponAssignments.setAvailableItems(weapons);
  }

  syncMonsterFields() {
    const isMonster = this.elements.type.value === "monster";
    this.elements.monsterFields.hidden = !isMonster;

    if (isMonster) {
      this.ensureMonsterStatBlockDefaults();
    }

    this.monsterStatBlockFields.setMonsterEnabled(isMonster);
  }

  open(mode = "add") {
    this.elements.modalTitle.textContent =
      mode === "library-create"
        ? "Add Saved Creature"
        : mode === "library"
          ? "Edit Saved Creature"
          : mode === "edit"
            ? "Edit Creature"
            : "Add Creature";
    this.elements.saveButton.textContent = mode === "add" ? "Add" : "Save";
    this.elements.saveQuickAccessButton.hidden = mode === "library" || mode === "library-create";
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
    const movementFeet = clampNumber(this.elements.movementFeet.value, 5);
    const isMonster = this.elements.type.value === "monster";
    const name = this.elements.name.value.trim();
    const weapons = this.weaponAssignments.getSelectedItems().map(createWeaponEntry);
    const spells = this.spellAssignments.getSelectedItems().map(createSpellEntry);

    if (!name) return null;

    return {
      name,
      type: this.elements.type.value,
      maxHp,
      currentHp,
      initiative: parseInteger(this.elements.initiative.value),
      armorClass,
      attacksPerTurn,
      movementFeet,
      ...(isMonster ? { statBlock: this.readMonsterStatBlock() } : {}),
      weapons,
      spells,
    };
  }

  readMonsterStatBlock() {
    return this.monsterStatBlockFields.read();
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
    this.elements.movementFeet.value = DEFAULT_MOVEMENT_FEET;
    this.clearMonsterStatBlockFields();
    this.elements.saveQuickAccessButton.hidden = false;
    this.weaponAssignments.render();
    this.spellAssignments.render();
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

  prepareLibraryCreate(type) {
    this.reset();
    this.mode = "library-create";
    this.elements.type.value = type;
    this.elements.initiative.value = "0";
    this.syncMonsterFields();
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
    this.elements.movementFeet.value = getCombatantSpeedFeet(creature);
    this.fillMonsterStatBlockFields(creature);
    this.weaponAssignments.render(creature.weapons ?? []);
    this.spellAssignments.render(creature.spells ?? []);
    this.syncMonsterFields();
  }

  ensureMonsterStatBlockDefaults() {
    this.monsterStatBlockFields.ensureDefaults();
  }

  clearMonsterStatBlockFields() {
    this.monsterStatBlockFields.reset();
  }

  fillMonsterStatBlockFields(creature) {
    this.monsterStatBlockFields.fill(creature);
  }

  renderState(state) {
    const setupDisabled = state.hasStarted;

    this.setCreatureFieldsDisabled(setupDisabled);
    this.setAssignmentInputsDisabled(setupDisabled);
    this.setSetupControlsDisabled(setupDisabled);
    this.renderStartRequirement(state);
  }

  setCreatureFieldsDisabled(setupDisabled) {
    this.elements.name.disabled = setupDisabled;
    this.elements.type.disabled = setupDisabled || this.isLibraryMode();
    this.elements.maxHp.disabled = setupDisabled;
    this.elements.currentHp.disabled = setupDisabled;
    this.elements.initiative.disabled =
      setupDisabled ||
      this.isLibraryMode() ||
      (this.elements.type.value === "monster" && !this.elements.combatantId.value);
    this.elements.attacksPerTurn.disabled = setupDisabled;
    this.elements.armorClass.disabled = setupDisabled;
    this.elements.movementFeet.disabled = setupDisabled;
    this.monsterStatBlockFields.setDisabled(setupDisabled || this.elements.type.value !== "monster");
  }

  setAssignmentInputsDisabled(setupDisabled) {
    this.weaponAssignments.setDisabled(setupDisabled);
    this.spellAssignments.setDisabled(setupDisabled);
  }

  setSetupControlsDisabled(setupDisabled) {
    this.elements.openModalButton.disabled = setupDisabled;
    this.elements.libraryCreateButtons.forEach((button) => {
      button.disabled = setupDisabled;
    });
    this.elements.saveButton.disabled = setupDisabled;
    this.elements.saveQuickAccessButton.disabled = setupDisabled;
    this.elements.saveQuickAccessButton.hidden = this.isLibraryMode();
    this.elements.cancelEditButton.disabled = setupDisabled;
  }

  renderStartRequirement(state) {
    const canStart = !state.hasStarted && hasRequiredSides(state);
    this.elements.startButton.disabled = !canStart;
    this.elements.requirement.textContent = canStart
      ? "Ready to begin."
      : "Start requires at least one character and one monster.";
  }

  isLibraryMode() {
    return this.mode === "library" || this.mode === "library-create";
  }
}
