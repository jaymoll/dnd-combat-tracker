import { activeCombatantCanAct, getActiveCombatant, getAttackLimit, sortedCombatants } from "../combat.js";
import {
  CONDITION_OPTIONS,
  getAbilityModifier,
  getConditionLabel,
  getAttackText,
  getDamageText,
  getMonsterStatBlockSummary,
  getWeaponText,
} from "../models.js";
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
    ${item.type === "monster" ? `<span>Initiative DEX ${formatModifier(getAbilityModifier(item.statBlock?.dexterity ?? 10))}</span>` : ""}
    ${item.type === "monster" ? `<span>${escapeHtml(getMonsterStatBlockSummary(item))}</span>` : ""}
    <span>${escapeHtml(getAttackText(item))}</span>
  </div>
  <div class="quick-actions">
    <button type="button" data-action="add-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Add</button>
    <button type="button" data-action="edit-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Edit</button>
    <button type="button" data-action="remove-quick" data-type="${type}" data-id="${item.id}" ${isDisabled ? "disabled" : ""}>Remove</button>
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

export const targetOptionMarkup = (combatant) =>
  `<option value="${combatant.id}">${escapeHtml(combatant.name)} (AC ${combatant.armorClass}, ${combatant.currentHp}/${combatant.maxHp} HP)</option>`;

export const conditionTargetOptionMarkup = (combatant) =>
  `<option value="${combatant.id}">${escapeHtml(combatant.name)} (${combatant.currentHp}/${combatant.maxHp} HP)</option>`;

export const conditionOptionMarkup = (condition) =>
  `<option value="${condition.value}">${escapeHtml(condition.label)}</option>`;

export const spellOptionMarkup = (spell, index) =>
  `<option value="${index}">${escapeHtml(spell.name)} (${escapeHtml(getDamageText(spell))})</option>`;

export const weaponOptionMarkup = (weapon, index) =>
  `<option value="${index}">${escapeHtml(weapon.name)} (${escapeHtml(getWeaponText(weapon))})</option>`;

export const getStatusLabel = (combatant, activeId, state) => {
  if (combatant.isDefeated) return "Defeated";
  if (combatant.id === activeId && state.hasStarted && !state.isFinished) return "Active";
  return "Ready";
};

export const conditionsMarkup = (combatant) => {
  const conditions = combatant.conditions ?? [];

  if (conditions.length === 0) return `<span class="table-detail">-</span>`;

  return `<div class="condition-pills">${conditions
    .map((condition) => `<span class="condition-pill">${escapeHtml(getConditionLabel(condition))}</span>`)
    .join("")}</div>`;
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
    <td>
      <span>${escapeHtml(getAttackText(combatant))}</span>
      ${
        combatant.type === "monster"
          ? `<span class="table-detail">${escapeHtml(getMonsterStatBlockSummary(combatant))}</span>`
          : ""
      }
    </td>
    <td>${combatant.damageDone}</td>
    <td>${conditionsMarkup(combatant)}</td>
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
    conditions: CONDITION_OPTIONS,
    livingCombatants: sortedCombatants(state).filter((combatant) => !combatant.isDefeated),
  };
};
