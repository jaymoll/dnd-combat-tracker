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
};

app.use(express.json());
app.use(express.static(__dirname));

const clampNumber = (value, min, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.min(Math.max(number, min), max);
};

const createId = (type, index) => `${type}-${index}`;

const normalizeEntry = (entry, type, index) => {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? "").trim();
  const maxHp = clampNumber(entry.maxHp, 1);
  const currentHp = clampNumber(entry.currentHp ?? maxHp, 0, maxHp);
  const armorClass = clampNumber(entry.armorClass ?? 10, 1);
  const attacksPerTurn = clampNumber(entry.attacksPerTurn ?? 1, 1);
  const toHit = clampNumber(entry.toHit ?? 0, -99);
  const damageMin = clampNumber(entry.damageMin ?? 1, 0);
  const damageMax = clampNumber(entry.damageMax ?? damageMin, damageMin);
  const damageBonus = clampNumber(entry.damageBonus ?? 0, -99);

  if (!name) return null;

  return {
    id: String(entry.id || createId(type, index)),
    name,
    type,
    maxHp,
    currentHp,
    armorClass,
    attacksPerTurn,
    toHit,
    damageMin,
    damageMax,
    damageBonus,
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
  const cleanEntries = entries.map((entry) => ({
    name: entry.name,
    maxHp: entry.maxHp,
    currentHp: entry.currentHp,
    armorClass: entry.armorClass,
    attacksPerTurn: entry.attacksPerTurn,
    toHit: entry.toHit,
    damageMin: entry.damageMin,
    damageMax: entry.damageMax,
    damageBonus: entry.damageBonus,
  }));
  await writeFile(getStoragePath(type), `${JSON.stringify(cleanEntries, null, 2)}\n`, "utf8");
};

const readLibrary = async () => ({
  character: await readLibraryType("character"),
  monster: await readLibraryType("monster"),
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
