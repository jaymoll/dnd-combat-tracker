import express from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCreatureEntry,
  createSpellEntry,
  createWeaponEntry,
  normalizeCreature,
  normalizeSpell,
  normalizeWeapon,
} from "./src/models.js";

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
const libraryTypes = Object.keys(libraryFiles);
const appRoutes = ["/", "/battle-map", "/encounter-calculator", "/management"];

app.use(express.json());
app.use(express.static(__dirname));

const createIndexedIdFactory = (fallbackIndex) => (type, index = fallbackIndex) => `${type}-${index}`;

const normalizeLibraryEntry = (entry, type, index) => {
  const idFactory = createIndexedIdFactory(index);

  if (type === "spell") return normalizeSpell(entry, idFactory, index);
  if (type === "weapon") return normalizeWeapon(entry, idFactory, index);
  return normalizeCreature(entry, type, idFactory);
};

const createStoredEntry = (type, entry) => {
  if (type === "spell") return createSpellEntry(entry);
  if (type === "weapon") return createWeaponEntry(entry);
  return createCreatureEntry({ ...entry, type });
};

const sendUnknownLibraryType = (type, response) => {
  if (libraryTypes.includes(type)) return false;

  response.status(404).json({ error: "Unknown library type" });
  return true;
};

const getStoragePath = (type) => path.join(storageDirectory, libraryFiles[type]);

const readLibraryType = async (type) => {
  await mkdir(storageDirectory, { recursive: true });

  try {
    const file = await readFile(getStoragePath(type), "utf8");
    const entries = file.trim() ? JSON.parse(file) : [];
    if (!Array.isArray(entries)) return [];
    return entries.map((entry, index) => normalizeLibraryEntry(entry, type, index)).filter(Boolean);
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
  const cleanEntries = entries.map((entry) => createStoredEntry(type, entry));
  await writeFile(getStoragePath(type), `${JSON.stringify(cleanEntries, null, 2)}\n`, "utf8");
};

const readLibrary = async () =>
  Object.fromEntries(
    await Promise.all(libraryTypes.map(async (type) => [type, await readLibraryType(type)])),
  );

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
    if (sendUnknownLibraryType(type, response)) return;

    const existing = await readLibraryType(type);
    const entry = normalizeLibraryEntry(request.body, type, existing.length);
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
    if (sendUnknownLibraryType(type, response)) return;

    const existing = await readLibraryType(type);
    const entry = normalizeLibraryEntry({ ...request.body, id }, type, existing.length);
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
    if (sendUnknownLibraryType(type, response)) return;

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

app.get(appRoutes, (request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: "Server error" });
});

app.listen(port, () => {
  console.log(`Combat tracker listening on port ${port}`);
});
