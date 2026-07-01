import { activeCombatantCanAct, getActiveCombatant, getAttackLimit, sortedCombatants } from "../combat.js";
import { getDamageText } from "../models.js";
import { escapeHtml, formatModifier } from "../utils.js";

export const statusMarkup = (state) => {
  if (state.isFinished) {
    return `<strong>${state.winner === "characters" ? "Characters win!" : "Monsters win!"}</strong><span>Encounter finished</span>`;
  }

  if (state.hasStarted) {
    const active = getActiveCombatant(state);
    return `<strong>Round in progress</strong><span>${active ? `${escapeHtml(active.name)}'s turn` : "No active combatant"}</span>`;
  }

  return "<strong>Setup phase</strong><span>Add combatants, HP, and initiative.</span>";
};

export const quickAccessItemMarkup = (item, type, isDisabled) => `<article class="quick-item">
  <div>
    <strong>${escapeHtml(item.name)}</strong>
    <span>${item.currentHp}/${item.maxHp} HP, AC ${item.armorClass}</span>
    <span>${item.attacksPerTurn} attack${item.attacksPerTurn === 1 ? "" : "s"} per turn</span>
    ${item.type === "monster" ? `<span>Initiative ${formatModifier(item.initiativeBonus)}</span>` : ""}
    ${item.type === "monster" ? `<span>${escapeHtml(getDamageText(item))}</span>` : ""}
  </div>
  <div class="quick-actions">
    <button type="button" data-action="add-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Add</button>
    <button type="button" data-action="edit-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Edit</button>
    <button type="button" data-action="remove-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Remove</button>
  </div>
</article>`;

export const targetOptionMarkup = (combatant) =>
  `<option value="${combatant.id}">${escapeHtml(combatant.name)} (AC ${combatant.armorClass}, ${combatant.currentHp}/${combatant.maxHp} HP)</option>`;

export const getStatusLabel = (combatant, activeId, state) => {
  if (combatant.isDefeated) return "Defeated";
  if (combatant.id === activeId && state.hasStarted && !state.isFinished) return "Active";
  return "Ready";
};

export const combatantRowMarkup = (combatant, index, { activeId, selectedTargetId, state }) => {
  const status = getStatusLabel(combatant, activeId, state);
  const isActive = combatant.id === activeId && state.hasStarted && !state.isFinished;
  const isTargetable = state.hasStarted && !state.isFinished && !combatant.isDefeated && !isActive;
  const isSelectedTarget = isTargetable && combatant.id === selectedTargetId;
  const actionButtons = state.hasStarted
    ? ""
    : `<div class="row-actions">
        <button type="button" data-action="edit" data-id="${combatant.id}">Edit</button>
        <button type="button" data-action="remove" data-id="${combatant.id}">Remove</button>
      </div>`;

  return `<tr class="${isActive ? "active-row" : ""} ${combatant.isDefeated ? "defeated-row" : ""} ${isTargetable ? "targetable-row" : ""} ${isSelectedTarget ? "selected-target-row" : ""}" data-id="${combatant.id}">
    <td>${index + 1}</td>
    <td class="name-cell">${escapeHtml(combatant.name)}</td>
    <td><span class="type-pill type-${combatant.type}">${combatant.type}</span></td>
    <td>${combatant.armorClass}</td>
    <td>${combatant.currentHp} / ${combatant.maxHp}</td>
    <td>${combatant.initiative}</td>
    <td>${combatant.attacksPerTurn}</td>
    <td>${escapeHtml(getDamageText(combatant))}</td>
    <td>${combatant.damageDone}</td>
    <td><span class="status-pill status-${status.toLowerCase()}">${status}</span></td>
    <td class="setup-column">${actionButtons}</td>
  </tr>`;
};

export const canRenderTurnPanel = (state) => state.hasStarted && !state.isFinished && activeCombatantCanAct(state);

export const turnSummary = (state) => {
  const active = getActiveCombatant(state);
  return {
    active,
    attackCounter: active ? `Attacks ${state.attacksUsedThisTurn} / ${getAttackLimit(active)}` : "",
    livingCombatants: sortedCombatants(state).filter((combatant) => !combatant.isDefeated),
  };
};
