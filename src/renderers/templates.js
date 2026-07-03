import { activeCombatantCanAct, getActiveCombatant, sortedCombatants } from "../combat.js";
import {
  CONDITION_OPTIONS,
  getConditionLabel,
  getAttackText,
  getCombatantSpeedFeet,
  getDamageText,
  getMonsterStatBlockSummary,
  getWeaponText,
} from "../models.js";
import { escapeHtml } from "../utils.js";

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

const quickAccessCr = (item) => {
  const challengeRating = String(item.statBlock?.challengeRating ?? item.challengeRating ?? "").trim();
  return challengeRating || "-";
};

export const quickAccessItemMarkup = (item, type, isDisabled, actions = ["add", "edit", "remove"]) => `<article class="quick-item">
  <div>
    <strong>${escapeHtml(item.name)}</strong>
    <span>HP ${item.currentHp}/${item.maxHp} / AC ${item.armorClass} / Speed ${getCombatantSpeedFeet(item)} ft / CR ${escapeHtml(quickAccessCr(item))}</span>
  </div>
  <div class="quick-actions">
    ${actions.includes("add") ? `<button type="button" data-action="add-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Add</button>` : ""}
    ${actions.includes("edit") ? `<button type="button" data-action="edit-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Edit</button>` : ""}
    ${actions.includes("remove") ? `<button type="button" data-action="remove-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Remove</button>` : ""}
  </div>
</article>`;

export const spellQuickAccessItemMarkup = (spell, isDisabled) => `<article class="quick-item spell-item">
  <div>
    <strong>${escapeHtml(spell.name)}</strong>
    <span>${escapeHtml(getDamageText(spell))}</span>
    ${spell.description ? `<span>${escapeHtml(spell.description)}</span>` : ""}
  </div>
  <div class="quick-actions">
    <button type="button" data-action="edit-spell" data-type="spell" data-id="${spell.id}" ${isDisabled ? "disabled" : ""}>Edit</button>
    <button type="button" data-action="remove-spell" data-type="spell" data-id="${spell.id}" ${isDisabled ? "disabled" : ""}>Remove</button>
  </div>
</article>`;

export const weaponQuickAccessItemMarkup = (weapon, isDisabled) => `<article class="quick-item weapon-item">
  <div>
    <strong>${escapeHtml(weapon.name)}</strong>
    <span>${escapeHtml(getWeaponText(weapon))}</span>
    ${weapon.description ? `<span>${escapeHtml(weapon.description)}</span>` : ""}
  </div>
  <div class="quick-actions">
    <button type="button" data-action="edit-weapon" data-type="weapon" data-id="${weapon.id}" ${isDisabled ? "disabled" : ""}>Edit</button>
    <button type="button" data-action="remove-weapon" data-type="weapon" data-id="${weapon.id}" ${isDisabled ? "disabled" : ""}>Remove</button>
  </div>
</article>`;

export const spellOptionMarkup = (spell, index) =>
  `<option value="${index}">${escapeHtml(spell.name)}</option>`;

export const weaponOptionMarkup = (weapon, index) =>
  `<option value="${index}">${escapeHtml(weapon.name)}</option>`;

export const getStatusLabel = (combatant, activeId, state) => {
  if (combatant.isDefeated) return "Defeated";
  if (combatant.id === activeId && state.hasStarted && !state.isFinished) return "Active";
  return "Ready";
};

const conditionMenuMarkup = (combatant, state) => {
  if (!state.hasStarted || state.isFinished || combatant.isDefeated) return "";

  const conditions = combatant.conditions ?? [];
  const availableConditions = CONDITION_OPTIONS.filter((condition) => !conditions.includes(condition.value));

  if (availableConditions.length === 0) return "";

  return `<details class="condition-menu">
    <summary aria-label="Add condition to ${escapeHtml(combatant.name)}">+</summary>
    <div class="condition-menu-options">
      ${availableConditions
        .map(
          (condition) =>
            `<button type="button" data-action="apply-condition" data-id="${combatant.id}" data-condition="${condition.value}">${escapeHtml(condition.label)}</button>`,
        )
        .join("")}
    </div>
  </details>`;
};

export const conditionsMarkup = (combatant, state) => {
  const conditions = combatant.conditions ?? [];

  const conditionPills =
    conditions.length === 0
      ? `<span class="table-detail">-</span>`
      : `<div class="condition-pills">${conditions
          .map(
            (condition) =>
              `<span class="condition-pill">${escapeHtml(getConditionLabel(condition))}
                <button type="button" data-action="remove-condition" data-id="${combatant.id}" data-condition="${condition}" aria-label="Remove ${escapeHtml(getConditionLabel(condition))} from ${escapeHtml(combatant.name)}">x</button>
              </span>`,
          )
          .join("")}</div>`;

  return `<div class="condition-cell">${conditionPills}${conditionMenuMarkup(combatant, state)}</div>`;
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
    <td>${getCombatantSpeedFeet(combatant)} ft</td>
    <td>${combatant.attacksPerTurn}</td>
    <td>
      <span>${escapeHtml(getAttackText(combatant))}</span>
      ${
        combatant.type === "monster"
          ? `<span class="table-detail">${escapeHtml(getMonsterStatBlockSummary(combatant))}</span>`
          : ""
      }
    </td>
    <td>${combatant.damageDone}</td>
    <td>${conditionsMarkup(combatant, state)}</td>
    <td><span class="status-pill status-${status.toLowerCase()}">${status}</span></td>
    <td class="setup-column">${actionButtons}</td>
  </tr>`;
};

export const canRenderTurnPanel = (state) => state.hasStarted && !state.isFinished && activeCombatantCanAct(state);

export const turnSummary = (state) => {
  const active = getActiveCombatant(state);
  return {
    active,
    livingCombatants: sortedCombatants(state).filter((combatant) => !combatant.isDefeated),
  };
};
