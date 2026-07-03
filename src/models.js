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
  },
});

export const createInitialQuickAccess = () => ({
  character: [],
  monster: [],
  spell: [],
  weapon: [],
});

const readText = (entry, key, fallback = "") => String(entry?.[key] ?? fallback).trim();

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

export const getAttackAbilityScore = (combatant, ability) => {
  const statBlock = combatant?.statBlock ?? {};
  if (ability === "agility") return statBlock.dexterity ?? 10;
  return statBlock[ability] ?? 10;
};

export const getAttackBonus = (combatant, ability) =>
  getAbilityModifier(getAttackAbilityScore(combatant, ability));

export const normalizeMonsterStatBlock = (entry = {}) => {
  const source = entry.statBlock && typeof entry.statBlock === "object" ? entry.statBlock : entry;
  const spellcastingAbility = readText(source, "spellcastingAbility", "intelligence");

  return {
    size: readText(source, "size", "Medium"),
    creatureType: readText(source, "creatureType", "humanoid"),
    alignment: readText(source, "alignment", "unaligned"),
    speed: readText(source, "speed", "30 ft."),
    strength: clampNumber(source.strength ?? source.str ?? 10, 1, 30),
    dexterity: clampNumber(source.dexterity ?? source.dex ?? 10, 1, 30),
    constitution: clampNumber(source.constitution ?? source.con ?? 10, 1, 30),
    intelligence: clampNumber(source.intelligence ?? source.int ?? 10, 1, 30),
    wisdom: clampNumber(source.wisdom ?? source.wis ?? 10, 1, 30),
    charisma: clampNumber(source.charisma ?? source.cha ?? 10, 1, 30),
    savingThrows: readText(source, "savingThrows"),
    skills: readText(source, "skills"),
    damageVulnerabilities: readText(source, "damageVulnerabilities"),
    damageResistances: readText(source, "damageResistances"),
    damageImmunities: readText(source, "damageImmunities"),
    conditionImmunities: readText(source, "conditionImmunities"),
    senses: readText(source, "senses", "passive Perception 10"),
    languages: readText(source, "languages"),
    challengeRating: readText(source, "challengeRating", "0"),
    spellcastingAbility: ["intelligence", "wisdom", "charisma"].includes(spellcastingAbility)
      ? spellcastingAbility
      : "intelligence",
    traits: readText(source, "traits"),
    actions: readText(source, "actions"),
    reactions: readText(source, "reactions"),
    legendaryActions: readText(source, "legendaryActions"),
  };
};

export const normalizeSpell = (entry, idFactory, index = 0) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const description = String(entry.description ?? "").trim();
  const damageMin = clampNumber(entry.damageMin ?? 1, 0);
  const damageMax = clampNumber(entry.damageMax ?? damageMin, damageMin);
  const damageBonus = clampNumber(entry.damageBonus ?? 0, -99);

  if (!name) return null;

  return {
    id: String(entry.id || idFactory("spell", index)),
    name,
    description,
    damageMin,
    damageMax,
    damageBonus,
  };
};

export const normalizeWeapon = (entry, idFactory, index = 0) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const description = String(entry.description ?? "").trim();
  const rawAbility = entry.ability === "agility" ? "dexterity" : entry.ability;
  const ability = ["strength", "dexterity"].includes(rawAbility) ? rawAbility : "strength";
  const damageMin = clampNumber(entry.damageMin ?? 1, 0);
  const damageMax = clampNumber(entry.damageMax ?? damageMin, damageMin);
  const damageBonus = clampNumber(entry.damageBonus ?? 0, -99);

  if (!name) return null;

  return {
    id: String(entry.id || idFactory("weapon", index)),
    name,
    description,
    ability,
    damageMin,
    damageMax,
    damageBonus,
  };
};

export const getCombatantSpeedFeet = (combatant) => {
  if (combatant?.movementFeet) return clampNumber(combatant.movementFeet, TILE_FEET);

  const speedText = String(combatant?.statBlock?.speed ?? combatant?.speed ?? "");
  const speedMatch = speedText.match(/(\d+)\s*ft\.?/i);

  return speedMatch ? clampNumber(speedMatch[1], TILE_FEET) : DEFAULT_MOVEMENT_FEET;
};

export const normalizeCreature = (entry, type, idFactory) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const maxHp = clampNumber(entry.maxHp, 1);
  const currentHp = clampNumber(entry.currentHp ?? maxHp, 0, maxHp);
  const armorClass = clampNumber(entry.armorClass ?? 10, 1);
  const attacksPerTurn = clampNumber(entry.attacksPerTurn ?? 1, 1);
  const spells = Array.isArray(entry.spells)
    ? entry.spells.map((spell, index) => normalizeSpell(spell, idFactory, index)).filter(Boolean)
    : [];
  const weapons = Array.isArray(entry.weapons)
    ? entry.weapons.map((weapon, index) => normalizeWeapon(weapon, idFactory, index)).filter(Boolean)
    : [];
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

export const createSpellEntry = (spell) => ({
  name: spell.name,
  description: spell.description,
  damageMin: spell.damageMin,
  damageMax: spell.damageMax,
  damageBonus: spell.damageBonus,
});

export const createWeaponEntry = (weapon) => ({
  name: weapon.name,
  description: weapon.description,
  ability: weapon.ability,
  damageMin: weapon.damageMin,
  damageMax: weapon.damageMax,
  damageBonus: weapon.damageBonus,
});

export const createQuickAccessEntry = (creature) => ({
  name: creature.name,
  type: creature.type,
  maxHp: creature.maxHp,
  currentHp: creature.currentHp,
  armorClass: creature.armorClass,
  attacksPerTurn: creature.attacksPerTurn,
  movementFeet: getCombatantSpeedFeet(creature),
  ...(creature.type === "monster" ? { statBlock: normalizeMonsterStatBlock(creature) } : {}),
  spells: (creature.spells ?? []).map(createSpellEntry),
  weapons: (creature.weapons ?? []).map(createWeaponEntry),
});

export const getMonsterStatBlockSummary = (monster) => {
  if (monster.type !== "monster" || !monster.statBlock) return "";

  const { size, creatureType, alignment, speed, challengeRating } = monster.statBlock;
  return `${size} ${creatureType}, ${alignment}; Speed ${speed}; CR ${challengeRating}`;
};

export const getDamageText = (attack) => {
  const bonus = attack.damageBonus === 0 ? "" : ` ${formatModifier(attack.damageBonus)}`;
  return `${attack.damageMin}-${attack.damageMax}${bonus}`;
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
