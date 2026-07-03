import express from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? 3000);
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(__dirname, "storage");

const libraryFiles = {
  character: "characters.txt",
  monster: "monsters.txt",
  spell: "spells.txt",
  weapon: "weapons.txt",
};

app.use(express.json());
app.use(express.static(__dirname));

const clampNumber = (value, min, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.min(Math.max(number, min), max);
};

const createId = (type, index) => `${type}-${index}`;

const readText = (entry, key, fallback = "") => String(entry?.[key] ?? fallback).trim();
const defaultMovementFeet = 30;
const tileFeet = 5;

const normalizeMonsterStatBlock = (entry = {}) => {
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

const getMovementFeet = (entry, statBlock = null) => {
  if (entry?.movementFeet) return clampNumber(entry.movementFeet, tileFeet);

  const speedText = String(statBlock?.speed ?? entry?.statBlock?.speed ?? entry?.speed ?? "");
  const speedMatch = speedText.match(/(\d+)\s*ft\.?/i);

  return speedMatch ? clampNumber(speedMatch[1], tileFeet) : defaultMovementFeet;
};

const normalizeSpell = (entry, index = 0) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const description = String(entry.description ?? "").trim();
  const damageMin = clampNumber(entry.damageMin ?? 1, 0);
  const damageMax = clampNumber(entry.damageMax ?? damageMin, damageMin);
  const damageBonus = clampNumber(entry.damageBonus ?? 0, -99);

  if (!name) return null;

  return {
    id: String(entry.id || createId("spell", index)),
    name,
    description,
    damageMin,
    damageMax,
    damageBonus,
  };
};

const normalizeWeapon = (entry, index = 0) => {
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
    id: String(entry.id || createId("weapon", index)),
    name,
    description,
    ability,
    damageMin,
    damageMax,
    damageBonus,
  };
};

const normalizeEntry = (entry, type, index) => {
  if (!entry || typeof entry !== "object") return null;

  if (type === "spell") return normalizeSpell(entry, index);
  if (type === "weapon") return normalizeWeapon(entry, index);

  const name = String(entry.name ?? "").trim();
  const maxHp = clampNumber(entry.maxHp, 1);
  const currentHp = clampNumber(entry.currentHp ?? maxHp, 0, maxHp);
  const armorClass = clampNumber(entry.armorClass ?? 10, 1);
  const attacksPerTurn = clampNumber(entry.attacksPerTurn ?? 1, 1);
  const spells = Array.isArray(entry.spells)
    ? entry.spells.map((spell, spellIndex) => normalizeSpell(spell, spellIndex)).filter(Boolean)
    : [];
  const weapons = Array.isArray(entry.weapons)
    ? entry.weapons.map((weapon, weaponIndex) => normalizeWeapon(weapon, weaponIndex)).filter(Boolean)
    : [];
  const statBlock = type === "monster" ? normalizeMonsterStatBlock(entry) : null;
  const movementFeet = getMovementFeet(entry, statBlock);

  if (!name) return null;

  return {
    id: String(entry.id || createId(type, index)),
    name,
    type,
    maxHp,
    currentHp,
    armorClass,
    attacksPerTurn,
    movementFeet,
    spells,
    weapons,
    ...(statBlock ? { statBlock } : {}),
  };
};

const getStoragePath = (type) => path.join(storageDirectory, libraryFiles[type]);

const readLibraryType = async (type) => {
  await mkdir(storageDirectory, { recursive: true });

  try {
    const file = await readFile(getStoragePath(type), "utf8");
    const entries = file.trim() ? JSON.parse(file) : [];
    if (!Array.isArray(entries)) return [];
    return entries.map((entry, index) => normalizeEntry(entry, type, index)).filter(Boolean);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeLibraryType(type, []);
      return [];
    }

    throw error;
  }
};

const writeLibraryType = async (type, entries) => {
  await mkdir(storageDirectory, { recursive: true });
  const cleanEntries =
    type === "spell"
      ? entries.map((entry) => ({
          name: entry.name,
          description: entry.description,
          damageMin: entry.damageMin,
          damageMax: entry.damageMax,
          damageBonus: entry.damageBonus,
        }))
      : type === "weapon"
        ? entries.map((entry) => ({
            name: entry.name,
            description: entry.description,
            ability: entry.ability,
            damageMin: entry.damageMin,
            damageMax: entry.damageMax,
            damageBonus: entry.damageBonus,
          }))
      : entries.map((entry) => ({
          name: entry.name,
          maxHp: entry.maxHp,
          currentHp: entry.currentHp,
          armorClass: entry.armorClass,
          attacksPerTurn: entry.attacksPerTurn,
          movementFeet: getMovementFeet(entry),
          ...(type === "monster" ? { statBlock: normalizeMonsterStatBlock(entry) } : {}),
          spells: (entry.spells ?? []).map((spell) => ({
            name: spell.name,
            description: spell.description,
            damageMin: spell.damageMin,
            damageMax: spell.damageMax,
            damageBonus: spell.damageBonus,
          })),
          weapons: (entry.weapons ?? []).map((weapon) => ({
            name: weapon.name,
            description: weapon.description,
            ability: weapon.ability,
            damageMin: weapon.damageMin,
            damageMax: weapon.damageMax,
            damageBonus: weapon.damageBonus,
          })),
        }));
  await writeFile(getStoragePath(type), `${JSON.stringify(cleanEntries, null, 2)}\n`, "utf8");
};

const readLibrary = async () => ({
  character: await readLibraryType("character"),
  monster: await readLibraryType("monster"),
  spell: await readLibraryType("spell"),
  weapon: await readLibraryType("weapon"),
});

app.get("/api/health", (request, response) => {
  response.json({ ok: true });
});

app.get("/api/library", async (request, response, next) => {
  try {
    response.json(await readLibrary());
  } catch (error) {
    next(error);
  }
});

app.post("/api/library/:type", async (request, response, next) => {
  try {
    const { type } = request.params;
    if (!(type in libraryFiles)) {
      response.status(404).json({ error: "Unknown library type" });
      return;
    }

    const existing = await readLibraryType(type);
    const entry = normalizeEntry(request.body, type, existing.length);
    if (!entry) {
      response.status(400).json({ error: "A name is required" });
      return;
    }

    await writeLibraryType(type, [...existing, entry]);
    response.status(201).json(await readLibrary());
  } catch (error) {
    next(error);
  }
});

app.put("/api/library/:type/:id", async (request, response, next) => {
  try {
    const { type, id } = request.params;
    if (!(type in libraryFiles)) {
      response.status(404).json({ error: "Unknown library type" });
      return;
    }

    const existing = await readLibraryType(type);
    const entry = normalizeEntry({ ...request.body, id }, type, existing.length);
    if (!entry) {
      response.status(400).json({ error: "A name is required" });
      return;
    }

    const index = existing.findIndex((item) => item.id === id);
    if (index === -1) {
      response.status(404).json({ error: "Entry not found" });
      return;
    }

    const updatedEntries = [...existing];
    updatedEntries[index] = entry;
    await writeLibraryType(type, updatedEntries);
    response.json(await readLibrary());
  } catch (error) {
    next(error);
  }
});

app.delete("/api/library/:type/:id", async (request, response, next) => {
  try {
    const { type, id } = request.params;
    if (!(type in libraryFiles)) {
      response.status(404).json({ error: "Unknown library type" });
      return;
    }

    const existing = await readLibraryType(type);
    await writeLibraryType(
      type,
      existing.filter((entry) => entry.id !== id),
    );
    response.json(await readLibrary());
  } catch (error) {
    next(error);
  }
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: "Server error" });
});

app.listen(port, () => {
  console.log(`Combat tracker listening on port ${port}`);
});
