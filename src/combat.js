import { clampNumber } from "./utils.js";

export const byInitiative = (a, b) => {
  if (b.initiative !== a.initiative) return b.initiative - a.initiative;
  return a.order - b.order;
};

export const sortedCombatants = (state) => [...state.combatants].sort(byInitiative);

export const hasRequiredSides = (state) => {
  const livingCharacters = state.combatants.some((combatant) => combatant.type === "character");
  const livingMonsters = state.combatants.some((combatant) => combatant.type === "monster");
  return livingCharacters && livingMonsters;
};

export const getActiveCombatant = (state) => sortedCombatants(state)[state.currentTurnIndex] ?? null;

export const activeCombatantCanAct = (state) => {
  const active = getActiveCombatant(state);
  return active && !active.isDefeated && state.hasStarted && !state.isFinished;
};

export const getAttackLimit = (combatant) => clampNumber(combatant?.attacksPerTurn ?? 1, 1);

export const getNextLivingIndex = (state, startIndex = 0) => {
  const combatants = sortedCombatants(state);
  if (!combatants.some((combatant) => !combatant.isDefeated)) return 0;

  for (let offset = 0; offset < combatants.length; offset += 1) {
    const index = (startIndex + offset) % combatants.length;
    if (!combatants[index].isDefeated) return index;
  }

  return 0;
};

export const checkEncounterEnd = (state) => {
  const charactersAlive = state.combatants.some(
    (combatant) => combatant.type === "character" && !combatant.isDefeated,
  );
  const monstersAlive = state.combatants.some(
    (combatant) => combatant.type === "monster" && !combatant.isDefeated,
  );

  if (state.hasStarted && !monstersAlive) {
    state.isFinished = true;
    state.winner = "characters";
  }

  if (state.hasStarted && !charactersAlive) {
    state.isFinished = true;
    state.winner = "monsters";
  }
};

export const damageCombatant = (attacker, target, requestedDamage) => {
  const actualDamage = Math.min(requestedDamage, target.currentHp);
  target.currentHp -= actualDamage;
  target.isDefeated = target.currentHp === 0;
  attacker.damageDone += actualDamage;
  return actualDamage;
};
