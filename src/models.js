import { clampNumber, formatModifier } from "./utils.js";

export const createInitialState = () => ({
  combatants: [],
  hasStarted: false,
  currentTurnIndex: 0,
  attacksUsedThisTurn: 0,
  isFinished: false,
  winner: null,
  nextOrder: 0,
});

export const createInitialQuickAccess = () => ({
  character: [],
  monster: [],
});

export const normalizeCreature = (entry, type, idFactory) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const maxHp = clampNumber(entry.maxHp, 1);
  const currentHp = clampNumber(entry.currentHp ?? maxHp, 0, maxHp);
  const armorClass = clampNumber(entry.armorClass ?? 10, 1);
  const attacksPerTurn = clampNumber(entry.attacksPerTurn ?? 1, 1);
  const initiativeBonus = clampNumber(entry.initiativeBonus ?? 0, -99);
  const toHit = clampNumber(entry.toHit ?? 0, -99);
  const damageMin = clampNumber(entry.damageMin ?? 1, 0);
  const damageMax = clampNumber(entry.damageMax ?? damageMin, damageMin);
  const damageBonus = clampNumber(entry.damageBonus ?? 0, -99);

  if (!name) return null;

  return {
    id: String(entry.id || idFactory(type)),
    name,
    type,
    maxHp,
    currentHp,
    armorClass,
    attacksPerTurn,
    initiativeBonus,
    toHit,
    damageMin,
    damageMax,
    damageBonus,
  };
};

export const createQuickAccessEntry = (creature) => ({
  name: creature.name,
  type: creature.type,
  maxHp: creature.maxHp,
  currentHp: creature.currentHp,
  armorClass: creature.armorClass,
  attacksPerTurn: creature.attacksPerTurn,
  initiativeBonus: creature.initiativeBonus,
  toHit: creature.toHit,
  damageMin: creature.damageMin,
  damageMax: creature.damageMax,
  damageBonus: creature.damageBonus,
});

export const getDamageText = (combatant) => {
  if (combatant.type !== "monster") return "-";
  const bonus = combatant.damageBonus === 0 ? "" : ` ${formatModifier(combatant.damageBonus)}`;
  return `${formatModifier(combatant.toHit)} hit, ${combatant.damageMin}-${combatant.damageMax}${bonus}`;
};
