import {
  createInitialQuickAccess,
  createQuickAccessEntry,
  createSpellEntry,
  createWeaponEntry,
  isAreaSpell,
  normalizeCreature,
  normalizeSpell,
  normalizeWeapon,
} from "../models.js";

export class QuickAccessController {
  quickAccess = createInitialQuickAccess();

  constructor(repository, elements) {
    this.repository = repository;
    this.elements = elements;
  }

  get items() {
    return this.quickAccess;
  }

  find(type, id) {
    return this.quickAccess[type]?.find((item) => item.id === id) ?? null;
  }

  async load() {
    try {
      this.quickAccess = this.normalizeLibrary(await this.repository.getLibrary());
      this.setStatus("Server storage connected");
    } catch {
      this.quickAccess = createInitialQuickAccess();
      this.setStatus("Server storage unavailable");
    }
  }

  async createFromForm(formCombatant) {
    return this.saveLibraryChange(() =>
      this.repository.createEntry(
        formCombatant.type,
        createQuickAccessEntry(formCombatant),
      ),
    );
  }

  async createSpell(spell) {
    return this.saveLibraryChange(() => this.repository.createEntry("spell", createSpellEntry(spell)));
  }

  async createWeapon(weapon) {
    return this.saveLibraryChange(() => this.repository.createEntry("weapon", createWeaponEntry(weapon)));
  }

  async update(target, formCombatant) {
    if (!target) return false;

    return this.saveLibraryChange(() =>
      this.repository.updateEntry(
        target.type,
        target.id,
        createQuickAccessEntry(formCombatant),
      ),
    );
  }

  async updateSpell(id, spell) {
    return this.saveLibraryChange(() => this.repository.updateEntry("spell", id, createSpellEntry(spell)));
  }

  async updateWeapon(id, weapon) {
    return this.saveLibraryChange(() => this.repository.updateEntry("weapon", id, createWeaponEntry(weapon)));
  }

  async remove(type, id) {
    return this.saveLibraryChange(() => this.repository.deleteEntry(type, id), "Remove failed");
  }

  async saveLibraryChange(action, failureMessage = "Save failed") {
    try {
      this.quickAccess = this.normalizeLibrary(await action());
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus(failureMessage);
      return false;
    }
  }

  normalizeLibrary(library) {
    const spell = (library.spell ?? []).map((entry) => this.normalizeEntry(entry, "spell")).filter(Boolean);
    const weapon = (library.weapon ?? []).map((entry) => this.normalizeEntry(entry, "weapon")).filter(Boolean);

    return {
      character: (library.character ?? [])
        .map((entry) => this.normalizeCreatureEntry(this.enrichCreatureSpells(entry, spell), "character"))
        .filter(Boolean),
      monster: (library.monster ?? [])
        .map((entry) => this.normalizeCreatureEntry(this.enrichCreatureSpells(entry, spell), "monster"))
        .filter(Boolean),
      spell,
      weapon,
    };
  }

  normalizeEntry(entry, type) {
    const idFactory = this.createQuickAccessId;
    if (type === "spell") return normalizeSpell(entry, idFactory);
    if (type === "weapon") return normalizeWeapon(entry, idFactory);
    return normalizeCreature(entry, type, idFactory);
  }

  normalizeCreatureEntry(entry, type) {
    return normalizeCreature(entry, type, this.createQuickAccessId);
  }

  enrichCreatureSpells(entry, spellLibrary) {
    const spells = Array.isArray(entry?.spells) ? entry.spells : [];
    if (spells.length === 0) return entry;

    return {
      ...entry,
      spells: spells.map((spell) => ({
        ...(this.findMatchingLibrarySpell(spell, spellLibrary) ?? {}),
        ...spell,
        ...this.getLibraryAreaFields(spell, spellLibrary),
      })),
    };
  }

  findMatchingLibrarySpell(spell, spellLibrary) {
    return spellLibrary.find((librarySpell) =>
      librarySpell.name === spell.name &&
      librarySpell.rangeFeet === spell.rangeFeet &&
      librarySpell.damageMin === spell.damageMin &&
      librarySpell.damageMax === spell.damageMax &&
      librarySpell.damageBonus === spell.damageBonus,
    ) ?? spellLibrary.find((librarySpell) => librarySpell.name === spell.name);
  }

  getLibraryAreaFields(spell, spellLibrary) {
    if (spell.targetType || spell.areaRadiusFeet) return {};

    const librarySpell = this.findMatchingLibrarySpell(spell, spellLibrary);
    return isAreaSpell(librarySpell)
      ? {
          targetType: "area",
          areaRadiusFeet: librarySpell.areaRadiusFeet,
        }
      : {};
  }

  createQuickAccessId(type) {
    return `quick-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  setStatus(message) {
    this.elements.storageStatus.textContent = message;
  }
}
