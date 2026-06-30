const createInitialState = () => ({
  combatants: [],
  hasStarted: false,
  currentTurnIndex: 0,
  isFinished: false,
  winner: null,
  nextOrder: 0,
});

const libraryApiPath = "/api/library";

const createInitialQuickAccess = () => ({
  character: [],
  monster: [],
});

const normalizeQuickAccessEntry = (entry, type) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const maxHp = clampNumber(entry.maxHp, 1);
  const currentHp = clampNumber(entry.currentHp ?? maxHp, 0, maxHp);
  const armorClass = clampNumber(entry.armorClass ?? 10, 1);
  const toHit = clampNumber(entry.toHit ?? 0, -99);
  const damageMin = clampNumber(entry.damageMin ?? 1, 0);
  const damageMax = clampNumber(entry.damageMax ?? damageMin, damageMin);
  const damageBonus = clampNumber(entry.damageBonus ?? 0, -99);

  if (!name) return null;

  return {
    id: String(entry.id || `quick-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name,
    type,
    maxHp,
    currentHp,
    armorClass,
    toHit,
    damageMin,
    damageMax,
    damageBonus,
  };
};

let state = createInitialState();
let quickAccess = createInitialQuickAccess();
let formMode = "encounter";
let libraryEditTarget = null;

const elements = {
  modal: document.querySelector("#combatantModal"),
  modalTitle: document.querySelector("#combatantModalTitle"),
  openModalButton: document.querySelector("#openCombatantModalButton"),
  closeModalButton: document.querySelector("#closeCombatantModalButton"),
  form: document.querySelector("#combatantForm"),
  combatantId: document.querySelector("#combatantId"),
  name: document.querySelector("#nameInput"),
  type: document.querySelector("#typeInput"),
  maxHp: document.querySelector("#maxHpInput"),
  currentHp: document.querySelector("#currentHpInput"),
  initiative: document.querySelector("#initiativeInput"),
  armorClass: document.querySelector("#armorClassInput"),
  monsterFields: document.querySelector("#monsterFields"),
  toHit: document.querySelector("#toHitInput"),
  damageMin: document.querySelector("#damageMinInput"),
  damageMax: document.querySelector("#damageMaxInput"),
  damageBonus: document.querySelector("#damageBonusInput"),
  saveButton: document.querySelector("#saveCombatantButton"),
  saveQuickAccessButton: document.querySelector("#saveQuickAccessButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  startButton: document.querySelector("#startEncounterButton"),
  resetButton: document.querySelector("#resetEncounterButton"),
  requirement: document.querySelector("#startRequirement"),
  status: document.querySelector("#encounterStatus"),
  turnPanel: document.querySelector("#turnPanel"),
  activeName: document.querySelector("#activeCombatantName"),
  damageForm: document.querySelector("#damageForm"),
  target: document.querySelector("#targetInput"),
  damage: document.querySelector("#damageInput"),
  rollAttackButton: document.querySelector("#rollAttackButton"),
  rollResult: document.querySelector("#rollResult"),
  nextTurnButton: document.querySelector("#nextTurnButton"),
  rows: document.querySelector("#combatantRows"),
  count: document.querySelector("#combatantCount"),
  empty: document.querySelector("#emptyState"),
  characterQuickList: document.querySelector("#characterQuickList"),
  monsterQuickList: document.querySelector("#monsterQuickList"),
  emptyCharacterQuickList: document.querySelector("#emptyCharacterQuickList"),
  emptyMonsterQuickList: document.querySelector("#emptyMonsterQuickList"),
  storageStatus: document.querySelector("#storageStatus"),
};

const byInitiative = (a, b) => {
  if (b.initiative !== a.initiative) return b.initiative - a.initiative;
  return a.order - b.order;
};

const sortedCombatants = () => [...state.combatants].sort(byInitiative);

const clampNumber = (value, min, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.min(Math.max(number, min), max);
};

const parseInteger = (value, fallback = 0) => {
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) ? fallback : number;
};

const rollInclusive = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const createCombatantId = () => `combatant-${Date.now()}-${state.nextOrder}`;

const createQuickAccessEntry = (formCombatant) => ({
  name: formCombatant.name,
  type: formCombatant.type,
  maxHp: formCombatant.maxHp,
  currentHp: formCombatant.currentHp,
  armorClass: formCombatant.armorClass,
  toHit: formCombatant.toHit,
  damageMin: formCombatant.damageMin,
  damageMax: formCombatant.damageMax,
  damageBonus: formCombatant.damageBonus,
});

const formatModifier = (value) => (value >= 0 ? `+${value}` : String(value));

const getDamageText = (combatant) => {
  if (combatant.type !== "monster") return "-";
  const bonus = combatant.damageBonus === 0 ? "" : ` ${formatModifier(combatant.damageBonus)}`;
  return `${formatModifier(combatant.toHit)} hit, ${combatant.damageMin}-${combatant.damageMax}${bonus}`;
};

const syncMonsterFields = () => {
  const isMonster = elements.type.value === "monster";
  elements.monsterFields.hidden = !isMonster;
  if (isMonster) {
    if (!elements.toHit.value) elements.toHit.value = "0";
    if (!elements.damageMin.value) elements.damageMin.value = "1";
    if (!elements.damageMax.value) elements.damageMax.value = elements.damageMin.value;
    if (!elements.damageBonus.value) elements.damageBonus.value = "0";
    elements.damageMax.min = elements.damageMin.value;
  }
  [elements.toHit, elements.damageMin, elements.damageMax, elements.damageBonus].forEach((input) => {
    input.disabled = !isMonster;
    input.required = isMonster;
  });
};

const openCombatantModal = (mode = "add") => {
  elements.modalTitle.textContent = mode === "library" ? "Edit Saved Creature" : mode === "edit" ? "Edit Creature" : "Add Creature";
  elements.saveButton.textContent = mode === "add" ? "Add" : "Save";
  elements.saveQuickAccessButton.hidden = mode === "library";
  renderFormState();
  elements.modal.showModal();
  elements.name.focus();
};

const closeCombatantModal = () => {
  if (elements.modal.open) {
    elements.modal.close();
  }
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

const loadQuickAccess = async () => {
  try {
    quickAccess = await requestJson(libraryApiPath);
    elements.storageStatus.textContent = "Server storage connected";
  } catch {
    quickAccess = createInitialQuickAccess();
    elements.storageStatus.textContent = "Server storage unavailable";
  }

  render();
};

const readCombatantForm = () => {
  const maxHp = clampNumber(elements.maxHp.value, 1);
  const currentHp = clampNumber(elements.currentHp.value, 0, maxHp);
  const armorClass = clampNumber(elements.armorClass.value, 1);
  const isMonster = elements.type.value === "monster";
  const damageMin = isMonster ? clampNumber(elements.damageMin.value, 0) : 0;
  const damageMax = isMonster ? clampNumber(elements.damageMax.value, damageMin, Number.MAX_SAFE_INTEGER) : 0;
  const name = elements.name.value.trim();

  if (!name) return null;

  return {
    name,
    type: elements.type.value,
    maxHp,
    currentHp,
    initiative: parseInteger(elements.initiative.value),
    armorClass,
    toHit: isMonster ? parseInteger(elements.toHit.value) : 0,
    damageMin,
    damageMax,
    damageBonus: isMonster ? parseInteger(elements.damageBonus.value) : 0,
  };
};

const hasRequiredSides = () => {
  const livingCharacters = state.combatants.some((combatant) => combatant.type === "character");
  const livingMonsters = state.combatants.some((combatant) => combatant.type === "monster");
  return livingCharacters && livingMonsters;
};

const getActiveCombatant = () => sortedCombatants()[state.currentTurnIndex] ?? null;

const activeCombatantCanAct = () => {
  const active = getActiveCombatant();
  return active && !active.isDefeated && state.hasStarted && !state.isFinished;
};

const getNextLivingIndex = (startIndex = 0) => {
  const combatants = sortedCombatants();
  if (!combatants.some((combatant) => !combatant.isDefeated)) return 0;

  for (let offset = 0; offset < combatants.length; offset += 1) {
    const index = (startIndex + offset) % combatants.length;
    if (!combatants[index].isDefeated) return index;
  }

  return 0;
};

const checkEncounterEnd = () => {
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

const damageCombatant = (attacker, target, requestedDamage) => {
  const actualDamage = Math.min(requestedDamage, target.currentHp);
  target.currentHp -= actualDamage;
  target.isDefeated = target.currentHp === 0;
  attacker.damageDone += actualDamage;
  return actualDamage;
};

const resetForm = () => {
  formMode = "encounter";
  libraryEditTarget = null;
  elements.form.reset();
  elements.combatantId.value = "";
  elements.type.value = "character";
  elements.saveButton.textContent = "Add";
  elements.currentHp.removeAttribute("max");
  elements.maxHp.value = "";
  elements.currentHp.value = "";
  elements.initiative.value = "";
  elements.armorClass.value = "";
  elements.toHit.value = "";
  elements.damageMin.value = "";
  elements.damageMax.value = "";
  elements.damageBonus.value = "";
  elements.saveQuickAccessButton.hidden = false;
  syncMonsterFields();
};

const fillForm = (combatant) => {
  formMode = "encounter";
  libraryEditTarget = null;
  elements.combatantId.value = combatant.id;
  elements.name.value = combatant.name;
  elements.type.value = combatant.type;
  elements.maxHp.value = combatant.maxHp;
  elements.currentHp.value = combatant.currentHp;
  elements.currentHp.max = combatant.maxHp;
  elements.initiative.value = combatant.initiative;
  elements.armorClass.value = combatant.armorClass;
  elements.toHit.value = combatant.toHit;
  elements.damageMin.value = combatant.damageMin;
  elements.damageMax.value = combatant.damageMax;
  elements.damageBonus.value = combatant.damageBonus;
  syncMonsterFields();
  openCombatantModal("edit");
};

const fillLibraryForm = (entry, type) => {
  formMode = "library";
  libraryEditTarget = { id: entry.id, type };
  elements.combatantId.value = entry.id;
  elements.name.value = entry.name;
  elements.type.value = entry.type;
  elements.maxHp.value = entry.maxHp;
  elements.currentHp.value = entry.currentHp;
  elements.currentHp.max = entry.maxHp;
  elements.initiative.value = "0";
  elements.armorClass.value = entry.armorClass;
  elements.toHit.value = entry.toHit;
  elements.damageMin.value = entry.damageMin;
  elements.damageMax.value = entry.damageMax;
  elements.damageBonus.value = entry.damageBonus;
  syncMonsterFields();
  openCombatantModal("library");
};

const renderStatus = () => {
  if (state.isFinished) {
    elements.status.innerHTML = `<strong>${state.winner === "characters" ? "Characters win!" : "Monsters win!"}</strong><span>Encounter finished</span>`;
    return;
  }

  if (state.hasStarted) {
    const active = getActiveCombatant();
    elements.status.innerHTML = `<strong>Round in progress</strong><span>${active ? `${escapeHtml(active.name)}'s turn` : "No active combatant"}</span>`;
    return;
  }

  elements.status.innerHTML = "<strong>Setup phase</strong><span>Add combatants, HP, and initiative.</span>";
};

const renderFormState = () => {
  const setupDisabled = state.hasStarted;
  elements.name.disabled = setupDisabled;
  elements.type.disabled = setupDisabled || formMode === "library";
  elements.maxHp.disabled = setupDisabled;
  elements.currentHp.disabled = setupDisabled;
  elements.initiative.disabled = setupDisabled || formMode === "library";
  elements.armorClass.disabled = setupDisabled;
  elements.toHit.disabled = setupDisabled || elements.type.value !== "monster";
  elements.damageMin.disabled = setupDisabled || elements.type.value !== "monster";
  elements.damageMax.disabled = setupDisabled || elements.type.value !== "monster";
  elements.damageBonus.disabled = setupDisabled || elements.type.value !== "monster";
  elements.openModalButton.disabled = setupDisabled;
  elements.saveButton.disabled = setupDisabled;
  elements.saveQuickAccessButton.disabled = setupDisabled;
  elements.saveQuickAccessButton.hidden = formMode === "library";
  elements.cancelEditButton.disabled = setupDisabled;

  const canStart = !state.hasStarted && hasRequiredSides();
  elements.startButton.disabled = !canStart;
  elements.requirement.textContent = canStart
    ? "Ready to begin."
    : "Start requires at least one character and one monster.";
};

const renderQuickAccessList = (type, listElement, emptyElement) => {
  const items = quickAccess[type];
  emptyElement.hidden = items.length > 0;

  listElement.innerHTML = items
    .map(
      (item) => `<article class="quick-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${item.currentHp}/${item.maxHp} HP, AC ${item.armorClass}</span>
          ${item.type === "monster" ? `<span>${escapeHtml(getDamageText(item))}</span>` : ""}
        </div>
        <div class="quick-actions">
          <button type="button" data-action="add-quick" data-type="${type}" data-id="${item.id}" ${state.hasStarted ? "disabled" : ""}>Add</button>
          <button type="button" data-action="edit-quick" data-type="${type}" data-id="${item.id}" ${state.hasStarted ? "disabled" : ""}>Edit</button>
          <button type="button" data-action="remove-quick" data-type="${type}" data-id="${item.id}" ${state.hasStarted ? "disabled" : ""}>Remove</button>
        </div>
      </article>`,
    )
    .join("");
};

const renderQuickAccess = () => {
  renderQuickAccessList("character", elements.characterQuickList, elements.emptyCharacterQuickList);
  renderQuickAccessList("monster", elements.monsterQuickList, elements.emptyMonsterQuickList);
};

const renderTurnPanel = () => {
  elements.turnPanel.hidden = !state.hasStarted || state.isFinished;

  if (!activeCombatantCanAct()) {
    elements.activeName.textContent = "";
    elements.target.innerHTML = "";
    elements.rollResult.textContent = "";
    return;
  }

  const active = getActiveCombatant();
  const targets = sortedCombatants().filter(
    (combatant) => !combatant.isDefeated && combatant.id !== active.id,
  );

  elements.activeName.textContent = active.name;
  elements.target.innerHTML = targets
    .map(
      (combatant) =>
        `<option value="${combatant.id}">${escapeHtml(combatant.name)} (AC ${combatant.armorClass}, ${combatant.currentHp}/${combatant.maxHp} HP)</option>`,
    )
    .join("");
  elements.damageForm.querySelector("button[type='submit']").disabled = targets.length === 0;
  elements.rollAttackButton.disabled = targets.length === 0 || active.type !== "monster";
  elements.nextTurnButton.disabled = targets.length === 0 && sortedCombatants().filter((combatant) => !combatant.isDefeated).length < 2;
};

const getStatusLabel = (combatant, activeId) => {
  if (combatant.isDefeated) return "Defeated";
  if (combatant.id === activeId && state.hasStarted && !state.isFinished) return "Active";
  return "Ready";
};

const renderRows = () => {
  const combatants = sortedCombatants();
  const active = getActiveCombatant();
  elements.count.textContent = `${combatants.length} combatant${combatants.length === 1 ? "" : "s"}`;
  elements.empty.hidden = combatants.length > 0;

  elements.rows.innerHTML = combatants
    .map((combatant, index) => {
      const status = getStatusLabel(combatant, active?.id);
      const actionButtons = state.hasStarted
        ? ""
        : `<div class="row-actions">
            <button type="button" data-action="edit" data-id="${combatant.id}">Edit</button>
            <button type="button" data-action="remove" data-id="${combatant.id}">Remove</button>
          </div>`;

      return `<tr class="${combatant.id === active?.id && state.hasStarted && !state.isFinished ? "active-row" : ""} ${combatant.isDefeated ? "defeated-row" : ""}">
        <td>${index + 1}</td>
        <td class="name-cell">${escapeHtml(combatant.name)}</td>
        <td><span class="type-pill type-${combatant.type}">${combatant.type}</span></td>
        <td>${combatant.armorClass}</td>
        <td>${combatant.currentHp} / ${combatant.maxHp}</td>
        <td>${combatant.initiative}</td>
        <td>${escapeHtml(getDamageText(combatant))}</td>
        <td>${combatant.damageDone}</td>
        <td><span class="status-pill status-${status.toLowerCase()}">${status}</span></td>
        <td class="setup-column">${actionButtons}</td>
      </tr>`;
    })
    .join("");
};

const render = () => {
  state.combatants.sort(byInitiative);
  checkEncounterEnd();

  if (state.hasStarted && !state.isFinished) {
    state.currentTurnIndex = getNextLivingIndex(state.currentTurnIndex);
  }

  renderStatus();
  renderFormState();
  renderQuickAccess();
  renderTurnPanel();
  renderRows();
};

const upsertCombatant = (event) => {
  event.preventDefault();

  const formCombatant = readCombatantForm();
  if (!formCombatant) return;

  if (formMode === "library") {
    updateQuickAccessEntry(formCombatant);
    return;
  }

  const id = elements.combatantId.value;
  const existing = state.combatants.find((combatant) => combatant.id === id);

  const combatant = {
    id: id || createCombatantId(),
    ...formCombatant,
    damageDone: existing?.damageDone ?? 0,
    isDefeated: formCombatant.currentHp === 0,
    order: existing?.order ?? state.nextOrder,
  };

  if (existing) {
    state.combatants = state.combatants.map((item) => (item.id === id ? combatant : item));
  } else {
    state.nextOrder += 1;
    state.combatants.push(combatant);
  }

  resetForm();
  closeCombatantModal();
  render();
};

const updateQuickAccessEntry = async (formCombatant) => {
  if (!libraryEditTarget) return;

  try {
    quickAccess = await requestJson(`${libraryApiPath}/${libraryEditTarget.type}/${encodeURIComponent(libraryEditTarget.id)}`, {
      method: "PUT",
      body: JSON.stringify(createQuickAccessEntry(formCombatant)),
    });
    elements.storageStatus.textContent = "Server storage connected";
    resetForm();
    closeCombatantModal();
    render();
  } catch {
    elements.storageStatus.textContent = "Save failed";
  }
};

const addCombatantFromQuickAccess = (entry) => {
  const initiative = window.prompt(`Initiative for ${entry.name}?`, "");
  if (initiative === null) return;

  state.combatants.push({
    id: createCombatantId(),
    name: entry.name,
    type: entry.type,
    maxHp: entry.maxHp,
    currentHp: entry.currentHp,
    initiative: parseInteger(initiative),
    armorClass: entry.armorClass,
    toHit: entry.toHit,
    damageMin: entry.damageMin,
    damageMax: entry.damageMax,
    damageBonus: entry.damageBonus,
    damageDone: 0,
    isDefeated: entry.currentHp === 0,
    order: state.nextOrder,
  });
  state.nextOrder += 1;
  render();
};

const saveFormToQuickAccess = async () => {
  if (state.hasStarted) {
    return;
  }

  const formCombatant = readCombatantForm();
  if (!formCombatant) {
    elements.name.focus();
    return;
  }

  try {
    quickAccess = await requestJson(`${libraryApiPath}/${formCombatant.type}`, {
      method: "POST",
      body: JSON.stringify(createQuickAccessEntry(formCombatant)),
    });
    elements.storageStatus.textContent = "Server storage connected";
    closeCombatantModal();
    render();
  } catch {
    elements.storageStatus.textContent = "Save failed";
  }
};

const startEncounter = () => {
  if (!hasRequiredSides()) return;
  state.hasStarted = true;
  state.currentTurnIndex = getNextLivingIndex(0);
  resetForm();
  render();
};

const resetEncounter = () => {
  state = createInitialState();
  resetForm();
  render();
};

const applyDamage = (event) => {
  event.preventDefault();
  if (!activeCombatantCanAct()) return;

  const active = getActiveCombatant();
  const target = state.combatants.find((combatant) => combatant.id === elements.target.value);
  if (!target || target.isDefeated) return;

  const attacker = state.combatants.find((combatant) => combatant.id === active.id);
  const requestedDamage = clampNumber(elements.damage.value, 1);
  const actualDamage = damageCombatant(attacker, target, requestedDamage);

  elements.damage.value = "";
  elements.rollResult.textContent = `${active.name} dealt ${actualDamage} damage to ${target.name}.`;
  checkEncounterEnd();
  render();
};

const rollAttack = () => {
  if (!activeCombatantCanAct()) return;

  const active = getActiveCombatant();
  const attacker = state.combatants.find((combatant) => combatant.id === active.id);
  const target = state.combatants.find((combatant) => combatant.id === elements.target.value);
  if (!attacker || attacker.type !== "monster" || !target || target.isDefeated) return;

  const d20 = rollInclusive(1, 20);
  const attackTotal = d20 + attacker.toHit;

  if (attackTotal < target.armorClass) {
    elements.rollResult.textContent = `${attacker.name} rolled ${d20} ${formatModifier(attacker.toHit)} = ${attackTotal}, missing ${target.name}'s AC ${target.armorClass}.`;
    render();
    return;
  }

  const damageRoll = rollInclusive(attacker.damageMin, attacker.damageMax);
  const requestedDamage = Math.max(0, damageRoll + attacker.damageBonus);
  const actualDamage = damageCombatant(attacker, target, requestedDamage);
  elements.rollResult.textContent = `${attacker.name} rolled ${d20} ${formatModifier(attacker.toHit)} = ${attackTotal}, hit AC ${target.armorClass}, and dealt ${actualDamage} damage (${damageRoll} ${formatModifier(attacker.damageBonus)}).`;

  checkEncounterEnd();
  render();
};

const nextTurn = () => {
  if (!state.hasStarted || state.isFinished) return;
  state.currentTurnIndex = getNextLivingIndex(state.currentTurnIndex + 1);
  render();
};

elements.form.addEventListener("submit", upsertCombatant);
elements.openModalButton.addEventListener("click", () => {
  resetForm();
  openCombatantModal("add");
});
elements.closeModalButton.addEventListener("click", () => {
  resetForm();
  closeCombatantModal();
});
elements.saveQuickAccessButton.addEventListener("click", saveFormToQuickAccess);
elements.cancelEditButton.addEventListener("click", () => {
  resetForm();
  closeCombatantModal();
});
elements.startButton.addEventListener("click", startEncounter);
elements.resetButton.addEventListener("click", resetEncounter);
elements.damageForm.addEventListener("submit", applyDamage);
elements.rollAttackButton.addEventListener("click", rollAttack);
elements.nextTurnButton.addEventListener("click", nextTurn);
elements.type.addEventListener("change", () => {
  syncMonsterFields();
  renderFormState();
});
elements.modal.addEventListener("cancel", () => {
  resetForm();
});
elements.modal.addEventListener("click", (event) => {
  if (event.target === elements.modal) {
    resetForm();
    closeCombatantModal();
  }
});

elements.rows.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || state.hasStarted) return;

  const id = button.dataset.id;
  const combatant = state.combatants.find((item) => item.id === id);
  if (!combatant) return;

  if (button.dataset.action === "edit") {
    fillForm(combatant);
  }

  if (button.dataset.action === "remove") {
    state.combatants = state.combatants.filter((item) => item.id !== id);
    if (elements.combatantId.value === id) resetForm();
    render();
  }
});

const handleQuickAccessClick = (event) => {
  const button = event.target.closest("button");
  if (!button || state.hasStarted) return;

  const { action, id, type } = button.dataset;
  const entry = quickAccess[type]?.find((item) => item.id === id);
  if (!entry) return;

  if (action === "add-quick") {
    addCombatantFromQuickAccess(entry);
  }

  if (action === "edit-quick") {
    fillLibraryForm(entry, type);
  }

  if (action === "remove-quick") {
    requestJson(`${libraryApiPath}/${type}/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then((updatedQuickAccess) => {
        quickAccess = updatedQuickAccess;
        elements.storageStatus.textContent = "Server storage connected";
        render();
      })
      .catch(() => {
        elements.storageStatus.textContent = "Remove failed";
      });
  }
};

elements.characterQuickList.addEventListener("click", handleQuickAccessClick);
elements.monsterQuickList.addEventListener("click", handleQuickAccessClick);

elements.maxHp.addEventListener("input", () => {
  const maxHp = clampNumber(elements.maxHp.value, 1);
  elements.currentHp.max = maxHp;
  if (!elements.currentHp.value || Number(elements.currentHp.value) > maxHp) {
    elements.currentHp.value = maxHp;
  }
});

elements.damageMin.addEventListener("input", () => {
  const minDamage = clampNumber(elements.damageMin.value, 0);
  elements.damageMax.min = minDamage;
  if (elements.damageMax.value && Number(elements.damageMax.value) < minDamage) {
    elements.damageMax.value = minDamage;
  }
});

syncMonsterFields();
render();
loadQuickAccess();
