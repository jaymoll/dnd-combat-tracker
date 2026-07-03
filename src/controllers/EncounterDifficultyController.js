import {
  calculateEncounterDifficulty,
  getXpByCr,
  normalizeChallengeRating,
} from "../encounterDifficulty.js";
import { escapeHtml } from "../utils.js";

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value) => numberFormatter.format(value);

const formatMultiplier = (multiplier) => `x${Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(1)}`;

const readMonsterCr = (monster) => String(monster?.statBlock?.challengeRating ?? monster?.challengeRating ?? "").trim();

export class EncounterDifficultyController {
  constructor(elements, getAvailableMonsters) {
    this.elements = elements;
    this.getAvailableMonsters = getAvailableMonsters;
    this.partyLevels = [1, 1, 1, 1];
    this.selectedMonsters = [];
    this.searchTerm = "";
    this.lastPartyLevelCount = 0;
  }

  bindEvents() {
    this.elements.calculatorPartySize.addEventListener("input", () => this.changePartySize());
    this.elements.calculatorPartyLevels.addEventListener("input", (event) => this.changePartyLevel(event));
    this.elements.calculatorMonsterSearch.addEventListener("input", () => this.changeMonsterSearch());
    this.elements.calculatorMonsterResults.addEventListener("click", (event) => this.addMonster(event));
    this.elements.calculatorMonsterRows.addEventListener("input", (event) => this.changeMonsterQuantity(event));
    this.elements.calculatorMonsterRows.addEventListener("click", (event) => this.removeMonster(event));
  }

  render() {
    this.renderPartyLevels();
    this.renderMonsterSearchResults();
    this.renderSelectedMonsters();
    this.renderResults();
  }

  changePartySize() {
    const partySize = Math.min(Math.max(Number.parseInt(this.elements.calculatorPartySize.value, 10) || 1, 1), 20);
    this.elements.calculatorPartySize.value = partySize;

    if (partySize > this.partyLevels.length) {
      this.partyLevels = [
        ...this.partyLevels,
        ...Array.from({ length: partySize - this.partyLevels.length }, () => this.partyLevels.at(-1) ?? 1),
      ];
    } else {
      this.partyLevels = this.partyLevels.slice(0, partySize);
    }

    this.renderPartyLevels();
    this.renderResults();
  }

  changePartyLevel(event) {
    const input = event.target.closest("[data-party-level-index]");
    if (!input) return;

    const index = Number(input.dataset.partyLevelIndex);
    const level = Math.min(Math.max(Number.parseInt(input.value, 10) || 1, 1), 20);
    input.value = level;
    this.partyLevels[index] = level;
    this.renderResults();
  }

  changeMonsterSearch() {
    this.searchTerm = this.elements.calculatorMonsterSearch.value.trim().toLowerCase();
    this.renderMonsterSearchResults();
  }

  addMonster(event) {
    const button = event.target.closest("[data-calculator-add-monster]");
    if (!button) return;

    const monsterId = button.dataset.calculatorAddMonster;
    const existing = this.selectedMonsters.find((monster) => monster.id === monsterId);

    if (existing) {
      existing.quantity += 1;
    } else {
      this.selectedMonsters.push({ id: monsterId, quantity: 1 });
    }

    this.renderSelectedMonsters();
    this.renderResults();
  }

  changeMonsterQuantity(event) {
    const input = event.target.closest("[data-calculator-monster-quantity]");
    if (!input) return;

    const selectedMonster = this.selectedMonsters.find((monster) => monster.id === input.dataset.calculatorMonsterQuantity);
    if (!selectedMonster) return;

    selectedMonster.quantity = Math.max(Number.parseInt(input.value, 10) || 1, 1);
    input.value = selectedMonster.quantity;
    this.renderResults();
  }

  removeMonster(event) {
    const button = event.target.closest("[data-calculator-remove-monster]");
    if (!button) return;

    this.selectedMonsters = this.selectedMonsters.filter((monster) => monster.id !== button.dataset.calculatorRemoveMonster);
    this.renderSelectedMonsters();
    this.renderResults();
  }

  renderPartyLevels() {
    if (this.lastPartyLevelCount === this.partyLevels.length) {
      this.partyLevels.forEach((level, index) => {
        const input = this.elements.calculatorPartyLevels.querySelector(`[data-party-level-index="${index}"]`);
        if (input && document.activeElement !== input) input.value = level;
      });
      return;
    }

    this.elements.calculatorPartyLevels.innerHTML = this.partyLevels
      .map(
        (level, index) => `<label class="party-level-control">
          <span>Player ${index + 1}</span>
          <input type="number" min="1" max="20" step="1" value="${level}" data-party-level-index="${index}" />
        </label>`,
      )
      .join("");
    this.lastPartyLevelCount = this.partyLevels.length;
  }

  renderMonsterSearchResults() {
    const monsters = this.filteredMonsters();
    this.elements.calculatorNoMonsterResults.hidden = monsters.length > 0;
    this.elements.calculatorMonsterResults.innerHTML = monsters.map((monster) => this.monsterSearchResultMarkup(monster)).join("");
  }

  filteredMonsters() {
    const monsters = this.getAvailableMonsters();
    const filtered = this.searchTerm
      ? monsters.filter((monster) => {
          const challengeRating = readMonsterCr(monster);
          return `${monster.name} ${challengeRating}`.toLowerCase().includes(this.searchTerm);
        })
      : monsters;

    return filtered
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 12);
  }

  monsterSearchResultMarkup(monster) {
    const challengeRating = readMonsterCr(monster);
    const xp = getXpByCr(challengeRating);

    return `<article class="calculator-monster-result">
      <div>
        <strong>${escapeHtml(monster.name)}</strong>
        <span>CR ${escapeHtml(challengeRating || "-")} / ${xp === null ? "Unknown XP" : `${formatNumber(xp)} XP`}</span>
      </div>
      <button type="button" data-calculator-add-monster="${escapeHtml(monster.id)}">Add</button>
    </article>`;
  }

  renderSelectedMonsters() {
    const rows = this.selectedMonsterRows();

    this.elements.calculatorEmptyMonsterRows.hidden = rows.length > 0;
    this.elements.calculatorMonsterRows.innerHTML = rows.map((row) => this.selectedMonsterMarkup(row)).join("");
  }

  selectedMonsterRows() {
    const monsters = this.getAvailableMonsters();

    return this.selectedMonsters.map((selectedMonster) => ({
      selectedMonster,
      monster: monsters.find((candidate) => candidate.id === selectedMonster.id) ?? null,
    }));
  }

  selectedMonsterMarkup({ selectedMonster, monster }) {
    const name = monster?.name ?? "Missing monster";
    const challengeRating = readMonsterCr(monster);
    const normalizedCr = normalizeChallengeRating(challengeRating);
    const hasValidCr = monster && getXpByCr(challengeRating) !== null;
    const warning = hasValidCr ? "" : `<span class="table-detail calculator-warning-text">Invalid CR excluded</span>`;

    return `<tr>
      <td class="name-cell">${escapeHtml(name)}${warning}</td>
      <td>${escapeHtml(normalizedCr || "-")}</td>
      <td>
        <input
          class="calculator-quantity-input"
          type="number"
          min="1"
          step="1"
          value="${selectedMonster.quantity}"
          aria-label="${escapeHtml(name)} quantity"
          data-calculator-monster-quantity="${escapeHtml(selectedMonster.id)}"
        />
      </td>
      <td><button type="button" data-calculator-remove-monster="${escapeHtml(selectedMonster.id)}">Remove</button></td>
    </tr>`;
  }

  renderResults() {
    const result = this.calculate();
    const levelsText = this.partyLevels.join(", ");
    const deadlyProgress = result.partyThresholds.deadly > 0
      ? Math.min((result.adjustedXp / result.partyThresholds.deadly) * 100, 100)
      : 0;

    this.elements.calculatorPartySummary.textContent = `${this.partyLevels.length} player${this.partyLevels.length === 1 ? "" : "s"}`;
    this.elements.calculatorLevelSummary.textContent = levelsText;
    this.elements.calculatorEasyThreshold.textContent = formatNumber(result.partyThresholds.easy);
    this.elements.calculatorMediumThreshold.textContent = formatNumber(result.partyThresholds.medium);
    this.elements.calculatorHardThreshold.textContent = formatNumber(result.partyThresholds.hard);
    this.elements.calculatorDeadlyThreshold.textContent = formatNumber(result.partyThresholds.deadly);
    this.elements.calculatorBaseXp.textContent = formatNumber(result.baseXp);
    this.elements.calculatorAdjustedXp.textContent = formatNumber(result.adjustedXp);
    this.elements.calculatorMonsterCount.textContent = formatNumber(result.monsterCount);
    this.elements.calculatorMultiplier.textContent = formatMultiplier(result.multiplier);
    this.elements.calculatorDifficulty.textContent = result.difficulty;
    this.elements.calculatorDifficulty.className = `difficulty-badge difficulty-${result.difficulty.toLowerCase()}`;
    this.elements.calculatorDeadlyProgress.style.width = `${deadlyProgress}%`;
    this.elements.calculatorDeadlyProgress.dataset.difficulty = result.difficulty.toLowerCase();
    this.elements.calculatorDeadlyProgressLabel.textContent = `${Math.round(deadlyProgress)}% of Deadly`;
    this.renderWarnings(result);
  }

  calculate() {
    return calculateEncounterDifficulty({
      partyLevels: this.partyLevels,
      monsters: this.selectedMonsterRows().map(({ selectedMonster, monster }) => ({
        name: monster?.name ?? "Missing monster",
        challengeRating: readMonsterCr(monster),
        quantity: selectedMonster.quantity,
      })),
    });
  }

  renderWarnings(result) {
    const warnings = [];

    if (this.partyLevels.length < 1) {
      warnings.push("Party must have at least 1 player.");
    }

    result.invalidMonsters.forEach((monster) => {
      warnings.push(`${monster.name} has an unknown or invalid CR and is excluded.`);
    });

    this.elements.calculatorWarnings.hidden = warnings.length === 0;
    this.elements.calculatorWarnings.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
  }
}
