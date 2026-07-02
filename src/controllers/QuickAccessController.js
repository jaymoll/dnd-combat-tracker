import {
  createInitialQuickAccess,
  createQuickAccessEntry,
  createSpellEntry,
  createWeaponEntry,
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
    try {
      this.quickAccess = await this.repository.createEntry(
        formCombatant.type,
        createQuickAccessEntry(formCombatant),
      );
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus("Save failed");
      return false;
    }
  }

  async createSpell(spell) {
    try {
      this.quickAccess = await this.repository.createEntry("spell", createSpellEntry(spell));
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus("Save failed");
      return false;
    }
  }

  async createWeapon(weapon) {
    try {
      this.quickAccess = await this.repository.createEntry("weapon", createWeaponEntry(weapon));
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus("Save failed");
      return false;
    }
  }

  async update(target, formCombatant) {
    if (!target) return false;

    try {
      this.quickAccess = await this.repository.updateEntry(
        target.type,
        target.id,
        createQuickAccessEntry(formCombatant),
      );
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus("Save failed");
      return false;
    }
  }

  async updateSpell(id, spell) {
    try {
      this.quickAccess = await this.repository.updateEntry("spell", id, createSpellEntry(spell));
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus("Save failed");
      return false;
    }
  }

  async updateWeapon(id, weapon) {
    try {
      this.quickAccess = await this.repository.updateEntry("weapon", id, createWeaponEntry(weapon));
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus("Save failed");
      return false;
    }
  }

  async remove(type, id) {
    try {
      this.quickAccess = await this.repository.deleteEntry(type, id);
      this.setStatus("Server storage connected");
      return true;
    } catch {
      this.setStatus("Remove failed");
      return false;
    }
  }

  normalizeLibrary(library) {
    return {
      character: (library.character ?? [])
        .map((entry) => this.normalizeEntry(entry, "character"))
        .filter(Boolean),
      monster: (library.monster ?? [])
        .map((entry) => this.normalizeEntry(entry, "monster"))
        .filter(Boolean),
      spell: (library.spell ?? [])
        .map((entry) => this.normalizeSpellEntry(entry))
        .filter(Boolean),
      weapon: (library.weapon ?? [])
        .map((entry) => this.normalizeWeaponEntry(entry))
        .filter(Boolean),
    };
  }

  normalizeEntry(entry, type) {
    return normalizeCreature(
      entry,
      type,
      (entryType) => `quick-${entryType}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
  }

  normalizeSpellEntry(entry) {
    return normalizeSpell(
      entry,
      (entryType) => `quick-${entryType}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
  }

  normalizeWeaponEntry(entry) {
    return normalizeWeapon(
      entry,
      (entryType) => `quick-${entryType}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
  }

  setStatus(message) {
    this.elements.storageStatus.textContent = message;
  }
}
