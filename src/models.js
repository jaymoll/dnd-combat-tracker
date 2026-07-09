import { clampNumber, formatModifier } from "./utils.js";

export const createInitialState = () => ({
  combatants: [],
  hasStarted: false,
  currentTurnIndex: 0,
  attacksUsedThisTurn: 0,
  movementUsedThisTurn: 0,
  isFinished: false,
  winner: null,
  nextOrder: 0,
  battleMap: {
    gridType: "square",
    width: 18,
    height: 12,
    zoom: 100,
  },
});

export const createInitialQuickAccess = () => ({
  character: [],
  monster: [],
  spell: [],
  weapon: [],
});

const readText = (entry, key, fallback = "") => String(entry?.[key] ?? fallback).trim();

const monsterIdentityFields = [
  ["size", "Medium"],
  ["creatureType", "humanoid"],
  ["alignment", "unaligned"],
  ["speed", "30 ft."],
];

const monsterAbilityFields = [
  ["strength", "str"],
  ["dexterity", "dex"],
  ["constitution", "con"],
  ["intelligence", "int"],
  ["wisdom", "wis"],
  ["charisma", "cha"],
];

const monsterDefenseFields = [
  ["savingThrows", ""],
  ["skills", ""],
  ["damageVulnerabilities", ""],
  ["damageResistances", ""],
  ["damageImmunities", ""],
  ["conditionImmunities", ""],
  ["senses", "passive Perception 10"],
  ["languages", ""],
  ["challengeRating", "0"],
];

const monsterActionFields = [
  ["traits", ""],
  ["actions", ""],
  ["reactions", ""],
  ["legendaryActions", ""],
];

const readTextFields = (source, fields) =>
  Object.fromEntries(fields.map(([field, fallback]) => [field, readText(source, field, fallback)]));

const readAbilityFields = (source) =>
  Object.fromEntries(
    monsterAbilityFields.map(([field, alias]) => [field, clampNumber(source[field] ?? source[alias] ?? 10, 1, 30)]),
  );

const readProficiencyBonus = (source) =>
  clampNumber(
    source.proficiencyBonus ?? source.proficiency ?? source.profBonus ?? source.prof ?? source.pb ?? 0,
    0,
  );

const readSpellcastingAbility = (source) => {
  const spellcastingAbility = readText(source, "spellcastingAbility", "intelligence");
  return ["intelligence", "wisdom", "charisma"].includes(spellcastingAbility)
    ? spellcastingAbility
    : "intelligence";
};

export const CONDITION_OPTIONS = [
  { value: "blinded", label: "Blinded" },
  { value: "charmed", label: "Charmed" },
  { value: "deafened", label: "Deafened" },
  { value: "exhaustion", label: "Exhaustion" },
  { value: "frightened", label: "Frightened" },
  { value: "grappled", label: "Grappled" },
  { value: "incapacitated", label: "Incapacitated" },
  { value: "invisible", label: "Invisible" },
  { value: "paralyzed", label: "Paralyzed" },
  { value: "petrified", label: "Petrified" },
  { value: "poisoned", label: "Poisoned" },
  { value: "prone", label: "Prone" },
  { value: "restrained", label: "Restrained" },
  { value: "stunned", label: "Stunned" },
  { value: "unconscious", label: "Unconscious" },
];

const conditionValues = new Set(CONDITION_OPTIONS.map((condition) => condition.value));

export const DEFAULT_MOVEMENT_FEET = 30;

export const TILE_FEET = 5;

export const DEFAULT_WEAPON_RANGE_FEET = 5;

export const DEFAULT_SPELL_RANGE_FEET = 60;

export const DEFAULT_SPELL_AREA_RADIUS_FEET = 10;

export const SPELL_TARGET_TYPES = ["attack", "area"];

export const isAreaSpell = (spell) => spell?.targetType === "area" || clampNumber(spell?.areaRadiusFeet ?? 0, 0) > 0;

export const normalizeConditionValue = (condition) => {
  const value = String(condition?.value ?? condition ?? "").trim().toLowerCase();
  return conditionValues.has(value) ? value : "";
};

export const normalizeConditions = (conditions) => {
  if (!Array.isArray(conditions)) return [];

  return [...new Set(conditions.map(normalizeConditionValue).filter(Boolean))];
};

export const getConditionLabel = (condition) => {
  const value = normalizeConditionValue(condition);
  return CONDITION_OPTIONS.find((option) => option.value === value)?.label ?? String(condition ?? "").trim();
};

export const hasConditionImmunity = (combatant, condition) => {
  if (combatant?.type !== "monster") return false;

  const value = normalizeConditionValue(condition);
  const label = getConditionLabel(value).toLowerCase();
  const immunities = String(combatant.statBlock?.conditionImmunities ?? "")
    .toLowerCase()
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return immunities.some((immunity) => immunity === value || immunity === label || immunity.includes(value));
};

export const getAbilityModifier = (score) => Math.floor((clampNumber(score, 1, 30) - 10) / 2);

export const getMonsterProficiencyBonus = (combatant) =>
  clampNumber(combatant?.statBlock?.proficiencyBonus ?? 0, 0);

const getAttackAbilityScore = (combatant, ability) => {
  const statBlock = combatant?.statBlock ?? {};
  if (ability === "agility") return statBlock.dexterity ?? 10;
  return statBlock[ability] ?? 10;
};

export const getAttackAbilityModifier = (combatant, ability) =>
  getAbilityModifier(getAttackAbilityScore(combatant, ability));

export const getAttackBonus = (combatant, ability) =>
  getAttackAbilityModifier(combatant, ability) + getMonsterProficiencyBonus(combatant);

export const normalizeMonsterStatBlock = (entry = {}) => {
  const source = entry.statBlock && typeof entry.statBlock === "object" ? entry.statBlock : entry;

  return {
    ...readTextFields(source, monsterIdentityFields),
    ...readAbilityFields(source),
    ...readTextFields(source, monsterDefenseFields),
    proficiencyBonus: readProficiencyBonus(source),
    spellcastingAbility: readSpellcastingAbility(source),
    ...readTextFields(source, monsterActionFields),
  };
};

const normalizeDamageRange = (entry) => {
  const damageMin = clampNumber(entry.damageMin ?? 1, 0);

  return {
    damageMin,
    damageMax: clampNumber(entry.damageMax ?? damageMin, damageMin),
    damageBonus: clampNumber(entry.damageBonus ?? 0, -99),
  };
};

const normalizeAttackRange = (entry, fallback) =>
  clampNumber(entry.rangeFeet ?? entry.range ?? fallback, 0);

export const normalizeSpell = (entry, idFactory, index = 0) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const description = String(entry.description ?? "").trim();
  const damage = normalizeDamageRange(entry);
  const rangeFeet = normalizeAttackRange(entry, DEFAULT_SPELL_RANGE_FEET);
  const targetType = SPELL_TARGET_TYPES.includes(entry.targetType)
    ? entry.targetType
    : clampNumber(entry.areaRadiusFeet ?? entry.areaRadius ?? 0, 0) > 0
      ? "area"
      : "attack";
  const areaRadiusFeet = targetType === "area"
    ? clampNumber(entry.areaRadiusFeet ?? entry.areaRadius ?? DEFAULT_SPELL_AREA_RADIUS_FEET, TILE_FEET)
    : 0;

  if (!name) return null;

  return {
    id: String(entry.id || idFactory("spell", index)),
    name,
    description,
    targetType,
    rangeFeet,
    areaRadiusFeet,
    ...damage,
  };
};

export const normalizeWeapon = (entry, idFactory, index = 0) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const description = String(entry.description ?? "").trim();
  const rawAbility = entry.ability === "agility" ? "dexterity" : entry.ability;
  const ability = ["strength", "dexterity"].includes(rawAbility) ? rawAbility : "strength";
  const damage = normalizeDamageRange(entry);
  const rangeFeet = normalizeAttackRange(entry, DEFAULT_WEAPON_RANGE_FEET);

  if (!name) return null;

  return {
    id: String(entry.id || idFactory("weapon", index)),
    name,
    description,
    ability,
    rangeFeet,
    ...damage,
  };
};

export const getCombatantSpeedFeet = (combatant) => {
  if (combatant?.movementFeet) return clampNumber(combatant.movementFeet, TILE_FEET);

  const speedText = String(combatant?.statBlock?.speed ?? combatant?.speed ?? "");
  const speedMatch = speedText.match(/(\d+)\s*ft\.?/i);

  return speedMatch ? clampNumber(speedMatch[1], TILE_FEET) : DEFAULT_MOVEMENT_FEET;
};

const normalizeAttackList = (items, normalizer, idFactory) =>
  Array.isArray(items)
    ? items.map((item, index) => normalizer(item, idFactory, index)).filter(Boolean)
    : [];

export const normalizeCreature = (entry, type, idFactory) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const maxHp = clampNumber(entry.maxHp, 1);
  const currentHp = clampNumber(entry.currentHp ?? maxHp, 0, maxHp);
  const armorClass = clampNumber(entry.armorClass ?? 10, 1);
  const attacksPerTurn = clampNumber(entry.attacksPerTurn ?? 1, 1);
  const spells = normalizeAttackList(entry.spells, normalizeSpell, idFactory);
  const weapons = normalizeAttackList(entry.weapons, normalizeWeapon, idFactory);
  const statBlock = type === "monster" ? normalizeMonsterStatBlock(entry) : null;
  const movementFeet = getCombatantSpeedFeet({ ...entry, ...(statBlock ? { statBlock } : {}) });

  if (!name) return null;

  return {
    id: String(entry.id || idFactory(type)),
    name,
    type,
    maxHp,
    currentHp,
    armorClass,
    attacksPerTurn,
    movementFeet,
    conditions: normalizeConditions(entry.conditions),
    spells,
    weapons,
    ...(statBlock ? { statBlock } : {}),
  };
};

const createDamageEntry = (attack, defaultRangeFeet) => ({
  rangeFeet: normalizeAttackRange(attack, defaultRangeFeet),
  damageMin: attack.damageMin,
  damageMax: attack.damageMax,
  damageBonus: attack.damageBonus,
});

export const createSpellEntry = (spell) => ({
  name: spell.name,
  description: spell.description,
  targetType: isAreaSpell(spell) ? "area" : "attack",
  areaRadiusFeet: isAreaSpell(spell) ? clampNumber(spell.areaRadiusFeet, TILE_FEET) : 0,
  ...createDamageEntry(spell, DEFAULT_SPELL_RANGE_FEET),
});

export const createWeaponEntry = (weapon) => ({
  name: weapon.name,
  description: weapon.description,
  ability: weapon.ability,
  ...createDamageEntry(weapon, DEFAULT_WEAPON_RANGE_FEET),
});

export const createCreatureEntry = (creature) => ({
  name: creature.name,
  maxHp: creature.maxHp,
  currentHp: creature.currentHp,
  armorClass: creature.armorClass,
  attacksPerTurn: creature.attacksPerTurn,
  movementFeet: getCombatantSpeedFeet(creature),
  ...(creature.type === "monster" ? { statBlock: normalizeMonsterStatBlock(creature) } : {}),
  spells: (creature.spells ?? []).map(createSpellEntry),
  weapons: (creature.weapons ?? []).map(createWeaponEntry),
});

export const createQuickAccessEntry = (creature) => ({
  ...createCreatureEntry(creature),
  type: creature.type,
});

export const getMonsterStatBlockSummary = (monster) => {
  if (monster.type !== "monster" || !monster.statBlock) return "";

  const { size, creatureType, alignment, speed, challengeRating } = monster.statBlock;
  return `${size} ${creatureType}, ${alignment}; Speed ${speed}; CR ${challengeRating}`;
};

export const getDamageText = (attack) => {
  const bonus = attack.damageBonus === 0 ? "" : ` ${formatModifier(attack.damageBonus)}`;
  const areaText = isAreaSpell(attack) ? `, ${attack.areaRadiusFeet} ft area` : "";
  return `${attack.damageMin}-${attack.damageMax}${bonus}, ${attack.rangeFeet} ft${areaText}`;
};

export const getWeaponText = (weapon) =>
  `${weapon.ability === "dexterity" ? "Dexterity" : "Strength"}, ${getDamageText(weapon)}`;

export const getAttackText = (combatant) => {
  const details = [];

  if ((combatant.weapons ?? []).length > 0) {
    details.push(`${combatant.weapons.length} weapon${combatant.weapons.length === 1 ? "" : "s"}`);
  }

  if ((combatant.spells ?? []).length > 0) {
    details.push(`${combatant.spells.length} spell${combatant.spells.length === 1 ? "" : "s"}`);
  }

  return details.length > 0 ? details.join("; ") : "-";
};

export const createBattleMapPosition = (type, order = 0) => {
  const lane = order % 10;
  const row = 1 + lane;

  return type === "monster" ? { x: 15, y: row } : { x: 2, y: row };
};

export const getCombatantMovementTiles = (combatant) =>
  Math.floor(getCombatantSpeedFeet(combatant) / TILE_FEET);
