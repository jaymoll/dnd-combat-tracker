import { normalizeMonsterStatBlock } from "../models.js";

const monsterStatBlockFields = [
  ["size", "monsterSize"],
  ["creatureType", "monsterCreatureType"],
  ["alignment", "monsterAlignment"],
  ["speed", "monsterSpeed"],
  ["strength", "monsterStrength"],
  ["dexterity", "monsterDexterity"],
  ["constitution", "monsterConstitution"],
  ["intelligence", "monsterIntelligence"],
  ["wisdom", "monsterWisdom"],
  ["charisma", "monsterCharisma"],
  ["spellcastingAbility", "monsterSpellcastingAbility"],
  ["savingThrows", "monsterSavingThrows"],
  ["skills", "monsterSkills"],
  ["damageVulnerabilities", "monsterDamageVulnerabilities"],
  ["damageResistances", "monsterDamageResistances"],
  ["damageImmunities", "monsterDamageImmunities"],
  ["conditionImmunities", "monsterConditionImmunities"],
  ["senses", "monsterSenses"],
  ["languages", "monsterLanguages"],
  ["challengeRating", "monsterChallengeRating"],
  ["traits", "monsterTraits"],
  ["actions", "monsterActions"],
  ["reactions", "monsterReactions"],
  ["legendaryActions", "monsterLegendaryActions"],
];

export class MonsterStatBlockFields {
  constructor(elements) {
    this.elements = elements;
    this.fields = monsterStatBlockFields.map(([statName, elementName]) => ({
      statName,
      input: elements[elementName],
    }));
  }

  get inputs() {
    return this.fields.map((field) => field.input);
  }

  read() {
    return normalizeMonsterStatBlock(
      Object.fromEntries(this.fields.map(({ statName, input }) => [statName, input.value])),
    );
  }

  reset() {
    this.inputs.forEach((input) => {
      input.value = "";
    });
  }

  fill(creature) {
    const statBlock = normalizeMonsterStatBlock(creature);

    this.fields.forEach(({ statName, input }) => {
      input.value = statBlock[statName];
    });
  }

  ensureDefaults() {
    const defaults = normalizeMonsterStatBlock({});

    this.fields.forEach(({ statName, input }) => {
      if (!input.value && defaults[statName] !== "") {
        input.value = defaults[statName];
      }
    });
  }

  setMonsterEnabled(isMonster) {
    this.inputs.forEach((input) => {
      input.disabled = !isMonster;
      input.required = false;
    });
  }

  setDisabled(disabled) {
    this.inputs.forEach((input) => {
      input.disabled = disabled;
    });
  }
}
