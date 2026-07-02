import { hasRequiredSides } from "../combat.js";
import { normalizeMonsterStatBlock } from "../models.js";
import { clampNumber, escapeHtml, parseInteger } from "../utils.js";

const monsterStatBlockInputs = (elements) => [
  elements.monsterSize,
  elements.monsterCreatureType,
  elements.monsterAlignment,
  elements.monsterSpeed,
  elements.monsterStrength,
  elements.monsterDexterity,
  elements.monsterConstitution,
  elements.monsterIntelligence,
  elements.monsterWisdom,
  elements.monsterCharisma,
  elements.monsterSpellcastingAbility,
  elements.monsterSavingThrows,
  elements.monsterSkills,
  elements.monsterDamageVulnerabilities,
  elements.monsterDamageResistances,
  elements.monsterDamageImmunities,
  elements.monsterConditionImmunities,
  elements.monsterSenses,
  elements.monsterLanguages,
  elements.monsterChallengeRating,
  elements.monsterTraits,
  elements.monsterActions,
  elements.monsterReactions,
  elements.monsterLegendaryActions,
];

export class CombatantFormController {
  mode = "encounter";
  libraryEditTarget = null;
  availableSpells = [];
  availableWeapons = [];

  constructor(elements) {
    this.elements = elements;
  }

  setAvailableSpells(spells) {
    this.availableSpells = spells ?? [];
    this.renderSpellAssignments();
  }

  setAvailableWeapons(weapons) {
    this.availableWeapons = weapons ?? [];
    this.renderWeaponAssignments();
  }

  syncMonsterFields() {
    const isMonster = this.elements.type.value === "monster";
    this.elements.monsterFields.hidden = !isMonster;

    if (isMonster) {
      this.ensureMonsterStatBlockDefaults();
    }

    monsterStatBlockInputs(this.elements).forEach((input) => {
      input.disabled = !isMonster;
      input.required = false;
    });
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
    const isMonster = this.elements.type.value === "monster";
    const name = this.elements.name.value.trim();
    const weapons = Array.from(
      this.elements.weaponAssignmentList.querySelectorAll("input[type='checkbox']:checked"),
    )
      .map((input) => this.availableWeapons[Number(input.value)])
      .filter(Boolean)
      .map((weapon) => ({
        name: weapon.name,
        description: weapon.description,
        ability: weapon.ability,
        damageMin: weapon.damageMin,
        damageMax: weapon.damageMax,
        damageBonus: weapon.damageBonus,
      }));
    const spells = Array.from(
      this.elements.spellAssignmentList.querySelectorAll("input[type='checkbox']:checked"),
    )
      .map((input) => this.availableSpells[Number(input.value)])
      .filter(Boolean)
      .map((spell) => ({
        name: spell.name,
        description: spell.description,
        damageMin: spell.damageMin,
        damageMax: spell.damageMax,
        damageBonus: spell.damageBonus,
      }));

    if (!name) return null;

    return {
      name,
      type: this.elements.type.value,
      maxHp,
      currentHp,
      initiative: parseInteger(this.elements.initiative.value),
      armorClass,
      attacksPerTurn,
      ...(isMonster ? { statBlock: this.readMonsterStatBlock() } : {}),
      weapons,
      spells,
    };
  }

  readMonsterStatBlock() {
    return normalizeMonsterStatBlock({
      size: this.elements.monsterSize.value,
      creatureType: this.elements.monsterCreatureType.value,
      alignment: this.elements.monsterAlignment.value,
      speed: this.elements.monsterSpeed.value,
      strength: this.elements.monsterStrength.value,
      dexterity: this.elements.monsterDexterity.value,
      constitution: this.elements.monsterConstitution.value,
      intelligence: this.elements.monsterIntelligence.value,
      wisdom: this.elements.monsterWisdom.value,
      charisma: this.elements.monsterCharisma.value,
      spellcastingAbility: this.elements.monsterSpellcastingAbility.value,
      savingThrows: this.elements.monsterSavingThrows.value,
      skills: this.elements.monsterSkills.value,
      damageVulnerabilities: this.elements.monsterDamageVulnerabilities.value,
      damageResistances: this.elements.monsterDamageResistances.value,
      damageImmunities: this.elements.monsterDamageImmunities.value,
      conditionImmunities: this.elements.monsterConditionImmunities.value,
      senses: this.elements.monsterSenses.value,
      languages: this.elements.monsterLanguages.value,
      challengeRating: this.elements.monsterChallengeRating.value,
      traits: this.elements.monsterTraits.value,
      actions: this.elements.monsterActions.value,
      reactions: this.elements.monsterReactions.value,
      legendaryActions: this.elements.monsterLegendaryActions.value,
    });
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
    this.clearMonsterStatBlockFields();
    this.elements.saveQuickAccessButton.hidden = false;
    this.renderWeaponAssignments();
    this.renderSpellAssignments();
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
    this.fillMonsterStatBlockFields(creature);
    this.renderWeaponAssignments(creature.weapons ?? []);
    this.renderSpellAssignments(creature.spells ?? []);
    this.syncMonsterFields();
  }

  ensureMonsterStatBlockDefaults() {
    const defaults = normalizeMonsterStatBlock({});
    if (!this.elements.monsterSize.value) this.elements.monsterSize.value = defaults.size;
    if (!this.elements.monsterCreatureType.value) this.elements.monsterCreatureType.value = defaults.creatureType;
    if (!this.elements.monsterAlignment.value) this.elements.monsterAlignment.value = defaults.alignment;
    if (!this.elements.monsterSpeed.value) this.elements.monsterSpeed.value = defaults.speed;
    if (!this.elements.monsterStrength.value) this.elements.monsterStrength.value = defaults.strength;
    if (!this.elements.monsterDexterity.value) this.elements.monsterDexterity.value = defaults.dexterity;
    if (!this.elements.monsterConstitution.value) this.elements.monsterConstitution.value = defaults.constitution;
    if (!this.elements.monsterIntelligence.value) this.elements.monsterIntelligence.value = defaults.intelligence;
    if (!this.elements.monsterWisdom.value) this.elements.monsterWisdom.value = defaults.wisdom;
    if (!this.elements.monsterCharisma.value) this.elements.monsterCharisma.value = defaults.charisma;
    if (!this.elements.monsterSpellcastingAbility.value) {
      this.elements.monsterSpellcastingAbility.value = defaults.spellcastingAbility;
    }
    if (!this.elements.monsterSenses.value) this.elements.monsterSenses.value = defaults.senses;
    if (!this.elements.monsterChallengeRating.value) {
      this.elements.monsterChallengeRating.value = defaults.challengeRating;
    }
  }

  clearMonsterStatBlockFields() {
    monsterStatBlockInputs(this.elements).forEach((input) => {
      input.value = "";
    });
  }

  fillMonsterStatBlockFields(creature) {
    const statBlock = normalizeMonsterStatBlock(creature);

    this.elements.monsterSize.value = statBlock.size;
    this.elements.monsterCreatureType.value = statBlock.creatureType;
    this.elements.monsterAlignment.value = statBlock.alignment;
    this.elements.monsterSpeed.value = statBlock.speed;
    this.elements.monsterStrength.value = statBlock.strength;
    this.elements.monsterDexterity.value = statBlock.dexterity;
    this.elements.monsterConstitution.value = statBlock.constitution;
    this.elements.monsterIntelligence.value = statBlock.intelligence;
    this.elements.monsterWisdom.value = statBlock.wisdom;
    this.elements.monsterCharisma.value = statBlock.charisma;
    this.elements.monsterSpellcastingAbility.value = statBlock.spellcastingAbility;
    this.elements.monsterSavingThrows.value = statBlock.savingThrows;
    this.elements.monsterSkills.value = statBlock.skills;
    this.elements.monsterDamageVulnerabilities.value = statBlock.damageVulnerabilities;
    this.elements.monsterDamageResistances.value = statBlock.damageResistances;
    this.elements.monsterDamageImmunities.value = statBlock.damageImmunities;
    this.elements.monsterConditionImmunities.value = statBlock.conditionImmunities;
    this.elements.monsterSenses.value = statBlock.senses;
    this.elements.monsterLanguages.value = statBlock.languages;
    this.elements.monsterChallengeRating.value = statBlock.challengeRating;
    this.elements.monsterTraits.value = statBlock.traits;
    this.elements.monsterActions.value = statBlock.actions;
    this.elements.monsterReactions.value = statBlock.reactions;
    this.elements.monsterLegendaryActions.value = statBlock.legendaryActions;
  }

  renderSpellAssignments(selectedSpells = this.getSelectedSpellsFromForm()) {
    const selectedKeys = new Set(selectedSpells.map((spell) => this.getSpellKey(spell)));

    this.elements.emptySpellAssignmentList.hidden = this.availableSpells.length > 0;
    this.elements.spellAssignmentList.innerHTML = this.availableSpells
      .map(
        (spell, index) => `<label class="spell-choice">
          <input type="checkbox" value="${index}" ${selectedKeys.has(this.getSpellKey(spell)) ? "checked" : ""} />
          <span>${escapeHtml(spell.name)}</span>
        </label>`,
      )
      .join("");
  }

  renderWeaponAssignments(selectedWeapons = this.getSelectedWeaponsFromForm()) {
    const selectedKeys = new Set(selectedWeapons.map((weapon) => this.getWeaponKey(weapon)));

    this.elements.emptyWeaponAssignmentList.hidden = this.availableWeapons.length > 0;
    this.elements.weaponAssignmentList.innerHTML = this.availableWeapons
      .map(
        (weapon, index) => `<label class="spell-choice">
          <input type="checkbox" value="${index}" ${selectedKeys.has(this.getWeaponKey(weapon)) ? "checked" : ""} />
          <span>${escapeHtml(weapon.name)}</span>
        </label>`,
      )
      .join("");
  }

  getSelectedWeaponsFromForm() {
    return Array.from(this.elements.weaponAssignmentList.querySelectorAll("input[type='checkbox']:checked"))
      .map((input) => this.availableWeapons[Number(input.value)])
      .filter(Boolean);
  }

  getSelectedSpellsFromForm() {
    return Array.from(this.elements.spellAssignmentList.querySelectorAll("input[type='checkbox']:checked"))
      .map((input) => this.availableSpells[Number(input.value)])
      .filter(Boolean);
  }

  getSpellKey(spell) {
    return [spell.name, spell.damageMin, spell.damageMax, spell.damageBonus].join("|");
  }

  getWeaponKey(weapon) {
    return [weapon.name, weapon.ability, weapon.damageMin, weapon.damageMax, weapon.damageBonus].join("|");
  }

  renderState(state) {
    const setupDisabled = state.hasStarted;
    this.elements.name.disabled = setupDisabled;
    this.elements.type.disabled = setupDisabled || this.mode === "library" || this.mode === "library-create";
    this.elements.maxHp.disabled = setupDisabled;
    this.elements.currentHp.disabled = setupDisabled;
    this.elements.initiative.disabled =
      setupDisabled ||
      this.mode === "library" ||
      this.mode === "library-create" ||
      (this.elements.type.value === "monster" && !this.elements.combatantId.value);
    this.elements.attacksPerTurn.disabled = setupDisabled;
    this.elements.armorClass.disabled = setupDisabled;
    monsterStatBlockInputs(this.elements).forEach((input) => {
      input.disabled = setupDisabled || this.elements.type.value !== "monster";
    });
    this.elements.weaponAssignmentList
      .querySelectorAll("input")
      .forEach((input) => {
        input.disabled = setupDisabled;
      });
    this.elements.spellAssignmentList
      .querySelectorAll("input")
      .forEach((input) => {
        input.disabled = setupDisabled;
      });
    this.elements.openModalButton.disabled = setupDisabled;
    this.elements.libraryCreateButtons.forEach((button) => {
      button.disabled = setupDisabled;
    });
    this.elements.saveButton.disabled = setupDisabled;
    this.elements.saveQuickAccessButton.disabled = setupDisabled;
    this.elements.saveQuickAccessButton.hidden = this.mode === "library" || this.mode === "library-create";
    this.elements.cancelEditButton.disabled = setupDisabled;

    const canStart = !state.hasStarted && hasRequiredSides(state);
    this.elements.startButton.disabled = !canStart;
    this.elements.requirement.textContent = canStart
      ? "Ready to begin."
      : "Start requires at least one character and one monster.";
  }
}
